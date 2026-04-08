import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, ProtectedRoute } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const POSPage = lazy(() => import('@/pages/POSPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const QRPaymentPage = lazy(() => import('@/pages/QRPaymentPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const ProductManagementPage = lazy(() => import('@/pages/admin/ProductManagementPage'));
const UserManagementPage = lazy(() => import('@/pages/admin/UserManagementPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));
const ShiftManagementPage = lazy(() => import('@/pages/admin/ShiftManagementPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-pos-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-pos-border-default border-t-pos-accent-primary rounded-full animate-spin" />
        <p className="text-pos-text-secondary text-pos-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <POSPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/qr/:orderId"
                element={
                  <ProtectedRoute>
                    <QRPaymentPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="products" element={<ProductManagementPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="shifts" element={<ShiftManagementPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </CartProvider>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#252540',
              color: '#F5F5F0',
              border: '1px solid #2E2E4A',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10D98A', secondary: '#252540' },
            },
            error: {
              iconTheme: { primary: '#FF4757', secondary: '#252540' },
            },
          }}
        />
      </AuthProvider >
    </BrowserRouter >
  );
}

