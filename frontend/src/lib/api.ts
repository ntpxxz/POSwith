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
export async function getSettings() {
  const res = await get<{ settings: import('@/types').Setting[] }>('/admin/settings');
  return res.settings;
}

export async function updateSettings(data: { key_name: string; value: string }[]) {
  const res = await put<{ settings: import('@/types').Setting[] }>('/admin/settings', data);
  return res.settings;
}

// ─── Admin: Payment Methods ─────────────────────────────────────
export async function getPaymentMethods() {
  const res = await get<{ payment_methods: import('@/types').PaymentMethod[] }>('/admin/payment-methods');
  return res.payment_methods;
}

export function updatePaymentMethod(id: number, data: Partial<import('@/types').PaymentMethod>) {
  return put<import('@/types').PaymentMethod>(`/admin/payment-methods/${id}`, data);
}

// ─── Admin: Shifts ──────────────────────────────────────────────
export function openShift(data: { openingBalance: number }) {
  return post<import('@/types').Shift>('/admin/shifts/open', data);
}

export function closeShift(id: number, data: { closingBalance: number }) {
  return post<import('@/types').Shift>(`/admin/shifts/${id}/close`, data);
}

export async function getShifts(params?: { from?: string; to?: string }) {
  const query = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  const res = await get<{ shifts: import('@/types').Shift[] }>(`/admin/shifts${query}`);
  return res.shifts;
}

// ─── Admin: Cash Adjustments ────────────────────────────────────
export async function getCashAdjustments(shiftId?: number) {
  const query = shiftId ? `?shiftId=${shiftId}` : '';
  const res = await get<{ cash_adjustments: import('@/types').CashAdjustment[] }>(`/admin/cash-adjustments${query}`);
  return res.cash_adjustments;
}

export function createCashAdjustment(data: { type: 'IN' | 'OUT'; amount: number; reason: string }) {
  return post<import('@/types').CashAdjustment>('/admin/cash-adjustments', data);
}

// ─── Admin: Audit Logs ──────────────────────────────────────────
export async function getAuditLogs(params?: { from?: string; to?: string; action?: string }) {
  const query = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  const res = await get<{ audit_logs: import('@/types').AuditLog[]; total: number }>(`/admin/audit-logs${query}`);
  return res.audit_logs;
}

// ─── Admin: Reports ─────────────────────────────────────────────
export function getSalesReport(params: { from: string; to: string }) {
  const q = new URLSearchParams({ start_date: params.from, end_date: params.to }).toString();
  return get<import('@/types').SalesReport>(`/admin/reports/sales?${q}`);
}

export function getProductsReport(params: { from: string; to: string }) {
  const q = new URLSearchParams({ start_date: params.from, end_date: params.to }).toString();
  return get<import('@/types').ProductsReport>(`/admin/reports/products?${q}`);
}

export function getPaymentsReport(params: { from: string; to: string }) {
  const q = new URLSearchParams({ start_date: params.from, end_date: params.to }).toString();
  return get<import('@/types').PaymentsReport>(`/admin/reports/payments?${q}`);
}

export function getStaffReport(params: { from: string; to: string }) {
  const q = new URLSearchParams({ start_date: params.from, end_date: params.to }).toString();
  return get<{ staff: import('@/types').StaffReportRow[] }>(`/admin/reports/staff?${q}`);
}

export async function getShiftReport(shiftId: number) {
  const res = await get<{ report: import('@/types').ShiftReport }>(`/admin/shifts/${shiftId}/report`);
  return res.report;
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

export async function uploadProductImage(file: File): Promise<string> {
  const token = localStorage.getItem('pos_token');
  const form = new FormData();
  form.append('image', file);
  const res = await fetch('/api/admin/products/upload-image', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  const data = await res.json();
  return data.url;
}

// ─── Admin: Orders (refund search) ─────────────────────────────
export async function getAdminOrders(params?: { search?: string; status?: string; page?: number }) {
  const query = params ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
  ).toString() : '';
  const res = await get<{ orders: import('@/types').AdminOrder[]; pagination: { total: number; total_pages: number } }>(`/admin/orders${query}`);
  return res;
}

// ─── Admin: Refunds ─────────────────────────────────────────────
export function createRefund(data: { orderId: number; amount: number; reason: string }) {
  return post<{ refund: import('@/types').Refund }>('/admin/refunds', data);
}

// ─── Hardware Integration ───────────────────────────────────────
export function requestPrintReceipt(orderId: number) {
  return post<{ success: boolean; autoPrint: boolean; message: string }>(`/print/receipt/${orderId}`);
}
