import { v4 as uuidv4 } from 'uuid';

export interface NotificationItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface ExternalOrderNotification {
  id: string;
  source: string;
  externalId?: string;
  customerName?: string;
  phone?: string;
  items: NotificationItem[];
  totalAmount: number;
  deliveryAddress?: string;
  note?: string;
  isRead: boolean;
  receivedAt: string;
}

const MAX_NOTIFICATIONS = 50;
const store: ExternalOrderNotification[] = [];

export function createNotification(
  data: Omit<ExternalOrderNotification, 'id' | 'isRead' | 'receivedAt'>
): ExternalOrderNotification {
  const notification: ExternalOrderNotification = {
    ...data,
    id: uuidv4(),
    isRead: false,
    receivedAt: new Date().toISOString(),
  };

  store.unshift(notification);
  if (store.length > MAX_NOTIFICATIONS) {
    store.splice(MAX_NOTIFICATIONS);
  }

  return notification;
}

export function getNotifications(): ExternalOrderNotification[] {
  return [...store];
}

export function markAsRead(id: string): boolean {
  const n = store.find(n => n.id === id);
  if (!n) return false;
  n.isRead = true;
  return true;
}

export function markAllAsRead() {
  store.forEach(n => { n.isRead = true; });
}

export function getUnreadCount(): number {
  return store.filter(n => !n.isRead).length;
}
