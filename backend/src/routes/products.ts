import { Router, Response } from 'express';
import prisma from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET / — list active products (POS view)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category: category as string } : {}),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json(products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      image: p.imageUrl,
      active: p.isActive,
      sortOrder: p.sortOrder,
    })));
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /all — all products including inactive (admin)
router.get('/all', authenticate, authorize(['ADMIN']), async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ products });
  } catch (err) {
    console.error('List all products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create product (admin)
router.post('/', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, price, sort_order, image_url } = req.body;

    if (!name || !category || price == null) {
      res.status(400).json({ error: 'name, category, and price are required' });
      return;
    }

    const product = await prisma.product.create({
      data: { name, category, price, sortOrder: sort_order || 0, imageUrl: image_url || null },
    });

    await prisma.auditLog.create({
      data: { action: 'CREATE_PRODUCT', userId: req.user!.id, entity: 'product', entityId: product.id, payload: { name, category, price } },
    });

    res.status(201).json({ product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id — update product (admin)
router.put('/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const { name, category, price, sort_order, image_url, is_active } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(category != null && { category }),
        ...(price != null && { price }),
        ...(sort_order != null && { sortOrder: sort_order }),
        ...(image_url !== undefined && { imageUrl: image_url }),
        ...(is_active != null && { isActive: Boolean(is_active) }),
      },
    });

    await prisma.auditLog.create({
      data: { action: 'UPDATE_PRODUCT', userId: req.user!.id, entity: 'product', entityId: id, payload: req.body },
    });

    res.json({ product });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — soft-delete / toggle product (admin)
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const newStatus = !existing.isActive;
    await prisma.product.update({ where: { id }, data: { isActive: newStatus } });

    await prisma.auditLog.create({
      data: { action: 'TOGGLE_PRODUCT', userId: req.user!.id, entity: 'product', entityId: id, payload: { is_active: newStatus } },
    });

    res.json({ message: newStatus ? 'Product activated' : 'Product deactivated', is_active: newStatus });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
