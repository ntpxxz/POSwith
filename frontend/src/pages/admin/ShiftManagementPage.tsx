import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Lock,
    Unlock,
} from 'lucide-react';
import { getShifts, getCashAdjustments } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ShiftManagementPage() {
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState<any>(null);
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loadingAdjustments, setLoadingAdjustments] = useState(false);

    const fetchShifts = async () => {
        setLoading(true);
        try {
            const res = await getShifts();
            setShifts(res || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load shifts');
        } finally {
            setLoading(false);
        }
    };

    const fetchAdjustments = async (shiftId: number) => {
        setLoadingAdjustments(true);
        try {
            const res = await getCashAdjustments(shiftId);
            setAdjustments(res || []);
        } catch (err: any) {
            toast.error('Failed to load adjustments');
        } finally {
            setLoadingAdjustments(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const handleSelectShift = (shift: any) => {
        setSelectedShift(shift);
        fetchAdjustments(shift.id);
    };

    const formatBaht = (n: number) =>
        `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
            {/* Shifts List (Left Panel) */}
            <div className="w-full lg:w-1/3 flex flex-col bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default overflow-hidden">
                <div className="p-4 border-b border-pos-border-default flex items-center justify-between bg-pos-bg-elevated/20">
                    <h2 className="font-display font-bold text-pos-md text-pos-text-primary">All Shifts</h2>
                    <span className="text-pos-xs text-pos-text-secondary">{shifts.length} total</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-pos-border-default">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-pos-bg-elevated rounded animate-pulse" />
                            ))}
                        </div>
                    ) : shifts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-pos-text-disabled">
                            <Clock size={40} className="mb-2 opacity-20" />
                            <p className="text-pos-sm">No shifts recorded</p>
                        </div>
                    ) : (
                        shifts.map((shift) => (
                            <button
                                key={shift.id}
                                onClick={() => handleSelectShift(shift)}
                                className={`w-full p-5 text-left transition-all hover:bg-pos-bg-elevated/50 flex items-center justify-between group ${selectedShift?.id === shift.id ? 'bg-pos-bg-elevated border-l-4 border-l-pos-accent-primary' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-pos-md ${shift.status === 'OPEN' ? 'bg-pos-accent-success/10 text-pos-accent-success' : 'bg-pos-bg-elevated text-pos-text-disabled'}`}>
                                        {shift.status === 'OPEN' ? <Unlock size={18} /> : <Lock size={18} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-pos-sm font-bold text-pos-text-primary">
                                                Shift #{shift.id}
                                            </span>
                                            {shift.status === 'OPEN' && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-pos-accent-success text-white text-[10px] uppercase font-bold animate-pulse">
                                                    Open
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-pos-xs text-pos-text-secondary flex items-center gap-2">
                                            <span>{format(new Date(shift.opened_at), 'dd MMM HH:mm')}</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className={`text-pos-text-disabled transition-transform ${selectedShift?.id === shift.id ? 'translate-x-1' : ''}`} />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Shift Detail (Right Panel) */}
            <div className="hidden lg:flex flex-1 flex-col bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default overflow-hidden">
                {selectedShift ? (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* Detail Header */}
                        <div className="p-6 border-b border-pos-border-default bg-pos-bg-elevated/10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-pos-xl font-display font-bold text-pos-text-primary mb-2">
                                        Shift #{selectedShift.id}
                                    </h2>
                                    <div className="flex flex-wrap gap-4 text-pos-xs text-pos-text-secondary">
                                        <div className="flex items-center gap-1.5">
                                            <Unlock size={14} className="text-pos-accent-success" />
                                            <span>Opened at: {format(new Date(selectedShift.opened_at), 'dd MMM yyyy, HH:mm:ss')}</span>
                                        </div>
                                        {selectedShift.closed_at && (
                                            <div className="flex items-center gap-1.5">
                                                <Lock size={14} className="text-pos-accent-danger" />
                                                <span>Closed at: {format(new Date(selectedShift.closed_at), 'dd MMM yyyy, HH:mm:ss')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-pos-sm font-bold ${selectedShift.status === 'OPEN' ? 'bg-pos-accent-success/20 text-pos-accent-success' : 'bg-pos-bg-elevated text-pos-text-secondary'}`}>
                                    {selectedShift.status}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto space-y-8">
                            {/* Cash Summary */}
                            <div>
                                <h3 className="text-pos-xs font-bold text-pos-text-secondary uppercase tracking-widest mb-4">Financial Summary</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-pos-md bg-pos-bg-primary/50 border border-pos-border-default">
                                        <span className="block text-pos-[10px] text-pos-text-secondary mb-1">Opening Cash</span>
                                        <span className="text-pos-md font-bold text-pos-text-primary">{formatBaht(selectedShift.opening_cash)}</span>
                                    </div>
                                    <div className="p-4 rounded-pos-md bg-pos-bg-primary/50 border border-pos-border-default">
                                        <span className="block text-pos-[10px] text-pos-text-secondary mb-1">Closing Cash</span>
                                        <span className="text-pos-md font-bold text-pos-text-primary">
                                            {selectedShift.closing_cash !== null ? formatBaht(selectedShift.closing_cash) : '-'}
                                        </span>
                                    </div>
                                    {/* These fields might need backend support to calculate actual vs expected */}
                                    <div className="p-4 rounded-pos-md bg-pos-accent-success/5 border border-pos-accent-success/20">
                                        <span className="block text-pos-[10px] text-pos-accent-success mb-1">Total Sales</span>
                                        <span className="text-pos-md font-bold text-pos-accent-success">
                                            {selectedShift.totalSales !== undefined ? formatBaht(selectedShift.totalSales) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-pos-md bg-pos-bg-primary/50 border border-pos-border-default">
                                        <span className="block text-pos-[10px] text-pos-text-secondary mb-1">Difference</span>
                                        <span className={`text-pos-md font-bold ${selectedShift.difference < 0 ? 'text-pos-accent-danger' : 'text-pos-text-primary'}`}>
                                            {selectedShift.difference !== undefined ? formatBaht(selectedShift.difference) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Adjustments */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-pos-xs font-bold text-pos-text-secondary uppercase tracking-widest">Cash Adjustments</h3>
                                </div>
                                <div className="bg-pos-bg-primary/30 rounded-pos-md border border-pos-border-default overflow-hidden">
                                    {loadingAdjustments ? (
                                        <div className="p-10 flex justify-center">
                                            <Loader2 size={24} className="text-pos-accent-primary animate-spin" />
                                        </div>
                                    ) : adjustments.length === 0 ? (
                                        <div className="p-10 text-center text-pos-text-disabled text-pos-sm italic">
                                            No adjustments in this shift
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead className="bg-pos-bg-elevated/30">
                                                <tr className="text-pos-[10px] text-pos-text-secondary uppercase font-bold">
                                                    <th className="text-left px-4 py-3">Type</th>
                                                    <th className="text-left px-4 py-3">Reason</th>
                                                    <th className="text-right px-4 py-3">Amount</th>
                                                    <th className="text-right px-4 py-3">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-pos-border-default">
                                                {adjustments.map((adj) => (
                                                    <tr key={adj.id} className="text-pos-sm">
                                                        <td className="px-4 py-3">
                                                            <div className={`flex items-center gap-1.5 font-bold ${adj.type === 'IN' ? 'text-pos-accent-success' : 'text-pos-accent-danger'}`}>
                                                                {adj.type === 'IN' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                                                {adj.type}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-pos-text-secondary">{adj.reason || '-'}</td>
                                                        <td className={`px-4 py-3 text-right font-mono font-bold ${adj.type === 'IN' ? 'text-pos-accent-success' : 'text-pos-accent-danger'}`}>
                                                            {adj.type === 'IN' ? '+' : '-'}{formatBaht(adj.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-pos-xs text-pos-text-secondary">
                                                            {format(new Date(adj.created_at), 'HH:mm:ss')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-pos-text-disabled">
                        <Clock size={64} className="mb-4 opacity-10" />
                        <p className="text-pos-base">Select a shift to view details</p>
                    </div>
                )}
            </div>

            {/* Mobile Placeholder (Simplified List) */}
            <div className="lg:hidden flex-1 flex flex-col items-center justify-center text-pos-text-disabled p-10 text-center">
                <p>Switch to a larger screen to view shift details</p>
            </div>
        </div>
    );
}
