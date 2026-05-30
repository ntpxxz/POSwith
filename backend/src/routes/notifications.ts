import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { addClient, removeClient } from '../lib/sseManager.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../lib/notificationStore.js';

const router = Router();

// GET /api/notifications/stream — SSE stream for real-time notifications
router.get('/stream', (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = uuidv4();
  addClient(clientId, res, req.user!.id);

  // Send initial unread count
  res.write(`event: connected\ndata: ${JSON.stringify({ unreadCount: getUnreadCount() })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeClient(clientId);
  });
});

// GET /api/notifications — list recent notifications
router.get('/', (req: AuthRequest, res: Response) => {
  res.json({ notifications: getNotifications(), unreadCount: getUnreadCount() });
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', (req: AuthRequest, res: Response) => {
  const ok = markAsRead(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  res.json({ unreadCount: getUnreadCount() });
});

// POST /api/notifications/read-all — mark all as read
router.post('/read-all', (_req: AuthRequest, res: Response) => {
  markAllAsRead();
  res.json({ unreadCount: 0 });
});

export default router;
