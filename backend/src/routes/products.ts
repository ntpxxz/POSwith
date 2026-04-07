import { Router, Response } from 'express';
import db from '../db/schema.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET / — list active products (POS view)
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;

    let sql = 'SELECT id, name, category, price, image_url, sort_order, is_active FROM products WHERE is_active = 1';
    const params: any[] = [];
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY category, sort_order, name';

    const rawProducts = db.prepare(sql).all(...params) as any[];
    console.log(`Found ${rawProducts.length} active products`);

    const products = rawProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      image: p.image_url,
      active: p.is_active === 1,
      sortOrder: p.sort_order
    }));
    res.json(products);
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /all — list all products including inactive (admin)
router.get('/all', authenticate, authorize(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const products = db.prepare(
      'SELECT * FROM products ORDER BY category, sort_order, name'
    ).all();
    res.json({ products });
  } catch (err) {
    console.error('List all products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create product (admin)
router.post('/', authenticate, authorize(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const { name, category, price, sort_order, image_url } = req.body;

    if (!name || !category || price == null) {
      res.status(400).json({ error: 'name, category, and price are required' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO products (name, category, price, sort_order, image_url) VALUES (?, ?, ?, ?, ?)'
    ).run(name, category, price, sort_order || 0, image_url || null);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('CREATE_PRODUCT', req.user!.id, 'product', result.lastInsertRowid, JSON.stringify({ name, category, price }));

    res.status(201).json({ product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id — update product (admin)
router.put('/:id', authenticate, authorize(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id));

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const { name, category, price, sort_order, image_url, is_active } = req.body;

    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          price = COALESCE(?, price),
          sort_order = COALESCE(?, sort_order),
          image_url = COALESCE(?, image_url),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      name ?? null, category ?? null, price ?? null,
      sort_order ?? null, image_url ?? null, is_active ?? null,
      Number(id)
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id));

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('UPDATE_PRODUCT', req.user!.id, 'product', Number(id), JSON.stringify(req.body));

    res.json({ product });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — soft-delete / toggle product (admin)
router.delete('/:id', authenticate, authorize(['ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id)) as any;

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const newStatus = existing.is_active ? 0 : 1;
    db.prepare(
      'UPDATE products SET is_active = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?'
    ).run(newStatus, Number(id));

    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('TOGGLE_PRODUCT', req.user!.id, 'product', Number(id), JSON.stringify({ is_active: newStatus }));

    res.json({ message: newStatus ? 'Product activated' : 'Product deactivated', is_active: newStatus });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
