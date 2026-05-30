import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { broadcastEvent } from '../lib/sseManager.js';
import { createNotification, NotificationItem } from '../lib/notificationStore.js';

const router = Router();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

function verifySecret(req: Request): boolean {
  if (!WEBHOOK_SECRET) return true; // If not configured, allow all (dev mode)
  const provided = req.headers['x-webhook-secret'] || req.headers['x-wongnai-secret'];
  return provided === WEBHOOK_SECRET;
}

/**
 * POST /api/webhooks/external-order
 *
 * Generic webhook endpoint for external delivery platforms (Wongnai, LINE MAN, etc.)
 *
 * Expected body (flexible, supports multiple platforms):
 * {
 *   "source": "wongnai" | "lineman" | "custom",
 *   "order_id": "WNG-12345",
 *   "customer_name": "สมชาย ใจดี",
 *   "phone": "0812345678",
 *   "items": [
 *     { "name": "BLT Sandwich", "quantity": 2, "price": 120 }
 *   ],
 *   "total": 240,
 *   "delivery_address": "...",
 *   "note": "..."
 * }
 */
router.post('/external-order', async (req: Request, res: Response) => {
  if (!verifySecret(req)) {
    res.status(401).json({ error: 'Invalid webhook secret' });
    return;
  }

  try {
    const body = req.body;

    const source: string = String(body.source || 'external').toLowerCase();
    const externalId: string | undefined = body.order_id || body.orderId || body.id;
    const customerName: string | undefined = body.customer_name || body.customerName || body.name;
    const phone: string | undefined = body.phone || body.customer_phone;
    const deliveryAddress: string | undefined = body.delivery_address || body.address;
    const note: string | undefined = body.note || body.special_instructions;
    const totalAmount: number = Number(body.total || body.total_amount || body.totalAmount || 0);

    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
    const items: NotificationItem[] = rawItems.map((i: any) => {
      const price = Number(i.price || i.unit_price || 0);
      const quantity = Number(i.quantity || i.qty || 1);
      return {
        name: String(i.name || i.product_name || 'Unknown item'),
        quantity,
        price,
        subtotal: price * quantity,
      };
    });

    const notification = createNotification({
      source,
      externalId,
      customerName,
      phone,
      items,
      totalAmount,
      deliveryAddress,
      note,
    });

    // Broadcast to all connected frontend clients
    broadcastEvent('external_order', notification);

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'EXTERNAL_ORDER_RECEIVED',
        entity: 'external_order',
        payload: {
          notification_id: notification.id,
          source,
          external_id: externalId,
          customer_name: customerName,
          total_amount: totalAmount,
          items_count: items.length,
        },
      },
    }).catch(() => {}); // Non-fatal

    res.status(200).json({ received: true, notificationId: notification.id });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
