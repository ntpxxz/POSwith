import { useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
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
  RotateCcw,
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
  { to: '/admin/refunds', icon: RotateCcw, label: 'Refunds' },
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
    '/admin/refunds': 'Refunds',
  };
  return map[pathname] || 'Dashboard';
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-pos-bg-primary overflow-hidden font-body selection:bg-pos-accent-primary/20">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col bg-[#0f1011] flex-shrink-0 z-20 border-r border-pos-border-default"
      >
        {/* Logo / Back to POS */}
        <Link to="/" className="h-16 flex items-center px-4 border-b border-pos-border-default gap-3 shrink-0 hover:bg-white/5 transition-colors cursor-pointer text-decoration-none">
          <div className="w-9 h-9 rounded-pos-sm bg-pos-accent-primary flex items-center justify-center flex-shrink-0 mt-1 mb-1">
            <Store size={20} className="text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden flex flex-col"
              >
                <span className="font-body font-wght-510 text-pos-text-primary text-pos-base leading-none mb-0.5">
                  Linear POS
                </span>
                <span className="font-mono text-pos-nano uppercase tracking-widest text-pos-text-tertiary">
                  Back to Sales &gt;
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-3 mt-4 mb-2 p-2 rounded-pos-md text-pos-text-tertiary hover:text-pos-text-primary hover:bg-white/5 transition-colors flex justify-center"
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
                `flex items-center gap-3 px-3 py-2.5 rounded-pos-md transition-all duration-150 group font-body font-medium text-pos-sm ${isActive
                  ? 'bg-white/10 text-pos-text-primary'
                  : 'text-pos-text-tertiary hover:text-pos-text-primary hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    className={`flex-shrink-0 ${isActive ? 'text-pos-text-primary' : ''}`}
                  />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-pos-sm whitespace-nowrap overflow-hidden"
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
        <div className="px-3 py-4 border-t border-pos-border-default shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-pos-md text-pos-text-tertiary hover:text-pos-accent-danger hover:bg-white/5 transition-colors w-full font-body font-medium text-pos-sm"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-pos-sm whitespace-nowrap overflow-hidden"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-8 glass-nav shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-2 text-pos-text-tertiary">
            <span className="font-mono text-pos-xs uppercase tracking-widest font-medium bg-white/5 px-2 py-0.5 rounded-pos-sm text-pos-text-secondary border border-white/10">Admin</span>
            <ChevronRight size={14} />
            <span className="font-body font-wght-510 text-pos-base text-pos-text-primary tracking-tight">
              {getBreadcrumb(location.pathname)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-pos-xs font-semibold text-pos-text-secondary uppercase tracking-widest">{user?.name}</span>
            <div className="w-8 h-8 rounded-pos-pill bg-white/10 border border-white/20 flex items-center justify-center text-pos-text-primary text-[11px] font-bold">
              {user?.name?.charAt(0)}
            </div>
            <span className="font-mono px-2 py-0.5 rounded-pos-pill text-pos-nano font-bold uppercase tracking-widest bg-pos-accent-primary/10 text-pos-accent-primary border border-pos-accent-primary/20">
              {user?.role}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-pos-bg-primary">
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
