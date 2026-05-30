import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import prisma from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /:orderId/qr — generate QR for order payment
router.post('/:orderId/qr', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Order is not in pending status' });
      return;
    }

    // Get PromptPay config
    const qrMethod = await prisma.paymentMethod.findUnique({ where: { code: 'QR' } });
    if (!qrMethod) {
      res.status(400).json({ error: 'QR payment method not configured' });
      return;
    }

    const configs = await prisma.paymentConfig.findMany({ where: { methodId: qrMethod.id } });
    const configMap = Object.fromEntries(configs.map(c => [c.keyName, c.value ?? '']));

    const promptpayId = configMap['promptpay_id'] || '0812345678';
    const timeoutSeconds = parseInt(configMap['timeout_seconds'] || '300', 10);

    // Reuse existing PENDING QR payment or create new one
    let payment = await prisma.payment.findFirst({
      where: { orderId, method: 'QR', status: 'PENDING' },
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          orderId,
          amount: order.netAmount,
          method: 'QR',
          idempotencyKey: uuidv4(),
          referenceCode: order.orderNumber,
          status: 'PENDING',
          qrExpiresAt: new Date(Date.now() + timeoutSeconds * 1000),
        },
      });
    }

    const amount = Number(order.netAmount);
    const payload = generatePayload(promptpayId, { amount });
    const qrImage = await QRCode.toDataURL(payload, { width: 300, margin: 2, scale: 10, color: { dark: '#000000', light: '#ffffff' } });

    res.json({
      qrCode: qrImage,
      amount,
      reference: order.orderNumber,
      expiresAt: payment.qrExpiresAt?.toISOString(),
      paymentId: payment.id,
    });
  } catch (err) {
    console.error('Generate QR error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:orderId/confirm — confirm payment
router.post('/:orderId/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);

    const payment = await prisma.payment.findFirst({
      where: { orderId, status: 'PENDING' },
      orderBy: { id: 'desc' },
    });

    if (!payment) {
      // Check if already confirmed (idempotent)
      const success = await prisma.payment.findFirst({ where: { orderId, status: 'SUCCESS' } });
      if (success) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        res.json({ payment: success, order, message: 'Payment already confirmed' });
        return;
      }
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', confirmedById: req.user!.id, confirmedAt: new Date() },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });
      await tx.auditLog.create({
        data: {
          action: 'CONFIRM_PAYMENT', userId: req.user!.id, entity: 'payment', entityId: payment.id,
          payload: { order_id: orderId, amount: Number(payment.amount), method: payment.method },
        },
      });
      return updatedPayment;
    });

    res.json({ id: result.id, status: result.status, amount: Number(result.amount), method: result.method });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:orderId/cash — cash payment (create + confirm in one step)
router.post('/:orderId/cash', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const { receivedAmount } = req.body;

    if (receivedAmount == null) {
      res.status(400).json({ error: 'receivedAmount is required' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Order is not in pending status' });
      return;
    }

    const netAmount = Number(order.netAmount);
    if (receivedAmount < netAmount) {
      res.status(400).json({ error: 'Insufficient payment amount' });
      return;
    }

    const change = Math.round((receivedAmount - netAmount) * 100) / 100;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: netAmount,
          method: 'CASH',
          idempotencyKey: uuidv4(),
          referenceCode: order.orderNumber,
          status: 'SUCCESS',
          confirmedById: req.user!.id,
          confirmedAt: new Date(),
        },
      });
      const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });
      return { payment, order: updatedOrder };
    });

    res.status(201).json({
      payment: { id: result.payment.id, status: result.payment.status, amount: Number(result.payment.amount), method: result.payment.method },
      order: { id: result.order.id, status: result.order.status, netTotal: Number(result.order.netAmount) },
      change,
    });
  } catch (err) {
    console.error('Cash payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — get payment details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const payment = await prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json({ payment });
  } catch (err) {
    console.error('Get payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
