import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/schema.js';
import { authenticate, AuthRequest, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// POST /login
router.post('/login', (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db.prepare(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?'
    ).get(email) as { id: number; name: string; email: string; password_hash: string; role: string; is_active: number } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit log
    db.prepare(
      'INSERT INTO audit_logs (action, user_id, entity, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run('LOGIN', user.id, 'user', user.id, JSON.stringify({ email: user.email }));

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /logout
router.post('/logout', authenticate, (req: AuthRequest, res: Response) => {
  // Stateless JWT — just acknowledge
  db.prepare(
    'INSERT INTO audit_logs (action, user_id, entity, entity_id) VALUES (?, ?, ?, ?)'
  ).run('LOGOUT', req.user!.id, 'user', req.user!.id);

  res.json({ message: 'Logged out successfully' });
});

// GET /me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
