import { Router, Response } from 'express';
import prisma from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

function generateOrderNumber(prefix: string, last: { orderNumber: string } | null): string {
  let seq = 1;
  if (last) {
    const parts = last.orderNumber.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// POST / — create order
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { items, discountType, discountValue } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required and must not be empty' });
      return;
    }

    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const prefix = `ORD-${dateStr}-`;

    const lastOrder = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { orderNumber: true },
    });
    const orderNumber = generateOrderNumber(prefix, lastOrder);

    // Fetch all products upfront
    const productIds = items.map((i: any) => Number(i.productId || i.product_id));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of items) {
      const productId = Number(item.productId || item.product_id);
      if (!productMap.has(productId)) {
        res.status(400).json({ error: `Product with id ${productId} not found or inactive` });
        return;
      }
    }

    let totalAmount = 0;
    const orderItemsData = items.map((item: any) => {
      const productId = Number(item.productId || item.product_id);
      const product = productMap.get(productId)!;
      const quantity = item.quantity || 1;
      const price = Number(product.price);
      const itemTotal = price * quantity;
      totalAmount += itemTotal;
      return {
        productId: product.id,
        nameSnapshot: product.name,
        priceSnapshot: price,
        quantity,
        total: itemTotal,
      };
    });

    let discountAmount = 0;
    if (discountType && discountValue != null && discountValue > 0) {
      if (discountType === 'PERCENT') {
        discountAmount = Math.round(totalAmount * (discountValue / 100) * 100) / 100;
      } else {
        discountAmount = discountValue;
      }
    }
    const netAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          createdById: req.user!.id,
          totalAmount,
          discountAmount,
          netAmount,
          items: { create: orderItemsData },
          ...(discountType && discountValue > 0 ? {
            discounts: {
              create: { type: discountType, value: discountValue, createdById: req.user!.id },
            },
          } : {}),
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_ORDER', userId: req.user!.id, entity: 'order', entityId: newOrder.id,
          payload: { order_number: orderNumber, total_amount: totalAmount, discount_amount: discountAmount, net_amount: netAmount, items_count: items.length },
        },
      });

      return newOrder;
    });

    res.status(201).json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      netTotal: Number(order.netAmount),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(item => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.nameSnapshot,
        unitPrice: Number(item.priceSnapshot),
        quantity: item.quantity,
        totalPrice: Number(item.total),
      })),
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — list orders
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, date, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    const where: any = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(date as string);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: d, lt: next };
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    res.json({
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        discountAmount: Number(o.discountAmount),
        netTotal: Number(o.netAmount),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      pagination: { page: pageNum, limit: limitNum, total, total_pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — order detail
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true, discounts: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      netTotal: Number(order.netAmount),
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.nameSnapshot,
        unitPrice: Number(item.priceSnapshot),
        quantity: item.quantity,
        totalPrice: Number(item.total),
      })),
      payments: order.payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        createdAt: p.createdAt,
      })),
      discounts: order.discounts,
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/cancel
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Only pending orders can be cancelled' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelReason: reason ? String(reason).trim() : null },
      });
      await tx.auditLog.create({
        data: {
          action: 'CANCEL_ORDER',
          userId: req.user!.id,
          entity: 'order',
          entityId: id,
          payload: { order_number: order.orderNumber, reason: reason || null },
        },
      });
      return o;
    });

    res.json({ order: updated });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/discount — apply discount
router.post('/:id/discount', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { type, value } = req.body;

    if (!type || value == null) {
      res.status(400).json({ error: 'type and value are required' });
      return;
    }
    if (!['PERCENT', 'FIXED'].includes(type)) {
      res.status(400).json({ error: 'type must be PERCENT or FIXED' });
      return;
    }
    if (value <= 0) {
      res.status(400).json({ error: 'value must be positive' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Can only discount pending orders' });
      return;
    }

    const totalAmount = Number(order.totalAmount);
    let discountAmount: number;

    if (type === 'PERCENT') {
      if (value > 100) {
        res.status(400).json({ error: 'Percent discount cannot exceed 100' });
        return;
      }
      discountAmount = Math.round(totalAmount * (value / 100) * 100) / 100;
    } else {
      discountAmount = value;
    }

    const netAmount = Math.round((totalAmount - discountAmount) * 100) / 100;
    if (netAmount < 0) {
      res.status(400).json({ error: 'Discount cannot exceed order total' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.discount.create({
        data: { orderId: id, type, value, createdById: req.user!.id },
      });
      const o = await tx.order.update({
        where: { id },
        data: { discountAmount, netAmount },
      });
      await tx.auditLog.create({
        data: { action: 'APPLY_DISCOUNT', userId: req.user!.id, entity: 'order', entityId: id, payload: { type, value, discount_amount: discountAmount, net_amount: netAmount } },
      });
      return o;
    });

    res.json({ order: updated });
  } catch (err) {
    console.error('Apply discount error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/receipt
router.get('/:id/receipt', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true, createdBy: { select: { name: true } } },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const settings = await prisma.setting.findMany({
      where: { keyName: { in: ['SHOP_NAME', 'RECEIPT_FOOTER', 'TAX_PERCENT'] } },
    });
    const shopInfo = Object.fromEntries(settings.map(s => [s.keyName, s.value]));

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      netTotal: Number(order.netAmount),
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.nameSnapshot,
        unitPrice: Number(item.priceSnapshot),
        quantity: item.quantity,
        totalPrice: Number(item.total),
      })),
      payments: order.payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        createdAt: p.createdAt,
      })),
      cashierName: order.createdBy?.name ?? null,
      shopName: shopInfo['SHOP_NAME'] ?? 'Sandwich & Coffee',
      receiptFooter: shopInfo['RECEIPT_FOOTER'] ?? 'Thank you for your business!',
      taxPercent: Number(shopInfo['TAX_PERCENT'] ?? 0),
    });
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
