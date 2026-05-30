import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './auth';

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

interface NotificationsContextValue {
  notifications: ExternalOrderNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

const SOURCE_LABELS: Record<string, string> = {
  wongnai: 'Wongnai',
  lineman: 'LINE MAN',
  grabfood: 'GrabFood',
  custom: 'External',
  external: 'External',
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ExternalOrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const res = await fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  }, []);

  const connectSSE = useCallback(() => {
    const token = localStorage.getItem('pos_token');
    if (!token) return;

    const url = `/api/notifications/stream`;
    const es = new EventSource(url + `?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = es;

    es.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data);
      setUnreadCount(data.unreadCount);
    });

    es.addEventListener('external_order', (e) => {
      const notification: ExternalOrderNotification = JSON.parse(e.data);
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);

      const sourceLabel = SOURCE_LABELS[notification.source] || notification.source;
      const itemSummary = notification.items.slice(0, 2).map(i => `${i.name} x${i.quantity}`).join(', ');
      const more = notification.items.length > 2 ? ` +${notification.items.length - 2} more` : '';

      toast.custom(
        (t) => (
          <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            style={{
              background: '#1a1a2e',
              border: '1px solid #10D98A',
              borderRadius: '12px',
              padding: '16px',
              color: '#F5F5F0',
              minWidth: '300px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>
                  {notification.source === 'wongnai' ? '🍜' : '📦'}
                </span>
                <span style={{ fontWeight: 700, color: '#10D98A', fontSize: '14px' }}>
                  New Order from {sourceLabel}!
                </span>
              </div>
              {notification.customerName && (
                <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '4px' }}>
                  Customer: {notification.customerName}
                </p>
              )}
              <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                {itemSummary}{more}
              </p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F0' }}>
                Total: ฿{notification.totalAmount.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
            >
              ×
            </button>
          </div>
        ),
        { duration: 10000 }
      );
    });

    es.onerror = () => {
      es.close();
      setTimeout(connectSSE, 5000);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      eventSourceRef.current?.close();
      return;
    }

    fetchNotifications();
    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [user, fetchNotifications, connectSSE]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('pos_token');
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('pos_token');
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
