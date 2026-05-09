export interface User {
  id: number;
  email: string;
  name: string;
  shopName?: string;
  role: 'ADMIN' | 'CASHIER';
  active: boolean;
  is_active?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Discount {
  type: 'PERCENT' | 'FIXED';
  value: number;
  amount: number;
}

export interface Payment {
  id: number;
  orderId: number;
  method: 'CASH' | 'QR';
  amount: number;
  receivedAmount?: number;
  change?: number;
  reference?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  subtotal: number;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  discountAmount: number;
  netTotal: number;
  totalAmount: number;
  items: OrderItem[];
  payment?: Payment;
  payments?: Payment[];
  cashierId: number;
  cashierName: string;
  shiftId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: number;
  userId: number;
  userName: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  difference?: number;
  totalSales?: number;
  totalOrders?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface CashAdjustment {
  id: number;
  shiftId: number;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId?: number;
  userId: number;
  userName: string;
  details?: string;
  createdAt: string;
}

export interface DashboardData {
  todaySales: number;
  todayOrders: number;
  averageOrderValue: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesByHour: { hour: number; sales: number; orders: number }[];
  recentOrders: Order[];
  paymentBreakdown: { method: string; total: number; count: number }[];
}

export interface Setting {
  id: number;
  key_name: string;
  value: string;
  description?: string;
  updatedAt: string;
}

export interface CartItemData {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface PaymentMethod {
  id: number;
  method: string;
  enabled: boolean;
  is_active?: number; // Add is_active
  config?: Record<string, string>;
  configs?: any[]; // Add configs as array for API
}

export interface SalesReport {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByDate: { date: string; sales: number; orders: number }[];
  salesByPaymentMethod: { method: string; total: number; count: number }[];
}

export interface ProductsReport {
  products: { id: number; name: string; category: string; quantity: number; revenue: number }[];
}

export interface PaymentsReport {
  payments: Payment[];
  summary: { method: string; total: number; count: number }[];
}

export interface Refund {
  id: number;
  orderId: number;
  amount: number;
  reason: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: number;
  orderNumber: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  totalAmount: number;
  discountAmount: number;
  netTotal: number;
  createdAt: string;
  items: { id: number; productName: string; unitPrice: number; quantity: number; totalPrice: number }[];
  payments: { id: number; method: string; amount: number; status: string }[];
  refunds: { id: number; amount: number; reason: string | null; createdAt: string }[];
}

export interface StaffReportRow {
  userId: number;
  userName: string;
  totalOrders: number;
  totalSales: number;
  avgOrderValue: number;
  cashOrders: number;
  qrOrders: number;
  discountGiven: number;
  refundCount: number;
  refundAmount: number;
}

export interface ShiftReport {
  shiftId: number;
  openedAt: string;
  closedAt: string | null;
  status: 'OPEN' | 'CLOSED';
  openedBy: string;
  closedBy: string | null;
  openingCash: number;
  closingCash: number | null;
  cashSales: number;
  qrSales: number;
  totalSales: number;
  totalOrders: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  difference: number | null;
  adjustments: { id: number; type: 'IN' | 'OUT'; amount: number; reason: string | null; createdAt: string }[];
}

