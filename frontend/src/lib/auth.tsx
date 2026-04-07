import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { login as apiLogin } from './api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('pos_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadStoredToken(): string | null {
  return localStorage.getItem('pos_token');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser);
  const [token, setToken] = useState<string | null>(loadStoredToken);

  const isAuthenticated = !!user && !!token;

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const result = await apiLogin(email, password);
    setUser(result.user);
    setToken(result.token);
    localStorage.setItem('pos_user', JSON.stringify(result.user));
    localStorage.setItem('pos_token', result.token);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_token');
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pos_token' && !e.newValue) {
        setUser(null);
        setToken(null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'CASHIER';
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
