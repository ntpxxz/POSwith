import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  BarChart3,
  Clock,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Store,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/shifts', icon: Clock, label: 'Shifts' },
  { to: '/admin/audit-logs', icon: FileText, label: 'Audit Logs' },
];

function getBreadcrumb(pathname: string): string {
  const map: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/products': 'Products',
    '/admin/users': 'Users',
    '/admin/settings': 'Settings',
    '/admin/reports': 'Reports',
    '/admin/shifts': 'Shifts',
    '/admin/audit-logs': 'Audit Logs',
  };
  return map[pathname] || 'Dashboard';
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-pos-bg-primary overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col bg-pos-bg-surface border-r border-pos-border-default flex-shrink-0"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-pos-border-default gap-3">
          <div className="w-9 h-9 rounded-pos-md bg-pos-accent-primary flex items-center justify-center flex-shrink-0">
            <Store size={20} className="text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-display font-bold text-pos-text-primary text-pos-md whitespace-nowrap overflow-hidden"
              >
                POS Admin
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-3 mt-3 mb-1 p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-text-primary hover:bg-pos-bg-elevated transition-colors"
        >
          {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
        </button>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-pos-md transition-all duration-150 group ${
                  isActive
                    ? 'bg-pos-accent-primary/15 text-pos-accent-primary'
                    : 'text-pos-text-secondary hover:text-pos-text-primary hover:bg-pos-bg-elevated'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    className={`flex-shrink-0 ${isActive ? 'text-pos-accent-primary' : ''}`}
                  />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-pos-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-pos-border-default">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-pos-md text-pos-text-secondary hover:text-pos-accent-danger hover:bg-pos-accent-danger/10 transition-colors w-full"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-pos-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-pos-bg-surface border-b border-pos-border-default flex-shrink-0">
          <div className="flex items-center gap-2 text-pos-text-secondary">
            <span className="text-pos-sm">Admin</span>
            <ChevronRight size={14} />
            <span className="text-pos-sm font-medium text-pos-text-primary">
              {getBreadcrumb(location.pathname)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-pos-sm text-pos-text-secondary">{user?.name}</span>
            <span className="px-2 py-0.5 rounded-full text-pos-xs font-medium bg-pos-accent-primary/20 text-pos-accent-primary">
              {user?.role}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
