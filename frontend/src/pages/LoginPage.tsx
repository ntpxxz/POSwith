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
    <div className="min-h-screen flex items-center justify-center bg-pos-bg-primary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-pos-bg-surface border border-pos-border-default rounded-pos-xl p-8 shadow-pos-modal">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-pos-lg bg-pos-accent-primary/10 flex items-center justify-center mb-4">
              <Coffee className="w-8 h-8 text-pos-accent-primary" />
            </div>
            <h1 className="font-display font-bold text-pos-2xl text-pos-text-primary">
              Sandwich & Coffee
            </h1>
            <p className="text-pos-text-secondary text-pos-sm mt-1">POS System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-pos-sm font-medium text-pos-text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                className="w-full h-14 px-4 bg-pos-bg-elevated border border-pos-border-default rounded-pos-md text-pos-text-primary text-pos-base placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-accent-primary focus:ring-1 focus:ring-pos-accent-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-pos-sm font-medium text-pos-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full h-14 px-4 pr-12 bg-pos-bg-elevated border border-pos-border-default rounded-pos-md text-pos-text-primary text-pos-base placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-accent-primary focus:ring-1 focus:ring-pos-accent-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-pos-text-secondary hover:text-pos-text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-pos-accent-primary hover:bg-pos-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-semibold text-pos-md rounded-pos-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Login'
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-pos-text-disabled text-pos-xs mt-6">
          Sandwich & Coffee POS v1.0
        </p>
      </motion.div>
    </div>
  );
}
