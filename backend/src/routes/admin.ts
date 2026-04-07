import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/schema.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize(['ADMIN']));

// ── Dashboard KPIs ─────────────────────────────────────────────────────

router.get('/dashboard', (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const todaySales = db.prepare(
      "SELECT COALESCE(SUM(net_amount), 0) as total FROM orders WHERE status = 'COMPLETED' AND DATE(created_at) = ?"
    ).get(today) as { total: number };

    const todayOrders = db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'COMPLETED' AND DATE(created_at) = ?"
    ).get(today) as { count: number };

    const avgOrderValue = todayOrders.count > 0
      ? Math.round((todaySales.total / todayOrders.count) * 100) / 100
      : 0;

    const topProducts = db.prepare(`
      SELECT oi.name_snapshot as name, SUM(oi.quantity) as total_qty, SUM(oi.total) as total_sales
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'COMPLETED' AND DATE(o.created_at) = ?
      GROUP BY oi.name_snapshot
      ORDER BY total_qty DESC
      LIMIT 5
    `).all(today);

    const paymentBreakdown = db.prepare(`
      SELECT p.method, COUNT(*) as count, SUM(p.amount) as total
      FROM payments p
      WHERE p.status = 'SUCCESS' AND DATE(p.created_at) = ?
      GROUP BY p.method
    `).all(today);

    res.json({
      todaySales: todaySales.total,
      todayOrders: todayOrders.count,
      averageOrderValue: avgOrderValue,
      topProducts: topProducts.map((p: any) => ({
        name: p.name,
        quantity: p.total_qty,
        sales: p.total_sales
      })),
      paymentBreakdown: paymentBreakdown.map((p: any) => ({
        method: p.method,
        count: p.count,
        total: p.total
      })),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Users CRUD ─────────────────────────────────────────────────────────

router.get('/users', (req: AuthRequest, res: Response) => {
  try {
    const users = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id'
    ).all().map((u: any) => ({
      ...u,
      active: u.is_active === 1,
      createdAt: u.created_at
    }));
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email, and password are required' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hash, role || 'CASHIER');

    const user = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('CREATE_USER', req.user!.id, 'user', result.lastInsertRowid, JSON.stringify({ name, email, role: role || 'CASHIER' }));

    res.status(201).json({ user });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(id));
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { name, email, password, role, is_active } = req.body;

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, Number(id));
    }

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name ?? null, email ?? null, role ?? null, is_active ?? null, Number(id));

    const user = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(Number(id));

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('UPDATE_USER', req.user!.id, 'user', Number(id), JSON.stringify({ name, email, role, is_active }));

    res.json({ user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id)) as any;
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const newStatus = existing.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, Number(id));
    res.json({ message: newStatus ? 'User activated' : 'User deactivated', active: newStatus === 1 });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Products CRUD ──────────────────────────────────────────────────────

router.get('/products', (req: AuthRequest, res: Response) => {
  try {
    const products = db.prepare(
      'SELECT * FROM products ORDER BY category, sort_order, name'
    ).all().map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      image: p.image_url,
      active: p.is_active === 1,
      sortOrder: p.sort_order,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
    res.json(products);
  } catch (err) {
    console.error('Admin list products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/products', (req: AuthRequest, res: Response) => {
  try {
    const { name, category, price, sortOrder, image } = req.body;
    const result = db.prepare(
      'INSERT INTO products (name, category, price, sort_order, image_url) VALUES (?, ?, ?, ?, ?)'
    ).run(name, category, price, sortOrder || 0, image || null);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json({
      ...product,
      active: product.is_active === 1,
      image: product.image_url
    });
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/products/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, price, sortOrder, image, active } = req.body;
    db.prepare(`
      UPDATE products SET 
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        price = COALESCE(?, price),
        sort_order = COALESCE(?, sort_order),
        image_url = COALESCE(?, image_url),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(name, category, price, sortOrder, image, active === false ? 0 : 1, id);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    res.json({
      ...product,
      active: product.is_active === 1,
      image: product.image_url
    });
  } catch (err) {
    console.error('Admin update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/products/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
    res.status(204).send();
  } catch (err) {
    console.error('Admin delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Settings ───────────────────────────────────────────────────────────

router.get('/settings', (req: AuthRequest, res: Response) => {
  try {
    const settings = db.prepare('SELECT id, key_name, value, updated_at FROM settings ORDER BY key_name').all();
    res.json({ settings });
  } catch (err) {
    console.error('List settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      res.status(400).json({ error: 'settings array is required' });
      return;
    }

    const upsert = db.prepare(`
      INSERT INTO settings (key_name, value, updated_at)
      VALUES (?, ?, datetime('now','localtime'))
      ON CONFLICT(key_name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    const updateAll = db.transaction(() => {
      for (const s of settings) {
        upsert.run(s.key_name, s.value);
      }
    });

    updateAll();

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, payload) VALUES (?, ?, ?, ?)'
    ).run('UPDATE_SETTINGS', req.user!.id, 'settings', JSON.stringify(settings));

    const updated = db.prepare('SELECT id, key_name, value, updated_at FROM settings ORDER BY key_name').all();
    res.json({ settings: updated });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Payment Methods ────────────────────────────────────────────────────

router.get('/payment-methods', (req: AuthRequest, res: Response) => {
  try {
    const methods = db.prepare('SELECT * FROM payment_methods ORDER BY id').all() as any[];

    const result = methods.map(m => {
      const configs = db.prepare('SELECT id, key_name, value, updated_at FROM payment_configs WHERE method_id = ?').all(m.id);
      return { ...m, configs };
    });

    res.json({ payment_methods: result });
  } catch (err) {
    console.error('List payment methods error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/payment-methods/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(Number(id));
    if (!existing) {
      res.status(404).json({ error: 'Payment method not found' });
      return;
    }

    const { name, is_active, configs } = req.body;

    db.prepare(`
      UPDATE payment_methods
      SET name = COALESCE(?, name), is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name ?? null, is_active ?? null, Number(id));

    if (configs && Array.isArray(configs)) {
      const upsertConfig = db.prepare(`
        INSERT INTO payment_configs (method_id, key_name, value, updated_at)
        VALUES (?, ?, ?, datetime('now','localtime'))
        ON CONFLICT DO NOTHING
      `);
      const updateConfig = db.prepare(`
        UPDATE payment_configs SET value = ?, updated_at = datetime('now','localtime')
        WHERE method_id = ? AND key_name = ?
      `);

      for (const c of configs) {
        const existingConfig = db.prepare(
          'SELECT id FROM payment_configs WHERE method_id = ? AND key_name = ?'
        ).get(Number(id), c.key_name);

        if (existingConfig) {
          updateConfig.run(c.value, Number(id), c.key_name);
        } else {
          upsertConfig.run(Number(id), c.key_name, c.value);
        }
      }
    }

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('UPDATE_PAYMENT_METHOD', req.user!.id, 'payment_method', Number(id), JSON.stringify(req.body));

    const method = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(Number(id));
    const methodConfigs = db.prepare('SELECT id, key_name, value, updated_at FROM payment_configs WHERE method_id = ?').all(Number(id));

    res.json({ payment_method: { ...(method as any), configs: methodConfigs } });
  } catch (err) {
    console.error('Update payment method error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Shifts ─────────────────────────────────────────────────────────────

router.post('/shifts/open', (req: AuthRequest, res: Response) => {
  try {
    const { opening_cash } = req.body;

    // Check if there's already an open shift
    const openShift = db.prepare("SELECT id FROM shifts WHERE status = 'OPEN'").get();
    if (openShift) {
      res.status(400).json({ error: 'There is already an open shift' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO shifts (opened_by, opening_cash) VALUES (?, ?)'
    ).run(req.user!.id, opening_cash || 0);

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(result.lastInsertRowid);

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('OPEN_SHIFT', req.user!.id, 'shift', result.lastInsertRowid, JSON.stringify({ opening_cash: opening_cash || 0 }));

    res.status(201).json({ shift });
  } catch (err) {
    console.error('Open shift error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shifts/:id/close', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { closing_cash } = req.body;

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(Number(id)) as any;
    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }

    if (shift.status !== 'OPEN') {
      res.status(400).json({ error: 'Shift is not open' });
      return;
    }

    db.prepare(
      "UPDATE shifts SET closed_by = ?, closing_cash = ?, status = 'CLOSED', closed_at = datetime('now','localtime') WHERE id = ?"
    ).run(req.user!.id, closing_cash ?? 0, Number(id));

    const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(Number(id));

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('CLOSE_SHIFT', req.user!.id, 'shift', Number(id), JSON.stringify({ closing_cash: closing_cash ?? 0 }));

    res.json({ shift: updated });
  } catch (err) {
    console.error('Close shift error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shifts', (req: AuthRequest, res: Response) => {
  try {
    const shifts = db.prepare('SELECT * FROM shifts ORDER BY id DESC').all();
    res.json({ shifts });
  } catch (err) {
    console.error('List shifts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Cash Adjustments ───────────────────────────────────────────────────

router.post('/cash-adjustments', (req: AuthRequest, res: Response) => {
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

    const shift = db.prepare("SELECT id FROM shifts WHERE id = ? AND status = 'OPEN'").get(Number(shift_id));
    if (!shift) {
      res.status(400).json({ error: 'Shift not found or not open' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO cash_adjustments (shift_id, amount, type, reason, created_by) VALUES (?, ?, ?, ?, ?)'
    ).run(Number(shift_id), amount, type, reason || null, req.user!.id);

    const adjustment = db.prepare('SELECT * FROM cash_adjustments WHERE id = ?').get(result.lastInsertRowid);

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('CASH_ADJUSTMENT', req.user!.id, 'cash_adjustment', result.lastInsertRowid, JSON.stringify({ shift_id, amount, type, reason }));

    res.status(201).json({ cash_adjustment: adjustment });
  } catch (err) {
    console.error('Cash adjustment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/cash-adjustments', (req: AuthRequest, res: Response) => {
  try {
    const { shift_id } = req.query;

    let sql = 'SELECT * FROM cash_adjustments';
    const params: any[] = [];

    if (shift_id) {
      sql += ' WHERE shift_id = ?';
      params.push(Number(shift_id));
    }

    sql += ' ORDER BY id DESC';

    const adjustments = db.prepare(sql).all(...params);
    res.json({ cash_adjustments: adjustments });
  } catch (err) {
    console.error('List cash adjustments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Audit Logs ─────────────────────────────────────────────────────────

router.get('/audit-logs', (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', action, entity } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let sql = 'SELECT al.*, u.name as user_name FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (action) {
      sql += ' AND al.action = ?';
      countSql += ' AND action = ?';
      params.push(action);
      countParams.push(action);
    }

    if (entity) {
      sql += ' AND al.entity = ?';
      countSql += ' AND entity = ?';
      params.push(entity);
      countParams.push(entity);
    }

    const totalRow = db.prepare(countSql).get(...countParams) as { total: number };

    sql += ' ORDER BY al.id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const logs = db.prepare(sql).all(...params);

    res.json({
      audit_logs: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalRow.total,
        total_pages: Math.ceil(totalRow.total / limitNum),
      },
    });
  } catch (err) {
    console.error('List audit logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Reports ────────────────────────────────────────────────────────────

router.get('/reports/sales', (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT DATE(created_at) as date,
             COUNT(*) as total_orders,
             SUM(net_amount) as total_sales,
             AVG(net_amount) as avg_order_value
      FROM orders
      WHERE status = 'COMPLETED'
    `;
    const params: any[] = [];

    if (start_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY DATE(created_at) ORDER BY date DESC';

    const report = db.prepare(sql).all(...params);

    // Summary
    const summary = db.prepare(`
      SELECT COUNT(*) as total_orders,
             COALESCE(SUM(net_amount), 0) as total_sales,
             COALESCE(AVG(net_amount), 0) as avg_order_value
      FROM orders
      WHERE status = 'COMPLETED'
      ${start_date ? " AND DATE(created_at) >= '" + start_date + "'" : ''}
      ${end_date ? " AND DATE(created_at) <= '" + end_date + "'" : ''}
    `).get() as any;

    res.json({ daily: report, summary });
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports/products', (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT oi.name_snapshot as product_name,
             p.category,
             SUM(oi.quantity) as total_quantity,
             SUM(oi.total) as total_sales,
             COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.status = 'COMPLETED'
    `;
    const params: any[] = [];

    if (start_date) {
      sql += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY oi.name_snapshot, p.category ORDER BY total_quantity DESC';

    const report = db.prepare(sql).all(...params);
    res.json({ products: report });
  } catch (err) {
    console.error('Products report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports/payments', (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT p.method,
             COUNT(*) as count,
             SUM(p.amount) as total_amount
      FROM payments p
      WHERE p.status = 'SUCCESS'
    `;
    const params: any[] = [];

    if (start_date) {
      sql += ' AND DATE(p.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(p.created_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY p.method ORDER BY total_amount DESC';

    const report = db.prepare(sql).all(...params);

    const totalRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE status = 'SUCCESS'
      ${start_date ? " AND DATE(created_at) >= '" + start_date + "'" : ''}
      ${end_date ? " AND DATE(created_at) <= '" + end_date + "'" : ''}
    `).get() as any;

    res.json({ breakdown: report, total_payments: totalRow.count, total_amount: totalRow.total });
  } catch (err) {
    console.error('Payments report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
