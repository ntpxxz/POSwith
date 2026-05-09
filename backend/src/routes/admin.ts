import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'products'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();
router.use(authenticate, authorize(['ADMIN']));

// ── Dashboard KPIs ─────────────────────────────────────────────────────

router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [salesAgg, todayOrderCount, topProducts, paymentBreakdown] = await Promise.all([
      prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: todayStart, lt: todayEnd } },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.order.count({
        where: { status: 'COMPLETED', createdAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.orderItem.groupBy({
        by: ['nameSnapshot'],
        where: { order: { status: 'COMPLETED', createdAt: { gte: todayStart, lt: todayEnd } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: { status: 'SUCCESS', createdAt: { gte: todayStart, lt: todayEnd } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const todaySales = Number(salesAgg._sum.netAmount ?? 0);
    const avgOrderValue = todayOrderCount > 0 ? Math.round((todaySales / todayOrderCount) * 100) / 100 : 0;

    res.json({
      todaySales,
      todayOrders: todayOrderCount,
      averageOrderValue: avgOrderValue,
      topProducts: topProducts.map(p => ({
        name: p.nameSnapshot,
        quantity: p._sum.quantity ?? 0,
        sales: Number(p._sum.total ?? 0),
      })),
      paymentBreakdown: paymentBreakdown.map(p => ({
        method: p.method,
        count: p._count,
        total: Number(p._sum.amount ?? 0),
      })),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Users CRUD ─────────────────────────────────────────────────────────

router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { id: 'asc' },
    });
    res.json(users.map(u => ({ ...u, active: u.isActive, createdAt: u.createdAt })));
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email, and password are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash: bcrypt.hashSync(password, 10), role: role || 'CASHIER' },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: { action: 'CREATE_USER', userId: req.user!.id, entity: 'user', entityId: user.id, payload: { name, email, role: role || 'CASHIER' } },
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { name, email, password, role, is_active } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(email != null && { email }),
        ...(role != null && { role }),
        ...(is_active != null && { isActive: Boolean(is_active) }),
        ...(password && { passwordHash: bcrypt.hashSync(password, 10) }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: { action: 'UPDATE_USER', userId: req.user!.id, entity: 'user', entityId: id, payload: { name, email, role, is_active } },
    });

    res.json({ user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const newStatus = !existing.isActive;
    await prisma.user.update({ where: { id }, data: { isActive: newStatus } });
    res.json({ message: newStatus ? 'User activated' : 'User deactivated', active: newStatus });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Products CRUD ──────────────────────────────────────────────────────

router.get('/products', async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json(products.map(p => ({
      id: p.id, name: p.name, category: p.category, price: Number(p.price),
      image: p.imageUrl, active: p.isActive, sortOrder: p.sortOrder,
      createdAt: p.createdAt, updatedAt: p.updatedAt,
    })));
  } catch (err) {
    console.error('Admin list products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/products', async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, price, sortOrder, image } = req.body;
    const product = await prisma.product.create({
      data: { name, category, price, sortOrder: sortOrder || 0, imageUrl: image || null },
    });
    res.status(201).json({ ...product, active: product.isActive, image: product.imageUrl });
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, category, price, sortOrder, image, active } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(category != null && { category }),
        ...(price != null && { price }),
        ...(sortOrder != null && { sortOrder }),
        ...(image !== undefined && { imageUrl: image }),
        ...(active !== undefined && { isActive: active !== false }),
      },
    });
    res.json({ ...product, active: product.isActive, image: product.imageUrl });
  } catch (err) {
    console.error('Admin update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/products/upload-image', upload.single('image'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file uploaded' });
    return;
  }
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ url });
});

router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) {
    console.error('Admin delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Settings ───────────────────────────────────────────────────────────

router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    const raw = await prisma.setting.findMany({ orderBy: { keyName: 'asc' } });
    const settings = raw.map(s => ({ id: s.id, key_name: s.keyName, value: s.value, updatedAt: s.updatedAt }));
    res.json({ settings });
  } catch (err) {
    console.error('List settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || !Array.isArray(settings)) {
      res.status(400).json({ error: 'settings array is required' });
      return;
    }

    await prisma.$transaction(
      settings.map((s: { key_name: string; value: string }) =>
        prisma.setting.upsert({
          where: { keyName: s.key_name },
          update: { value: s.value },
          create: { keyName: s.key_name, value: s.value },
        })
      )
    );

    await prisma.auditLog.create({
      data: { action: 'UPDATE_SETTINGS', userId: req.user!.id, entity: 'settings', payload: settings },
    });

    const rawUpdated = await prisma.setting.findMany({ orderBy: { keyName: 'asc' } });
    const updated = rawUpdated.map(s => ({ id: s.id, key_name: s.keyName, value: s.value, updatedAt: s.updatedAt }));
    res.json({ settings: updated });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Payment Methods ────────────────────────────────────────────────────

function normalizePM(m: any) {
  return {
    id: m.id,
    code: m.code,
    name: m.name,
    is_active: m.isActive,
    is_default: m.isDefault,
    configs: (m.configs || []).map((c: any) => ({
      id: c.id,
      method_id: c.methodId,
      key_name: c.keyName,
      value: c.value,
      updatedAt: c.updatedAt,
    })),
  };
}

router.get('/payment-methods', async (_req: AuthRequest, res: Response) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      include: { configs: true },
      orderBy: { id: 'asc' },
    });
    res.json({ payment_methods: methods.map(normalizePM) });
  } catch (err) {
    console.error('List payment methods error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/payment-methods/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Payment method not found' });
      return;
    }

    const { name, is_active, configs } = req.body;

    await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(is_active != null && { isActive: Boolean(is_active) }),
      },
    });

    if (configs && Array.isArray(configs)) {
      for (const c of configs as { key_name: string; value: string }[]) {
        const existingConfig = await prisma.paymentConfig.findFirst({
          where: { methodId: id, keyName: c.key_name },
        });
        if (existingConfig) {
          await prisma.paymentConfig.update({ where: { id: existingConfig.id }, data: { value: c.value } });
        } else {
          await prisma.paymentConfig.create({ data: { methodId: id, keyName: c.key_name, value: c.value } });
        }
      }
    }

    await prisma.auditLog.create({
      data: { action: 'UPDATE_PAYMENT_METHOD', userId: req.user!.id, entity: 'payment_method', entityId: id, payload: req.body },
    });

    const method = await prisma.paymentMethod.findUnique({ where: { id }, include: { configs: true } });
    res.json({ payment_method: normalizePM(method) });
  } catch (err) {
    console.error('Update payment method error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Shifts ─────────────────────────────────────────────────────────────

router.post('/shifts/open', async (req: AuthRequest, res: Response) => {
  try {
    const { opening_cash } = req.body;

    const openShift = await prisma.shift.findFirst({ where: { status: 'OPEN' } });
    if (openShift) {
      res.status(400).json({ error: 'There is already an open shift' });
      return;
    }

    const shift = await prisma.shift.create({
      data: { openedById: req.user!.id, openingCash: opening_cash || 0 },
    });

    await prisma.auditLog.create({
      data: { action: 'OPEN_SHIFT', userId: req.user!.id, entity: 'shift', entityId: shift.id, payload: { opening_cash: opening_cash || 0 } },
    });

    res.status(201).json({ shift });
  } catch (err) {
    console.error('Open shift error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shifts/:id/close', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { closing_cash } = req.body;

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }
    if (shift.status !== 'OPEN') {
      res.status(400).json({ error: 'Shift is not open' });
      return;
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: { closedById: req.user!.id, closingCash: closing_cash ?? 0, status: 'CLOSED', closedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { action: 'CLOSE_SHIFT', userId: req.user!.id, entity: 'shift', entityId: id, payload: { closing_cash: closing_cash ?? 0 } },
    });

    res.json({ shift: updated });
  } catch (err) {
    console.error('Close shift error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shifts', async (_req: AuthRequest, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({ orderBy: { id: 'desc' } });
    res.json({ shifts });
  } catch (err) {
    console.error('List shifts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Cash Adjustments ───────────────────────────────────────────────────

router.post('/cash-adjustments', async (req: AuthRequest, res: Response) => {
  try {
    const { shift_id, amount, type, reason } = req.body;

    if (!shift_id || amount == null || !type) {
      res.status(400).json({ error: 'shift_id, amount, and type are required' });
      return;
    }
    if (!['IN', 'OUT'].includes(type)) {
      res.status(400).json({ error: 'type must be IN or OUT' });
      return;
    }

    const shift = await prisma.shift.findFirst({ where: { id: Number(shift_id), status: 'OPEN' } });
    if (!shift) {
      res.status(400).json({ error: 'Shift not found or not open' });
      return;
    }

    const adjustment = await prisma.cashAdjustment.create({
      data: { shiftId: Number(shift_id), amount, type, reason: reason || null, createdById: req.user!.id },
    });

    await prisma.auditLog.create({
      data: { action: 'CASH_ADJUSTMENT', userId: req.user!.id, entity: 'cash_adjustment', entityId: adjustment.id, payload: { shift_id, amount, type, reason } },
    });

    res.status(201).json({ cash_adjustment: adjustment });
  } catch (err) {
    console.error('Cash adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/cash-adjustments', async (req: AuthRequest, res: Response) => {
  try {
    const { shift_id } = req.query;
    const adjustments = await prisma.cashAdjustment.findMany({
      where: shift_id ? { shiftId: Number(shift_id) } : {},
      orderBy: { id: 'desc' },
    });
    res.json({ cash_adjustments: adjustments });
  } catch (err) {
    console.error('List cash adjustments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Audit Logs ─────────────────────────────────────────────────────────

router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', action, entity } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action: action as string } : {}),
      ...(entity ? { entity: entity as string } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { id: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    res.json({
      audit_logs: logs.map(l => ({ ...l, user_name: l.user?.name ?? null })),
      pagination: { page: pageNum, limit: limitNum, total, total_pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('List audit logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Orders (admin search for refund workflow) ──────────────────────────

router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));

    const where: Prisma.OrderWhereInput = {
      ...(status && ['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status as string)
        ? { status: status as any }
        : {}),
      ...(search ? { orderNumber: { contains: (search as string).toUpperCase() } } : {}),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { items: true, payments: true, refunds: true },
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
        items: o.items.map(i => ({
          id: i.id,
          productName: i.nameSnapshot,
          unitPrice: Number(i.priceSnapshot),
          quantity: i.quantity,
          totalPrice: Number(i.total),
        })),
        payments: o.payments.map(p => ({
          id: p.id,
          method: p.method,
          amount: Number(p.amount),
          status: p.status,
        })),
        refunds: o.refunds.map(r => ({
          id: r.id,
          amount: Number(r.amount),
          reason: r.reason,
          createdAt: r.createdAt,
        })),
      })),
      pagination: { page: pageNum, limit: limitNum, total, total_pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('Admin list orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Refunds ────────────────────────────────────────────────────────────

router.post('/refunds', async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId || amount == null || !String(reason ?? '').trim()) {
      res.status(400).json({ error: 'orderId, amount, and reason are required' });
      return;
    }
    if (Number(amount) <= 0) {
      res.status(400).json({ error: 'amount must be positive' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { refunds: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Only completed orders can be refunded' });
      return;
    }

    const alreadyRefunded = order.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const remaining = Math.round((Number(order.netAmount) - alreadyRefunded) * 100) / 100;
    if (Number(amount) > remaining + 0.001) {
      res.status(400).json({ error: `Refund amount exceeds remaining refundable amount (฿${remaining.toFixed(2)})` });
      return;
    }

    const isFullRefund = Math.abs(Number(amount) - remaining) < 0.01;

    const refund = await prisma.$transaction(async (tx) => {
      const r = await tx.refund.create({
        data: { orderId: Number(orderId), amount: Number(amount), reason: String(reason).trim(), createdById: req.user!.id },
      });
      if (isFullRefund) {
        await tx.order.update({ where: { id: Number(orderId) }, data: { status: 'REFUNDED' } });
      }
      await tx.auditLog.create({
        data: {
          action: 'CREATE_REFUND',
          userId: req.user!.id,
          entity: 'refund',
          entityId: r.id,
          payload: { order_id: orderId, amount: Number(amount), reason: String(reason).trim(), is_full_refund: isFullRefund },
        },
      });
      return r;
    });

    res.status(201).json({
      refund: {
        id: refund.id,
        orderId: refund.orderId,
        amount: Number(refund.amount),
        reason: refund.reason,
        createdAt: refund.createdAt,
      },
    });
  } catch (err) {
    console.error('Create refund error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Reports ────────────────────────────────────────────────────────────

router.get('/reports/sales', async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    const where: Prisma.OrderWhereInput = {
      status: 'COMPLETED',
      ...(start_date || end_date ? {
        createdAt: {
          ...(start_date ? { gte: new Date(start_date as string) } : {}),
          ...(end_date ? { lte: new Date(`${end_date}T23:59:59.999Z`) } : {}),
        },
      } : {}),
    };

    const [summary, orders] = await Promise.all([
      prisma.order.aggregate({ where, _count: true, _sum: { netAmount: true }, _avg: { netAmount: true } }),
      prisma.$queryRaw<{ date: string; total_orders: bigint; total_sales: number; avg_order_value: number }[]>`
        SELECT DATE("created_at") as date,
               COUNT(*) as total_orders,
               SUM("net_amount") as total_sales,
               AVG("net_amount") as avg_order_value
        FROM orders
        WHERE status = 'COMPLETED'
        ${start_date ? Prisma.sql`AND DATE("created_at") >= ${start_date}` : Prisma.empty}
        ${end_date ? Prisma.sql`AND DATE("created_at") <= ${end_date}` : Prisma.empty}
        GROUP BY DATE("created_at")
        ORDER BY date DESC
      `,
    ]);

    res.json({
      daily: orders.map(r => ({ ...r, total_orders: Number(r.total_orders) })),
      summary: {
        total_orders: summary._count,
        total_sales: Number(summary._sum.netAmount ?? 0),
        avg_order_value: Number(summary._avg.netAmount ?? 0),
      },
    });
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports/products', async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    const dateWhere = start_date || end_date ? {
      createdAt: {
        ...(start_date ? { gte: new Date(start_date as string) } : {}),
        ...(end_date ? { lte: new Date(`${end_date}T23:59:59.999Z`) } : {}),
      },
    } : {};

    const report = await prisma.orderItem.groupBy({
      by: ['nameSnapshot', 'productId'],
      where: { order: { status: 'COMPLETED', ...dateWhere } },
      _sum: { quantity: true, total: true },
      _count: { orderId: true },
      orderBy: { _sum: { quantity: 'desc' } },
    });

    // Fetch categories for the productIds we have
    const productIds = report.map(r => r.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true },
    });
    const categoryMap = new Map(products.map(p => [p.id, p.category]));

    res.json({
      products: report.map(r => ({
        product_name: r.nameSnapshot,
        category: categoryMap.get(r.productId) ?? 'Unknown',
        total_quantity: r._sum.quantity ?? 0,
        total_sales: Number(r._sum.total ?? 0),
        order_count: r._count.orderId,
      })),
    });
  } catch (err) {
    console.error('Products report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/reports/payments', async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    const where: Prisma.PaymentWhereInput = {
      status: 'SUCCESS',
      ...(start_date || end_date ? {
        createdAt: {
          ...(start_date ? { gte: new Date(start_date as string) } : {}),
          ...(end_date ? { lte: new Date(`${end_date}T23:59:59.999Z`) } : {}),
        },
      } : {}),
    };

    const [breakdown, summary] = await Promise.all([
      prisma.payment.groupBy({
        by: ['method'],
        where,
        _count: true,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      prisma.payment.aggregate({ where, _count: true, _sum: { amount: true } }),
    ]);

    res.json({
      breakdown: breakdown.map(p => ({ method: p.method, count: p._count, total_amount: Number(p._sum.amount ?? 0) })),
      total_payments: summary._count,
      total_amount: Number(summary._sum.amount ?? 0),
    });
  } catch (err) {
    console.error('Payments report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Staff Performance Report ─────────────────────────────────────────────

router.get('/reports/staff', async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const dateWhere: any = start_date || end_date ? {
      createdAt: {
        ...(start_date ? { gte: new Date(start_date as string) } : {}),
        ...(end_date ? { lte: new Date(`${end_date}T23:59:59.999Z`) } : {}),
      },
    } : {};

    // Get all cashiers
    const cashiers = await prisma.user.findMany({
      where: { role: 'CASHIER', isActive: true },
      select: { id: true, name: true },
    });

    const staffData = await Promise.all(
      cashiers.map(async (cashier) => {
        const orderWhere = { status: 'COMPLETED' as const, createdById: cashier.id, ...dateWhere };

        const [orderAgg, paymentBreakdown, discountAgg, refundAgg] = await Promise.all([
          prisma.order.aggregate({
            where: orderWhere,
            _count: true,
            _sum: { netAmount: true },
            _avg: { netAmount: true },
          }),
          prisma.payment.groupBy({
            by: ['method'],
            where: { status: 'SUCCESS', order: { createdById: cashier.id, ...dateWhere } },
            _count: true,
          }),
          prisma.discount.aggregate({
            where: { order: orderWhere },
            _sum: { value: true },
          }),
          prisma.refund.aggregate({
            where: { order: { createdById: cashier.id, ...dateWhere } },
            _count: true,
            _sum: { amount: true },
          }),
        ]);

        const cashOrders = paymentBreakdown.find(p => p.method === 'CASH')?._count ?? 0;
        const qrOrders = paymentBreakdown.find(p => p.method === 'QR')?._count ?? 0;

        return {
          userId: cashier.id,
          userName: cashier.name,
          totalOrders: orderAgg._count,
          totalSales: Number(orderAgg._sum.netAmount ?? 0),
          avgOrderValue: Number(orderAgg._avg.netAmount ?? 0),
          cashOrders,
          qrOrders,
          discountGiven: Number(discountAgg._sum.value ?? 0),
          refundCount: refundAgg._count,
          refundAmount: Number(refundAgg._sum.amount ?? 0),
        };
      })
    );

    res.json({ staff: staffData.sort((a, b) => b.totalSales - a.totalSales) });
  } catch (err) {
    console.error('Staff report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Shift Cash-Control Report ───────────────────────────────────────────

router.get('/shifts/:id/report', async (req: AuthRequest, res: Response) => {
  try {
    const shiftId = Number(req.params.id);

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
        cashAdjustments: { orderBy: { id: 'asc' } },
      },
    });

    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }

    const shiftStart = shift.openedAt;
    const shiftEnd = shift.closedAt ?? new Date();

    // Sales during this shift window
    const [paymentBreakdown, orderAgg, refundAgg] = await Promise.all([
      prisma.payment.groupBy({
        by: ['method'],
        where: { status: 'SUCCESS', createdAt: { gte: shiftStart, lte: shiftEnd } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: shiftStart, lte: shiftEnd } },
        _count: true,
        _sum: { netAmount: true },
      }),
      prisma.refund.aggregate({
        where: { createdAt: { gte: shiftStart, lte: shiftEnd } },
        _sum: { amount: true },
      }),
    ]);

    const cashSales = Number(paymentBreakdown.find(p => p.method === 'CASH')?._sum.amount ?? 0);
    const qrSales = Number(paymentBreakdown.find(p => p.method === 'QR')?._sum.amount ?? 0);
    const totalSales = Number(orderAgg._sum.netAmount ?? 0);

    const cashIn = shift.cashAdjustments
      .filter(a => a.type === 'IN')
      .reduce((s, a) => s + Number(a.amount), 0);
    const cashOut = shift.cashAdjustments
      .filter(a => a.type === 'OUT')
      .reduce((s, a) => s + Number(a.amount), 0);

    const expectedCash = Number(shift.openingCash) + cashSales + cashIn - cashOut;
    const closingCash = shift.closingCash != null ? Number(shift.closingCash) : null;
    const difference = closingCash != null ? closingCash - expectedCash : null;

    res.json({
      report: {
        shiftId: shift.id,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        status: shift.status,
        openedBy: shift.openedBy.name,
        closedBy: shift.closedBy?.name ?? null,
        openingCash: Number(shift.openingCash),
        closingCash,
        cashSales,
        qrSales,
        totalSales,
        totalOrders: orderAgg._count,
        cashIn,
        cashOut,
        expectedCash,
        difference,
        adjustments: shift.cashAdjustments.map(a => ({
          id: a.id,
          type: a.type,
          amount: Number(a.amount),
          reason: a.reason,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (err) {
    console.error('Shift report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

