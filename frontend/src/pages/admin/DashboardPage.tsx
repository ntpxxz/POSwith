import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Trophy, RefreshCw } from 'lucide-react';
import { getDashboard } from '@/lib/api';
import type { DashboardData } from '@/types';

const PIE_COLORS = ['#FF6B35', '#10D98A', '#4FC3F7', '#F5A623', '#FF4757'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PAID: { bg: 'bg-pos-accent-success/10', text: 'text-pos-accent-success' },
  COMPLETED: { bg: 'bg-pos-accent-success/10', text: 'text-pos-accent-success' },
  PENDING: { bg: 'bg-white/5', text: 'text-pos-text-secondary' },
  CANCELLED: { bg: 'bg-pos-accent-danger/10', text: 'text-pos-accent-danger' },
  REFUNDED: { bg: 'bg-pos-accent-warning/10', text: 'text-pos-accent-warning' },
};

function formatBaht(n: number): string {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkeletonCard() {
  return (
    <div className="bg-white/5 rounded-pos-lg shadow-pos-subtle p-6 animate-pulse border border-white/10">
      <div className="h-4 w-24 bg-white/10 rounded mb-3" />
      <div className="h-8 w-32 bg-white/10 rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-[#191a1b] rounded-pos-xl shadow-pos-subtle p-6 animate-pulse h-80 border border-pos-border-default">
      <div className="h-4 w-40 bg-white/10 rounded mb-4" />
      <div className="h-full bg-white/10 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-pos-accent-danger text-pos-md">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-pos-accent-primary text-white rounded-pos-md hover:bg-pos-accent-primary/90 transition-colors"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const topProduct = data?.topProducts?.[0];

  const kpiCards = [
    {
      label: 'Today Sales',
      value: data ? formatBaht(data.todaySales) : '-',
      icon: DollarSign,
      color: 'text-[#0071e3]',
    },
    {
      label: 'Today Orders',
      value: data ? data.todayOrders.toString() : '-',
      icon: ShoppingCart,
      color: 'text-[#0071e3]',
    },
    {
      label: 'Avg Order Value',
      value: data ? formatBaht(data.averageOrderValue) : '-',
      icon: TrendingUp,
      color: 'text-pos-accent-success',
    },
    {
      label: 'Top Product',
      value: topProduct?.name || '-',
      icon: Trophy,
      color: 'text-pos-accent-warning',
      sub: topProduct ? `${topProduct.quantity} sold` : '',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpiCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-[#191a1b] rounded-pos-xl shadow-pos-subtle p-6 border border-pos-border-default hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-body text-pos-xs font-semibold text-pos-text-secondary uppercase tracking-wide">{card.label}</span>
                <card.icon size={20} className={card.color} />
              </div>
              <p className="font-mono text-pos-2xl font-bold tracking-tight text-pos-text-primary">
                {card.value}
              </p>
              {card.sub && (
                <p className="font-mono text-pos-xs text-pos-text-tertiary mt-2">{card.sub}</p>
              )}
            </motion.div>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : (
          <>
            {/* Sales by Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-[#191a1b] rounded-pos-xl shadow-pos-subtle p-6 border border-pos-border-default"
            >
              <h3 className="font-body font-wght-510 text-pos-lg text-pos-text-primary tracking-tight mb-6">
                Sales by Payment Method
              </h3>
              {data?.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.paymentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" vertical={false} />
                    <XAxis dataKey="method" tick={{ fill: '#86868b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#86868b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#191a1b',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#f7f8f8',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontWeight: 400,
                      }}
                      formatter={(value: number) => [formatBaht(value), 'Total']}
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="total" fill="#0071e3" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-[var(--color-text-tertiary)] text-[var(--text-sm)]">
                  No payment data available
                </div>
              )}
            </motion.div>

            {/* Payment Breakdown Pie */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="bg-[#191a1b] rounded-pos-xl shadow-pos-subtle p-6 border border-pos-border-default"
            >
              <h3 className="font-body font-wght-510 text-pos-lg text-pos-text-primary tracking-tight mb-6">
                Payment Breakdown
              </h3>
              {data?.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.paymentBreakdown}
                      dataKey="total"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={2}
                      label={({ method, percent }) =>
                        `${method} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {data.paymentBreakdown.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#191a1b',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#f7f8f8',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontWeight: 400,
                      }}
                      formatter={(value: number) => [formatBaht(value), 'Total']}
                    />
                    <Legend
                      wrapperStyle={{ color: '#86868b', fontSize: 12, fontWeight: 500 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-[var(--color-text-tertiary)] text-[var(--text-sm)]">
                  No payment data available
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-[#191a1b] rounded-pos-xl shadow-pos-subtle overflow-hidden border border-pos-border-default"
      >
        <div className="p-6 border-b border-pos-border-default">
          <h3 className="font-body font-wght-510 text-pos-lg text-pos-text-primary tracking-tight">
            Recent Orders
          </h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-[var(--color-light-gray)] rounded animate-pulse" />
            ))}
          </div>
        ) : data?.recentOrders && data.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest border-b border-pos-border-default bg-white/5">
                  <th className="text-left px-6 py-4 font-semibold">#</th>
                  <th className="text-left px-6 py-4 font-semibold">Time</th>
                  <th className="text-left px-6 py-4 font-semibold">Items</th>
                  <th className="text-right px-6 py-4 font-semibold">Total</th>
                  <th className="text-left px-6 py-4 font-semibold">Method</th>
                  <th className="text-left px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border-default">
                {data.recentOrders.map((order) => {
                  const status = order.status || 'PENDING';
                  const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-pos-sm text-pos-text-primary font-medium">
                        {order.orderNumber || order.id}
                      </td>
                      <td className="px-6 py-4 font-mono text-pos-sm text-pos-text-secondary">
                        {new Date(order.createdAt).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-pos-sm text-pos-text-secondary">
                        {order.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 font-mono text-pos-sm text-pos-text-primary text-right font-medium tabular-nums">
                        {formatBaht(order.netTotal || 0)}
                      </td>
                      <td className="px-6 py-4 font-body text-pos-sm text-pos-text-secondary">
                        {order.payment?.method || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${colors.bg} ${colors.text}`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-pos-text-tertiary text-pos-sm">
            No recent orders
          </div>
        )}
      </motion.div>
    </div>
  );
}
