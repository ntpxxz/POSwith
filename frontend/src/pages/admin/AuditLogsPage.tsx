import { useEffect, useState } from 'react';
import {
    FileText,
    Filter,
    User as UserIcon,
    ChevronLeft,
    ChevronRight,
    Database,
    History,
} from 'lucide-react';
import { getAuditLogs } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (actionFilter) params.action = actionFilter;
            if (entityFilter) params.entity = entityFilter;

            const res = await getAuditLogs(params);
            setLogs((res as any).audit_logs || []);
            setTotalPages((res as any).pagination?.total_pages || 1);
        } catch (err: any) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, entityFilter]);

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'text-pos-accent-success bg-pos-accent-success/10';
        if (action.includes('UPDATE')) return 'text-pos-accent-info bg-pos-accent-info/10';
        if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('TOGGLE')) return 'text-pos-accent-danger bg-pos-accent-danger/10';
        if (action.includes('LOGIN')) return 'text-pos-accent-primary bg-pos-accent-primary/10';
        return 'text-pos-text-secondary bg-pos-bg-elevated';
    };

    const getEntityIcon = (entity: string) => {
        switch (entity) {
            case 'product': return <Database size={12} />;
            case 'user': return <UserIcon size={12} />;
            case 'order': return <FileText size={12} />;
            case 'setting': return <History size={12} />;
            default: return <FileText size={12} />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-pos-xl font-display font-bold text-pos-text-primary">Audit Logs</h1>
                <p className="text-pos-xs text-pos-text-secondary">System-wide activity trail</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-text-secondary" />
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary appearance-none cursor-pointer focus:outline-none focus:border-pos-border-focus"
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE_PRODUCT">Create Product</option>
                        <option value="UPDATE_PRODUCT">Update Product</option>
                        <option value="DELETE_PRODUCT">Delete Product</option>
                        <option value="CREATE_USER">Create User</option>
                        <option value="UPDATE_USER">Update User</option>
                        <option value="LOGIN">Login</option>
                        <option value="UPDATE_SETTINGS">Update Settings</option>
                    </select>
                </div>
                <div className="relative">
                    <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-text-secondary" />
                    <select
                        value={entityFilter}
                        onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary appearance-none cursor-pointer focus:outline-none focus:border-pos-border-focus"
                    >
                        <option value="">All Entities</option>
                        <option value="product">Product</option>
                        <option value="user">User</option>
                        <option value="order">Order</option>
                        <option value="settings">Settings</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-pos-border-default animate-pulse">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4">
                                <div className="h-3 w-32 bg-pos-bg-elevated rounded shrink-0" />
                                <div className="h-5 w-20 bg-pos-bg-elevated rounded-full shrink-0" />
                                <div className="h-3 flex-1 bg-pos-bg-elevated rounded" />
                                <div className="h-3 w-24 bg-pos-secondary-surface rounded shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center gap-3">
                        <History size={48} className="text-pos-text-disabled opacity-20" />
                        <p className="text-pos-text-secondary text-pos-sm">No logs found matching your criteria</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-pos-xs text-pos-text-secondary uppercase tracking-wider border-b border-pos-border-default text-left">
                                    <th className="px-6 py-4 font-medium">Timestamp</th>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Action</th>
                                    <th className="px-6 py-4 font-medium">Entity</th>
                                    <th className="px-6 py-4 font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-pos-border-default">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-pos-bg-elevated/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-pos-sm text-pos-text-primary">
                                                    {format(new Date(log.created_at), 'dd MMM yyyy')}
                                                </span>
                                                <span className="text-pos-xs text-pos-text-secondary">
                                                    {format(new Date(log.created_at), 'HH:mm:ss')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-pos-bg-elevated flex items-center justify-center text-pos-text-secondary">
                                                    <UserIcon size={14} />
                                                </div>
                                                <span className="text-pos-sm text-pos-text-primary">{log.user_name || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getActionColor(log.action)}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-pos-xs text-pos-text-secondary capitalize">
                                                {getEntityIcon(log.entity)}
                                                <span>{log.entity || '-'}</span>
                                                {log.entity_id && (
                                                    <span className="text-pos-text-disabled">#{log.entity_id}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs truncate text-pos-xs text-pos-text-secondary" title={log.payload}>
                                                {log.payload || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="p-4 border-t border-pos-border-default flex items-center justify-between bg-pos-bg-elevated/10">
                    <div className="text-pos-xs text-pos-text-secondary">
                        Page {page} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="p-1.5 rounded-pos-md border border-pos-border-default text-pos-text-secondary hover:bg-pos-bg-elevated disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            className="p-1.5 rounded-pos-md border border-pos-border-default text-pos-text-secondary hover:bg-pos-bg-elevated disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
