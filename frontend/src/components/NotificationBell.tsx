import React, { useRef, useState, useEffect } from 'react';
import { Bell, Package, X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, ExternalOrderNotification } from '@/lib/notifications';

const SOURCE_LABELS: Record<string, string> = {
  wongnai: 'Wongnai',
  lineman: 'LINE MAN',
  grabfood: 'GrabFood',
  custom: 'External',
  external: 'External',
};

const SOURCE_EMOJI: Record<string, string> = {
  wongnai: '🍜',
  lineman: '🟢',
  grabfood: '🟠',
  custom: '📦',
  external: '📦',
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

function NotificationRow({ n, onRead }: { n: ExternalOrderNotification; onRead: (id: string) => void }) {
  const sourceLabel = SOURCE_LABELS[n.source] || n.source;
  const emoji = SOURCE_EMOJI[n.source] || '📦';

  return (
    <div
      className={`px-4 py-3 border-b border-pos-border-default last:border-0 cursor-pointer hover:bg-pos-bg-surface transition-colors ${!n.isRead ? 'bg-pos-accent-primary/5' : ''}`}
      onClick={() => !n.isRead && onRead(n.id)}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-pos-xs font-semibold text-pos-accent-primary">{sourceLabel}</span>
            <span className="text-pos-xs text-pos-text-secondary flex-shrink-0">{timeAgo(n.receivedAt)}</span>
          </div>
          {n.customerName && (
            <p className="text-pos-sm text-pos-text-primary font-medium truncate">{n.customerName}</p>
          )}
          <p className="text-pos-xs text-pos-text-secondary truncate">
            {n.items.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(', ')}
            {n.items.length > 2 && ` +${n.items.length - 2}`}
          </p>
          <p className="text-pos-sm font-bold text-pos-text-primary mt-0.5">
            ฿{n.totalAmount.toLocaleString()}
          </p>
          {n.note && (
            <p className="text-pos-xs text-pos-text-secondary italic mt-0.5 truncate">Note: {n.note}</p>
          )}
        </div>
        {!n.isRead && (
          <div className="w-2 h-2 rounded-full bg-pos-accent-primary flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative touch-target flex items-center justify-center w-10 h-10 rounded-pos-md hover:bg-pos-bg-elevated transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-pos-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-pos-bg-elevated border border-pos-border-default rounded-pos-md shadow-pos-modal z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-border-default">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-pos-accent-primary" />
                <span className="text-pos-sm font-semibold text-pos-text-primary">External Orders</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-pos-xs text-pos-accent-primary hover:underline px-2 py-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-pos-bg-surface text-pos-text-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-pos-text-secondary mx-auto mb-2 opacity-40" />
                  <p className="text-pos-sm text-pos-text-secondary">No external orders yet</p>
                  <p className="text-pos-xs text-pos-text-secondary mt-1 opacity-70">
                    Orders from Wongnai or delivery apps will appear here
                  </p>
                </div>
              ) : (
                notifications.map(n => (
                  <NotificationRow key={n.id} n={n} onRead={markAsRead} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
