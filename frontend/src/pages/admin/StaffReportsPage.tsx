import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getStaffReport } from '@/lib/api';
import { format, subDays } from 'date-fns';
import { Calendar, RefreshCw, ArrowLeft, Download, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function StaffReportsPage() {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState({
        from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });
    const [loading, setLoading] = useState(true);
    const [staffData, setStaffData] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getStaffReport(dateRange);
            setStaffData((res as any).staff || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load staff report data');
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

    const exportCSV = () => {
        if (!staffData.length) { toast.error('No staff data to export'); return; }
        const headers = ['Staff Name', 'Total Orders', 'Cash Orders', 'QR Orders', 'Total Sales (฿)', 'Avg Order Value (฿)', 'Discounts Given (฿)', 'Refunds'];
        const rows = staffData.map((s: any) => [
            `"${s.userName}"`,
            s.totalOrders,
            s.cashOrders,
            s.qrOrders,
            s.totalSales.toFixed(2),
            s.avgOrderValue.toFixed(2),
            s.discountGiven.toFixed(2),
            s.refundCount,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `staff-report_${dateRange.from}_${dateRange.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV downloaded');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/reports')} className="p-2 hover:bg-white/10 rounded-pos-md text-pos-text-secondary transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-pos-xl font-display font-bold text-pos-text-primary">Staff Performance</h1>
                        <p className="text-pos-xs text-pos-text-secondary">Track cashier sales and operations</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
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
                        title="Export staff performance to CSV"
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

            {/* Table */}
            <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default overflow-hidden">
                <div className="p-5 border-b border-pos-border-default flex items-center gap-2">
                    <Users size={18} className="text-pos-text-secondary" />
                    <h3 className="text-pos-md font-display font-semibold text-pos-text-primary">Cashier Metrics</h3>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                         <div className="p-8 text-center text-pos-text-tertiary">Loading...</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="text-pos-xs text-pos-text-secondary uppercase tracking-wider border-b border-pos-border-default">
                                    <th className="text-left px-6 py-4 font-medium">Cashier Name</th>
                                    <th className="text-right px-6 py-4 font-medium">Orders (Cash/QR)</th>
                                    <th className="text-right px-6 py-4 font-medium">Avg Order Value</th>
                                    <th className="text-right px-6 py-4 font-medium">Discounts Given</th>
                                    <th className="text-right px-6 py-4 font-medium">Refunds</th>
                                    <th className="text-right px-6 py-4 font-medium">Total Sales</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-pos-border-default">
                                {staffData.map((staff, idx) => (
                                    <tr key={idx} className="hover:bg-pos-bg-elevated/30 transition-colors">
                                        <td className="px-6 py-4 text-pos-sm text-pos-text-primary font-medium">{staff.userName}</td>
                                        <td className="px-6 py-4 text-pos-sm text-pos-text-secondary text-right">
                                            {staff.totalOrders} <span className="text-pos-xs text-pos-text-tertiary">({staff.cashOrders}/{staff.qrOrders})</span>
                                        </td>
                                        <td className="px-6 py-4 text-pos-sm text-pos-text-secondary text-right">{formatBaht(staff.avgOrderValue)}</td>
                                        <td className="px-6 py-4 text-pos-sm text-pos-accent-danger text-right">{staff.discountGiven > 0 ? `-${formatBaht(staff.discountGiven)}` : '-'}</td>
                                        <td className="px-6 py-4 text-pos-sm text-pos-text-secondary text-right">{staff.refundCount > 0 ? staff.refundCount : '-'}</td>
                                        <td className="px-6 py-4 text-pos-sm text-pos-accent-success text-right font-mono font-bold">{formatBaht(staff.totalSales)}</td>
                                    </tr>
                                ))}
                                {staffData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-pos-text-disabled text-pos-sm">
                                            No staff data found in this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
