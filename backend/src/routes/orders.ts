import { Router, Response } from 'express';
import db from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper: generate order number ORD-YYYYMMDD-XXX
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  const prefix = `ORD-${dateStr}-`;
  const last = db.prepare(
    "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}%`) as { order_number: string } | undefined;

  let seq = 1;
  if (last) {
    const parts = last.order_number.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// POST / — create order
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { items, discountType, discountValue } = req.body;
    console.log('Backend creating order:', { items, discountType, discountValue });

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required and must not be empty' });
      return;
    }

    const orderNumber = generateOrderNumber();

    const createOrder = db.transaction(() => {
      // Insert order shell
      const orderResult = db.prepare(
        'INSERT INTO orders (order_number, created_by) VALUES (?, ?)'
      ).run(orderNumber, req.user!.id);
      const orderId = orderResult.lastInsertRowid as number;

      let totalAmount = 0;

      const insertItem = db.prepare(
        'INSERT INTO order_items (order_id, product_id, name_snapshot, price_snapshot, quantity, total) VALUES (?, ?, ?, ?, ?, ?)'
      );

      for (const item of items) {
        const productId = item.productId || item.product_id;
        const product = db.prepare(
          'SELECT id, name, price FROM products WHERE id = ? AND is_active = 1'
        ).get(productId) as { id: number; name: string; price: number } | undefined;

        if (!product) {
          throw new Error(`Product with id ${productId} not found or inactive`);
        }

        const quantity = item.quantity || 1;
        const itemTotal = product.price * quantity;
        totalAmount += itemTotal;

        insertItem.run(orderId, product.id, product.name, product.price, quantity, itemTotal);
      }

      // Handle Discount
      let discountAmount = 0;
      if (discountType && discountValue != null && discountValue > 0) {
        if (discountType === 'PERCENT') {
          discountAmount = Math.round(totalAmount * (discountValue / 100) * 100) / 100;
        } else {
          discountAmount = discountValue;
        }

        db.prepare(
          'INSERT INTO discounts (order_id, type, value, created_by) VALUES (?, ?, ?, ?)'
        ).run(orderId, discountType, discountValue, req.user!.id);
      }

      const netAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

      // Update order totals
      db.prepare(
        'UPDATE orders SET total_amount = ?, discount_amount = ?, net_amount = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?'
      ).run(totalAmount, discountAmount, netAmount, orderId);

      // Audit log
      db.prepare(
        'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
      ).run('CREATE_ORDER', req.user!.id, 'order', orderId, JSON.stringify({
        order_number: orderNumber,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        net_amount: netAmount,
        items_count: items.length
      }));

      return orderId;
    });

    const orderId = createOrder();

    const orderData = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    const formattedOrder = {
      id: orderData.id,
      orderNumber: orderData.order_number,
      status: orderData.status,
      totalAmount: orderData.total_amount,
      discountAmount: orderData.discount_amount,
      netTotal: orderData.net_amount,
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at,
      items: orderItems.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        productName: item.name_snapshot,
        unitPrice: item.price_snapshot,
        quantity: item.quantity,
        totalPrice: item.total
      }))
    };

    res.status(201).json(formattedOrder);
  } catch (err: any) {
    console.error('Create order error:', err);
    if (err.message?.startsWith('Product with id')) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — list orders
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { status, date, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (date) {
      sql += ' AND DATE(created_at) = ?';
      countSql += ' AND DATE(created_at) = ?';
      params.push(date);
      countParams.push(date);
    }

    const totalRow = db.prepare(countSql).get(...countParams) as { total: number };

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const orders = db.prepare(sql).all(...params).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      totalAmount: o.total_amount,
      discountAmount: o.discount_amount,
      netTotal: o.net_amount,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }));

    res.json(orders);
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — order detail
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orderData = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id)) as any;

    if (!orderData) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(id));
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(Number(id));
    const discounts = db.prepare('SELECT * FROM discounts WHERE order_id = ?').all(Number(id));

    const formattedOrder = {
      id: orderData.id,
      orderNumber: orderData.order_number,
      status: orderData.status,
      totalAmount: orderData.total_amount,
      discountAmount: orderData.discount_amount,
      netTotal: orderData.net_amount,
      createdAt: orderData.created_at,
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.name_snapshot,
        unitPrice: item.price_snapshot,
        quantity: item.quantity,
        totalPrice: item.total
      })),
      payments: payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        createdAt: p.created_at
      })),
      discounts
    };

    res.json(formattedOrder);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/cancel — cancel pending order
router.post('/:id/cancel', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id)) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Only pending orders can be cancelled' });
      return;
    }

    db.prepare(
      "UPDATE orders SET status = 'CANCELLED', updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(Number(id));

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('CANCEL_ORDER', req.user!.id, 'order', Number(id), JSON.stringify({ order_number: order.order_number }));

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id));
    res.json({ order: updated });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/discount — apply discount
router.post('/:id/discount', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
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

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id)) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Can only discount pending orders' });
      return;
    }

    let discountAmount: number;
    if (type === 'PERCENT') {
      if (value > 100) {
        res.status(400).json({ error: 'Percent discount cannot exceed 100' });
        return;
      }
      discountAmount = Math.round(order.total_amount * (value / 100) * 100) / 100;
    } else {
      discountAmount = value;
    }

    const netAmount = Math.round((order.total_amount - discountAmount) * 100) / 100;

    if (netAmount < 0) {
      res.status(400).json({ error: 'Discount cannot exceed order total' });
      return;
    }

    const applyDiscount = db.transaction(() => {
      db.prepare(
        'INSERT INTO discounts (order_id, type, value, created_by) VALUES (?, ?, ?, ?)'
      ).run(Number(id), type, value, req.user!.id);

      db.prepare(
        "UPDATE orders SET discount_amount = ?, net_amount = ?, updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(discountAmount, netAmount, Number(id));

      db.prepare(
        'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
      ).run('APPLY_DISCOUNT', req.user!.id, 'order', Number(id), JSON.stringify({ type, value, discount_amount: discountAmount, net_amount: netAmount }));
    });

    applyDiscount();

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id));
    res.json({ order: updated });
  } catch (err) {
    console.error('Apply discount error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/receipt — data for printing receipt
router.get('/:id/receipt', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orderData = db.prepare(`
      SELECT o.*, u.name as cashier_name 
      FROM orders o 
      LEFT JOIN users u ON o.created_by = u.id 
      WHERE o.id = ?
    `).get(Number(id)) as any;

    if (!orderData) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(id));
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(Number(id));

    // Get shop settings
    const settings = db.prepare("SELECT key_name, value FROM settings WHERE key_name IN ('SHOP_NAME', 'RECEIPT_FOOTER', 'TAX_PERCENT')").all() as any[];
    const shopInfo: any = {};
    settings.forEach(s => { shopInfo[s.key_name] = s.value; });

    const formattedOrder = {
      id: orderData.id,
      orderNumber: orderData.order_number,
      status: orderData.status,
      totalAmount: orderData.total_amount,
      discountAmount: orderData.discount_amount,
      netTotal: orderData.net_amount,
      createdAt: orderData.created_at,
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.name_snapshot,
        unitPrice: item.price_snapshot,
        quantity: item.quantity,
        totalPrice: item.total
      })),
      payments: payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        createdAt: p.created_at
      })),
      cashierName: orderData.cashier_name,
      shopName: shopInfo['SHOP_NAME'] || 'Sandwich & Coffee',
      receiptFooter: shopInfo['RECEIPT_FOOTER'] || 'Thank you for your business!',
      taxPercent: Number(shopInfo['TAX_PERCENT'] || 0)
    };

    res.json(formattedOrder);
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
