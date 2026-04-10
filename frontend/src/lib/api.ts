const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('pos_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

// ─── Auth ────────────────────────────────────────────────────────
export function login(email: string, password: string) {
  return post<{ token: string; user: import('@/types').User }>('/auth/login', { email, password });
}

// ─── POS / Orders ───────────────────────────────────────────────
export function getProducts() {
  return get<import('@/types').Product[]>('/products');
}

export function createOrder(data: {
  items: { productId: number; quantity: number }[];
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
}) {
  return post<import('@/types').Order>('/orders', data);
}

export function getOrderById(id: number) {
  return get<import('@/types').Order>(`/orders/${id}`);
}

export function cancelOrder(id: number) {
  return post<import('@/types').Order>(`/orders/${id}/cancel`);
}

export function applyDiscount(
  orderId: number,
  data: { type: 'PERCENT' | 'FIXED'; value: number }
) {
  return post<import('@/types').Order>(`/orders/${orderId}/discount`, data);
}

// ─── Payments ───────────────────────────────────────────────────
export function getQR(orderId: number) {
  return post<{ qrCode: string; reference: string; amount: number; expiresAt: string }>(
    `/payments/${orderId}/qr`
  );
}

export function confirmPayment(orderId: number) {
  return post<import('@/types').Payment>(`/payments/${orderId}/confirm`);
}

export function cashPayment(orderId: number, data: { receivedAmount: number }) {
  return post<import('@/types').Payment>(`/payments/${orderId}/cash`, data);
}

export function getReceipt(orderId: number) {
  return get<import('@/types').Order>(`/orders/${orderId}/receipt`);
}

// ─── Admin: Dashboard ───────────────────────────────────────────
export function getDashboard() {
  return get<import('@/types').DashboardData>('/admin/dashboard');
}

// ─── Admin: Users ───────────────────────────────────────────────
export function getUsers() {
  return get<import('@/types').User[]>('/admin/users');
}

export function createUser(data: { email: string; password: string; name: string; role: string }) {
  return post<import('@/types').User>('/admin/users', data);
}

export function updateUser(id: number, data: Partial<import('@/types').User & { password?: string }>) {
  return put<import('@/types').User>(`/admin/users/${id}`, data);
}

// ─── Admin: Settings ────────────────────────────────────────────
export function getSettings() {
  return get<{ settings: import('@/types').Setting[] }>('/admin/settings');
}

export function updateSettings(data: { key_name: string; value: string }[]) {
  return put<{ settings: import('@/types').Setting[] }>('/admin/settings', { settings: data });
}

// ─── Admin: Payment Methods ─────────────────────────────────────
export function getPaymentMethods() {
  return get<{ payment_methods: import('@/types').PaymentMethod[] }>('/admin/payment-methods');
}

export function updatePaymentMethod(id: number, data: Partial<import('@/types').PaymentMethod>) {
  return put<{ payment_method: import('@/types').PaymentMethod }>(`/admin/payment-methods/${id}`, data);
}

// ─── Admin: Shifts ──────────────────────────────────────────────
export function openShift(data: { openingBalance: number }) {
  return post<{ shift: import('@/types').Shift }>('/shifts/open', { opening_cash: data.openingBalance });
}

export function closeShift(data: { closingBalance: number }) {
  return post<{ shift: import('@/types').Shift }>('/shifts/close', { closing_cash: data.closingBalance });
}

export function getShifts(params?: { from?: string; to?: string }) {
  const query = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  return get<{ shifts: import('@/types').Shift[] }>(`/admin/shifts${query}`);
}

// ─── Admin: Cash Adjustments ────────────────────────────────────
export function getCashAdjustments(shiftId?: number) {
  const query = shiftId ? `?shift_id=${shiftId}` : '';
  return get<{ cash_adjustments: import('@/types').CashAdjustment[] }>(`/admin/cash-adjustments${query}`);
}

export function createCashAdjustment(data: { shift_id?: number; type: 'IN' | 'OUT'; amount: number; reason: string }) {
  return post<{ cash_adjustment: import('@/types').CashAdjustment }>('/admin/cash-adjustments', data);
}

// ─── Admin: Audit Logs ──────────────────────────────────────────
export function getAuditLogs(params?: { page?: string; limit?: string; action?: string; entity?: string }) {
  const query = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  return get<{ audit_logs: import('@/types').AuditLog[]; pagination?: any }>(`/admin/audit-logs${query}`);
}

// ─── Admin: Reports ─────────────────────────────────────────────
export function getSalesReport(params: { from: string; to: string }) {
  const query = new URLSearchParams(params).toString();
  return get<import('@/types').SalesReport>(`/admin/reports/sales?${query}`);
}

export function getProductsReport(params: { from: string; to: string }) {
  const query = new URLSearchParams(params).toString();
  return get<import('@/types').ProductsReport>(`/admin/reports/products?${query}`);
}

export function getPaymentsReport(params: { from: string; to: string }) {
  const query = new URLSearchParams(params).toString();
  return get<import('@/types').PaymentsReport>(`/admin/reports/payments?${query}`);
}

// ─── Admin: Products (CRUD) ─────────────────────────────────────
export function getAllProducts() {
  return get<import('@/types').Product[]>('/admin/products');
}

export function createProduct(data: { name: string; price: number; category: string }) {
  return post<import('@/types').Product>('/admin/products', data);
}

export function updateProduct(id: number, data: Partial<import('@/types').Product>) {
  return put<import('@/types').Product>(`/admin/products/${id}`, data);
}

export function deleteProduct(id: number) {
  return del<void>(`/admin/products/${id}`);
}

// ─── Hardware Integration ───────────────────────────────────────
export function requestPrintReceipt(orderId: number) {
  return post<{ success: boolean; message: string }>(`/print/receipt/${orderId}`);
}
