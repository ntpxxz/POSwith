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
  PAID: { bg: 'bg-pos-accent-success/15', text: 'text-pos-accent-success' },
  COMPLETED: { bg: 'bg-pos-accent-success/15', text: 'text-pos-accent-success' },
  PENDING: { bg: 'bg-pos-bg-elevated', text: 'text-pos-text-secondary' },
  CANCELLED: { bg: 'bg-pos-accent-danger/15', text: 'text-pos-accent-danger' },
  REFUNDED: { bg: 'bg-pos-accent-warning/15', text: 'text-pos-accent-warning' },
};

function formatBaht(n: number): string {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkeletonCard() {
  return (
    <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5 animate-pulse">
      <div className="h-4 w-24 bg-pos-bg-elevated rounded mb-3" />
      <div className="h-8 w-32 bg-pos-bg-elevated rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5 animate-pulse h-80">
      <div className="h-4 w-40 bg-pos-bg-elevated rounded mb-4" />
      <div className="h-full bg-pos-bg-elevated rounded" />
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
      color: 'text-pos-accent-primary',
    },
    {
      label: 'Today Orders',
      value: data ? data.todayOrders.toString() : '-',
      icon: ShoppingCart,
      color: 'text-pos-accent-info',
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpiCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-pos-sm text-pos-text-secondary">{card.label}</span>
                  <card.icon size={18} className={card.color} />
                </div>
                <p className={`font-display text-pos-2xl font-bold ${card.color}`}>
                  {card.value}
                </p>
                {card.sub && (
                  <p className="text-pos-xs text-pos-text-secondary mt-1">{card.sub}</p>
                )}
              </motion.div>
            ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5"
            >
              <h3 className="text-pos-md font-display font-semibold text-pos-text-primary mb-4">
                Sales by Payment Method
              </h3>
              {data?.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.paymentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2E4A" />
                    <XAxis dataKey="method" tick={{ fill: '#A0A0B8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#A0A0B8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#252540',
                        border: '1px solid #2E2E4A',
                        borderRadius: '10px',
                        color: '#F5F5F0',
                      }}
                      formatter={(value: number) => [formatBaht(value), 'Total']}
                    />
                    <Bar dataKey="total" fill="#FF6B35" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-pos-text-secondary text-pos-sm">
                  No payment data available
                </div>
              )}
            </motion.div>

            {/* Payment Breakdown Pie */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5"
            >
              <h3 className="text-pos-md font-display font-semibold text-pos-text-primary mb-4">
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
                      label={({ method, percent }) =>
                        `${method} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {data.paymentBreakdown.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#252540',
                        border: '1px solid #2E2E4A',
                        borderRadius: '10px',
                        color: '#F5F5F0',
                      }}
                      formatter={(value: number) => [formatBaht(value), 'Total']}
                    />
                    <Legend
                      wrapperStyle={{ color: '#A0A0B8', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-pos-text-secondary text-pos-sm">
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
        className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card overflow-hidden"
      >
        <div className="p-5 border-b border-pos-border-default">
          <h3 className="text-pos-md font-display font-semibold text-pos-text-primary">
            Recent Orders
          </h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-pos-bg-elevated rounded animate-pulse" />
            ))}
          </div>
        ) : data?.recentOrders && data.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-pos-xs text-pos-text-secondary uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">#</th>
                  <th className="text-left px-5 py-3 font-medium">Time</th>
                  <th className="text-left px-5 py-3 font-medium">Items</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                  <th className="text-left px-5 py-3 font-medium">Method</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border-default">
                {data.recentOrders.map((order) => {
                  const status = order.status || 'PENDING';
                  const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-pos-bg-elevated/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-pos-sm text-pos-text-primary font-mono">
                        {order.orderNumber || order.id}
                      </td>
                      <td className="px-5 py-3 text-pos-sm text-pos-text-secondary">
                        {new Date(order.createdAt).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3 text-pos-sm text-pos-text-secondary">
                        {order.items?.length || 0}
                      </td>
                      <td className="px-5 py-3 text-pos-sm text-pos-text-primary text-right font-mono">
                        {formatBaht(order.netTotal || 0)}
                      </td>
                      <td className="px-5 py-3 text-pos-sm text-pos-text-secondary">
                        {order.payment?.method || '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-pos-xs font-medium ${colors.bg} ${colors.text}`}
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
          <div className="flex items-center justify-center h-32 text-pos-text-secondary text-pos-sm">
            No recent orders
          </div>
        )}
      </motion.div>
    </div>
  );
}
