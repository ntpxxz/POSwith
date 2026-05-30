import { useEffect, useState, useCallback } from 'react';
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
    LineChart,
    Line,
} from 'recharts';
import {
    Calendar,
    Download,
    TrendingUp,
    Package,
    CreditCard,
    RefreshCw,
    Users,
} from 'lucide-react';
import { getSalesReport, getProductsReport, getPaymentsReport } from '@/lib/api';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


const COLORS = ['#FF6B35', '#10D98A', '#4FC3F7', '#F5A623', '#FF4757', '#9D50BB'];

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState({
        from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });
    const [loading, setLoading] = useState(true);
    const [salesData, setSalesData] = useState<any>(null);
    const [productsData, setProductsData] = useState<any[]>([]);
    const [paymentsData, setPaymentsData] = useState<any>(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sales, products, payments] = await Promise.all([
                getSalesReport(dateRange),
                getProductsReport(dateRange),
                getPaymentsReport(dateRange),
            ]);
            setSalesData(sales);
            setProductsData((products as any).products || []);
            setPaymentsData(payments);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const formatBaht = (n: number) =>
        `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleQuickRange = (days: number) => {
        setDateRange({
            from: format(subDays(new Date(), days), 'yyyy-MM-dd'),
            to: format(new Date(), 'yyyy-MM-dd'),
        });
    };

    const exportCSV = useCallback(() => {
        if (!productsData.length) { toast.error('No product data to export'); return; }
        const headers = ['Product', 'Category', 'Orders', 'Sold Qty', 'Revenue (฿)'];
        const rows = productsData.map((p: any) => [
            `"${p.product_name}"`,
            `"${p.category ?? ''}"`  ,
            p.order_count,
            p.total_quantity,
            p.total_sales.toFixed(2),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-report_${dateRange.from}_${dateRange.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV downloaded');
    }, [productsData, dateRange]);


    if (loading && !salesData) {
        return (
            <div className="space-y-6 pb-12 animate-pulse">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-6 w-24 bg-black/10 rounded" />
                        <div className="h-3 w-48 bg-black/5 rounded" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-32 bg-black/10 rounded-pos-md" />
                        <div className="h-9 w-56 bg-black/10 rounded-pos-md" />
                        <div className="h-9 w-9 bg-black/10 rounded-pos-md" />
                    </div>
                </div>
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="bg-pos-bg-surface rounded-pos-lg border border-pos-border-default p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-black/10" />
                                <div className="h-3 w-20 bg-black/10 rounded" />
                            </div>
                            <div className="h-8 w-36 bg-black/10 rounded" />
                        </div>
                    ))}
                </div>
                {/* Line chart */}
                <div className="bg-pos-bg-surface rounded-pos-lg border border-pos-border-default p-6 space-y-4">
                    <div className="h-4 w-28 bg-black/10 rounded" />
                    <div className="h-80 bg-black/5 rounded-pos-md" />
                </div>
                {/* Two charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[0, 1].map((i) => (
                        <div key={i} className="bg-pos-bg-surface rounded-pos-lg border border-pos-border-default p-6 space-y-4">
                            <div className="h-4 w-32 bg-black/10 rounded" />
                            <div className="h-72 bg-black/5 rounded-pos-md" />
                        </div>
                    ))}
                </div>
                {/* Product table */}
                <div className="bg-pos-bg-surface rounded-pos-lg border border-pos-border-default overflow-hidden">
                    <div className="p-5 border-b border-pos-border-default">
                        <div className="h-4 w-44 bg-black/10 rounded" />
                    </div>
                    <div className="p-6 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="h-4 flex-1 bg-black/10 rounded" />
                                <div className="h-4 w-20 bg-black/10 rounded" />
                                <div className="h-4 w-12 bg-black/5 rounded" />
                                <div className="h-4 w-12 bg-black/5 rounded" />
                                <div className="h-4 w-24 bg-black/10 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-pos-xl font-display font-bold text-pos-text-primary">Reports</h1>
                    <p className="text-pos-xs text-pos-text-secondary">Track your business performance</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Staff Reports shortcut */}
                    <button
                        onClick={() => navigate('/admin/staff-reports')}
                        className="flex items-center gap-2 px-3 py-2 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-xs text-pos-text-secondary hover:text-pos-text-primary hover:border-pos-border-focus transition-colors"
                    >
                        <Users size={14} />
                        Staff Reports
                    </button>
                    <div className="flex bg-pos-bg-surface border border-pos-border-default rounded-pos-md p-1">
                        {[7, 30, 90].map((days) => (
                            <button
                                key={days}
                                onClick={() => handleQuickRange(days)}
                                className="px-3 py-1.5 text-pos-xs font-medium rounded-pos-sm transition-colors hover:bg-pos-bg-elevated text-pos-text-secondary"
                            >
                                {days}D
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-pos-bg-surface border border-pos-border-default rounded-pos-md px-3 py-2">
                        <Calendar size={14} className="text-pos-text-secondary" />
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="bg-transparent text-pos-xs text-pos-text-primary focus:outline-none"
                        />
                        <span className="text-pos-text-disabled mx-1">→</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="bg-transparent text-pos-xs text-pos-text-primary focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={exportCSV}
                        title="Export products to CSV"
                        className="p-2.5 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-text-secondary hover:text-pos-accent-success transition-colors"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-text-secondary hover:text-pos-accent-primary transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5 border border-pos-border-default">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded bg-pos-accent-primary/10 text-pos-accent-primary">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-pos-sm text-pos-text-secondary">Total Sales</span>
                    </div>
                    <p className="font-display text-pos-2xl font-bold text-pos-accent-primary">
                        {formatBaht(salesData?.summary?.total_sales || 0)}
                    </p>
                </div>
                <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5 border border-pos-border-default">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded bg-pos-accent-info/10 text-pos-accent-info">
                            <TrendingUp size={18} style={{ transform: 'scaleX(-1)' }} />
                        </div>
                        <span className="text-pos-sm text-pos-text-secondary">Orders</span>
                    </div>
                    <p className="font-display text-pos-2xl font-bold text-pos-accent-info">
                        {(salesData?.summary?.total_orders || 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card p-5 border border-pos-border-default">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded bg-pos-accent-success/10 text-pos-accent-success">
                            <CreditCard size={18} />
                        </div>
                        <span className="text-pos-sm text-pos-text-secondary">Avg. Order Value</span>
                    </div>
                    <p className="font-display text-pos-2xl font-bold text-pos-accent-success">
                        {formatBaht(salesData?.summary?.avg_order_value || 0)}
                    </p>
                </div>
            </div>

            {/* Charts Row 1: Daily Sales Line Chart */}
            <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default p-6">
                <h3 className="text-pos-md font-display font-semibold text-pos-text-primary mb-6">Sales Trend</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesData?.daily || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                tickFormatter={(val) => format(new Date(val), 'dd MMM')}
                            />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => `฿${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy')}
                                formatter={(val: number) => [formatBaht(val), 'Sales']}
                            />
                            <Line
                                type="monotone"
                                dataKey="total_sales"
                                stroke="#FF6B35"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#FF6B35' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Breakdown Pie */}
                <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default p-6">
                    <h3 className="text-pos-md font-display font-semibold text-pos-text-primary mb-6">Payment Methods</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentsData?.breakdown || []}
                                    dataKey="total_amount"
                                    nameKey="method"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                >
                                    {(paymentsData?.breakdown || []).map((_: any, idx: number) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val: number) => [formatBaht(val), 'Total']}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products Horizontal Bar Chart */}
                <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default p-6">
                    <h3 className="text-pos-md font-display font-semibold text-pos-text-primary mb-6">Product Performance</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={productsData.slice(0, 8)}
                                margin={{ left: 40 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="product_name"
                                    type="category"
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val: number) => [val.toLocaleString(), 'Sold']}
                                />
                                <Bar dataKey="total_quantity" fill="#10D98A" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Product Detailed Table */}
            <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default overflow-hidden">
                <div className="p-5 border-b border-pos-border-default flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package size={18} className="text-pos-text-secondary" />
                        <h3 className="text-pos-md font-display font-semibold text-pos-text-primary">Detailed Product Sales</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-pos-xs text-pos-text-secondary uppercase tracking-wider border-b border-pos-border-default">
                                <th className="text-left px-6 py-4 font-medium">Product</th>
                                <th className="text-left px-6 py-4 font-medium">Category</th>
                                <th className="text-right px-6 py-4 font-medium">Orders</th>
                                <th className="text-right px-6 py-4 font-medium">Sold Qty</th>
                                <th className="text-right px-6 py-4 font-medium">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-pos-border-default">
                            {productsData.map((p, idx) => (
                                <tr key={idx} className="hover:bg-pos-bg-elevated/30 transition-colors">
                                    <td className="px-6 py-4 text-pos-sm text-pos-text-primary font-medium">{p.product_name}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 rounded-full text-pos-[10px] bg-pos-bg-elevated text-pos-text-secondary">
                                            {p.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-pos-sm text-pos-text-secondary text-right">{p.order_count}</td>
                                    <td className="px-6 py-4 text-pos-sm text-pos-text-secondary text-right">{p.total_quantity}</td>
                                    <td className="px-6 py-4 text-pos-sm text-pos-text-primary text-right font-mono">{formatBaht(p.total_sales)}</td>
                                </tr>
                            ))}
                            {productsData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-pos-text-disabled text-pos-sm">
                                        No product sales found in this period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
