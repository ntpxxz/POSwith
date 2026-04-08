import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    const dest = user?.role === 'ADMIN' ? '/admin' : '/';
    navigate(dest, { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      toast.success(`Welcome, ${loggedInUser.name}`);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate(loggedInUser.role === 'ADMIN' ? '/admin' : '/', { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pos-bg-primary p-4 font-body selection:bg-pos-accent-primary/20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        <div className="bg-[#0f1011] border border-pos-border-default rounded-pos-xl p-10 shadow-pos-dialog">
          <div className="flex flex-col mb-10">
            <div className="w-10 h-10 text-pos-text-primary mb-6">
              <Coffee size={40} strokeWidth={1.5} />
            </div>
            <h1 className="font-display font-wght-510 text-pos-2xl text-pos-text-primary tracking-tight leading-none">
              Welcome
            </h1>
            <p className="text-pos-text-secondary text-pos-sm mt-2">Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-pos-md text-pos-text-primary text-pos-sm placeholder:text-pos-text-tertiary focus:border-pos-border-focus outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full h-12 px-4 pr-12 bg-white/5 border border-white/10 rounded-pos-md text-pos-text-primary text-pos-sm placeholder:text-pos-text-tertiary focus:border-pos-border-focus outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-pos-text-tertiary hover:text-pos-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-pos-accent-primary text-white font-medium text-pos-sm rounded-pos-md hover:bg-pos-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-pos-text-tertiary text-pos-xs mt-12 mb-8 tracking-widest font-mono uppercase">
          Retail Management System v2.0
        </p>
      </motion.div>
    </div>
  );
}
