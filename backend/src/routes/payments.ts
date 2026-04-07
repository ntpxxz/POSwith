import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /:orderId/qr — generate QR for order payment
router.post('/:orderId/qr', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderId)) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Order is not in pending status' });
      return;
    }

    // Get PromptPay config
    const qrMethod = db.prepare("SELECT id FROM payment_methods WHERE code = 'QR'").get() as any;
    if (!qrMethod) {
      res.status(400).json({ error: 'QR payment method not configured' });
      return;
    }

    const configs = db.prepare('SELECT key_name, value FROM payment_configs WHERE method_id = ?').all(qrMethod.id) as { key_name: string; value: string }[];
    const configMap: Record<string, string> = {};
    configs.forEach(c => { configMap[c.key_name] = c.value; });

    const promptpayId = configMap['promptpay_id'] || '0812345678';
    const timeoutSeconds = parseInt(configMap['timeout_seconds'] || '300', 10);

    // Check if there's already a pending payment for this order
    let payment = db.prepare(
      "SELECT * FROM payments WHERE order_id = ? AND method = 'QR' AND status = 'PENDING'"
    ).get(Number(orderId)) as any;

    if (!payment) {
      const idempotencyKey = uuidv4();
      const result = db.prepare(
        "INSERT INTO payments (order_id, amount, method, idempotency_key, reference_code, status) VALUES (?, ?, 'QR', ?, ?, 'PENDING')"
      ).run(Number(orderId), order.net_amount, idempotencyKey, order.order_number);

      payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
    }

    // Generate QR payload and image
    const amount = order.net_amount;
    const payload = `promptpay://${promptpayId}/${amount.toFixed(2)}`;
    const qrImage = await QRCode.toDataURL(payload, { width: 300, margin: 2 });

    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000).toISOString();

    res.json({
      qrCode: qrImage,
      amount,
      reference: order.order_number,
      expiresAt: expiresAt,
      paymentId: payment.id,
    });
  } catch (err) {
    console.error('Generate QR error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:orderId/confirm — confirm payment for an order
router.post('/:orderId/confirm', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const payment = db.prepare("SELECT * FROM payments WHERE order_id = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1").get(Number(orderId)) as any;
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Idempotent: if already confirmed, return existing
    if (payment.status === 'SUCCESS') {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id);
      res.json({ payment, order, message: 'Payment already confirmed' });
      return;
    }

    if (payment.status !== 'PENDING') {
      res.status(400).json({ error: 'Payment is not in pending status' });
      return;
    }

    const confirmPayment = db.transaction(() => {
      // Update payment
      db.prepare(
        "UPDATE payments SET status = 'SUCCESS', confirmed_by = ?, confirmed_at = datetime('now','localtime') WHERE id = ?"
      ).run(req.user!.id, Number(payment.id));

      // Update order
      db.prepare(
        "UPDATE orders SET status = 'COMPLETED', updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(payment.order_id);

      // Audit log
      db.prepare(
        'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
      ).run('CONFIRM_PAYMENT', req.user!.id, 'payment', Number(payment.id), JSON.stringify({
        order_id: payment.order_id,
        amount: payment.amount,
        method: payment.method,
      }));
    });

    confirmPayment();

    const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id) as any;

    res.json({
      id: updatedPayment.id,
      status: updatedPayment.status,
      amount: updatedPayment.amount,
      method: updatedPayment.method
    });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:orderId/cash — cash payment (create + confirm in one step)
router.post('/:orderId/cash', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { receivedAmount } = req.body;

    if (!orderId || receivedAmount == null) {
      res.status(400).json({ error: 'orderId and receivedAmount are required' });
      return;
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderId)) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Order is not in pending status' });
      return;
    }

    if (receivedAmount < order.net_amount) {
      res.status(400).json({ error: 'Insufficient payment amount' });
      return;
    }

    const change = Math.round((receivedAmount - order.net_amount) * 100) / 100;
    const idempotencyKey = uuidv4();

    const processCash = db.transaction(() => {
      const result = db.prepare(
        "INSERT INTO payments (order_id, amount, method, idempotency_key, reference_code, status, confirmed_by, confirmed_at) VALUES (?, ?, 'CASH', ?, ?, 'SUCCESS', ?, datetime('now','localtime'))"
      ).run(Number(orderId), order.net_amount, idempotencyKey, order.order_number, req.user!.id);

      db.prepare(
        "UPDATE orders SET status = 'COMPLETED', updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(Number(orderId));

      return result.lastInsertRowid;
    });

    const paymentId = processCash();
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderId)) as any;

    res.status(201).json({
      payment: { id: paymentId, status: 'SUCCESS', amount: order.net_amount, method: 'CASH' },
      order: { id: updatedOrder.id, status: updatedOrder.status, netTotal: updatedOrder.net_amount },
      change
    });
  } catch (err) {
    console.error('Cash payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — get payment details
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(id));

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
