import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, Shield, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeStr = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateStr = now.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="flex items-center justify-between h-16 px-5 bg-pos-bg-surface border-b border-pos-border-default flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="font-display font-bold text-pos-lg text-pos-accent-primary">
          Sandwich & Coffee
        </h1>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-pos-accent-success/10 text-pos-accent-success text-pos-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-pos-accent-success animate-pulse" />
          Online
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-pos-xs text-pos-text-secondary">{dateStr}</p>
          <p className="font-mono text-pos-md font-bold text-pos-text-primary">{timeStr}</p>
        </div>

        <div className="h-8 w-px bg-pos-border-default hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-pos-accent-primary/20 flex items-center justify-center text-pos-accent-primary font-bold text-pos-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-pos-sm font-medium text-pos-text-primary">{user?.name}</p>
            <p className="text-pos-xs text-pos-text-secondary capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="touch-target flex items-center justify-center w-12 h-12 rounded-pos-md hover:bg-pos-bg-elevated transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? (
              <X className="w-5 h-5 text-pos-text-secondary" />
            ) : (
              <Menu className="w-5 h-5 text-pos-text-secondary" />
            )}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-14 w-56 bg-pos-bg-elevated border border-pos-border-default rounded-pos-md shadow-pos-modal z-50 overflow-hidden"
              >
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/admin');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-pos-sm text-pos-text-primary hover:bg-pos-bg-surface transition-colors"
                  >
                    <Shield className="w-4 h-4 text-pos-accent-info" />
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-pos-sm text-pos-accent-danger hover:bg-pos-bg-surface transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
