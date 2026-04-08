import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Loader2,
    Users,
    Shield,
    User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers, createUser, updateUser } from '@/lib/api';
import type { User } from '@/types';

interface UserForm {
    name: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'CASHIER';
    active: boolean;
}

const emptyForm: UserForm = {
    name: '',
    email: '',
    password: '',
    role: 'CASHIER',
    active: true,
};

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<UserForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getUsers();
            setUsers(res);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const matchSearch =
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase());
            return matchSearch;
        });
    }, [users, search]);

    const openAddPanel = () => {
        setEditingId(null);
        setForm(emptyForm);
        setPanelOpen(true);
    };

    const openEditPanel = (user: User) => {
        setEditingId(user.id);
        setForm({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            active: user.active,
        });
        setPanelOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.email.trim()) {
            toast.error('Name and email are required');
            return;
        }
        if (!editingId && !form.password) {
            toast.error('Password is required for new users');
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                name: form.name.trim(),
                email: form.email.trim(),
                role: form.role,
                is_active: form.active ? 1 : 0,
            };
            if (form.password) {
                payload.password = form.password;
            }

            if (editingId) {
                await updateUser(editingId, payload);
                toast.success('User updated');
            } else {
                await createUser(payload);
                toast.success('User created');
            }
            setPanelOpen(false);
            fetchUsers();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save user');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (user: User) => {
        setTogglingId(user.id);
        try {
            await updateUser(user.id, { is_active: user.active ? 0 : 1 });
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
            );
            toast.success(`${user.name} ${user.active ? 'deactivated' : 'activated'}`);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to toggle user');
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-pos-xl font-display font-bold text-pos-text-primary">Users</h1>
                <button
                    onClick={openAddPanel}
                    className="flex items-center gap-2 px-4 py-2.5 bg-pos-accent-primary text-white rounded-pos-md text-pos-sm font-medium hover:bg-pos-accent-primary/90 transition-colors shadow-pos-float"
                >
                    <Plus size={16} />
                    เพิ่มผู้ใช้งาน
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-text-secondary"
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-4 py-2.5 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
                />
            </div>

            {/* Table */}
            <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-12 bg-pos-bg-elevated rounded animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Users size={40} className="text-pos-text-disabled" />
                        <p className="text-pos-text-secondary text-pos-sm">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-pos-xs text-pos-text-secondary uppercase tracking-wider border-b border-pos-border-default">
                                    <th className="text-left px-5 py-3 font-medium">Name</th>
                                    <th className="text-left px-5 py-3 font-medium">Role</th>
                                    <th className="text-center px-5 py-3 font-medium">Status</th>
                                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-pos-border-default">
                                {filtered.map((user, idx) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className="hover:bg-pos-bg-elevated/50 transition-colors"
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-pos-sm text-pos-text-primary font-medium">
                                                    {user.name}
                                                </span>
                                                <span className="text-pos-xs text-pos-text-secondary">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5">
                                                {user.role === 'ADMIN' ? (
                                                    <Shield size={14} className="text-pos-accent-warning" />
                                                ) : (
                                                    <UserIcon size={14} className="text-pos-accent-info" />
                                                )}
                                                <span className={`text-pos-xs font-medium ${user.role === 'ADMIN' ? 'text-pos-accent-warning' : 'text-pos-accent-info'}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                disabled={togglingId === user.id}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user.active ? 'bg-pos-accent-success' : 'bg-pos-bg-elevated'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${user.active ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => openEditPanel(user)}
                                                className="p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-accent-info hover:bg-pos-accent-info/10 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Slide-in Panel */}
            <AnimatePresence>
                {panelOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setPanelOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-pos-bg-surface border-l border-pos-border-default z-50 flex flex-col"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-pos-border-default">
                                <h2 className="text-pos-lg font-display font-semibold text-pos-text-primary">
                                    {editingId ? 'Edit User' : 'Add User'}
                                </h2>
                                <button
                                    onClick={() => setPanelOpen(false)}
                                    className="p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-text-primary hover:bg-pos-bg-elevated transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-pos-sm text-pos-text-secondary mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
                                        placeholder="Full name"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-pos-sm text-pos-text-secondary mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-pos-sm text-pos-text-secondary mb-1.5">
                                        Password {editingId && <span className="text-pos-xs opacity-50">(Leave blank to keep current)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="block text-pos-sm text-pos-text-secondary mb-1.5">Role</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setForm({ ...form, role: 'CASHIER' })}
                                            className={`px-4 py-2.5 rounded-pos-md border text-pos-sm font-medium transition-all ${form.role === 'CASHIER'
                                                    ? 'bg-pos-accent-info/10 border-pos-accent-info text-pos-accent-info'
                                                    : 'bg-pos-bg-primary border-pos-border-default text-pos-text-secondary hover:bg-pos-bg-elevated'
                                                }`}
                                        >
                                            Cashier
                                        </button>
                                        <button
                                            onClick={() => setForm({ ...form, role: 'ADMIN' })}
                                            className={`px-4 py-2.5 rounded-pos-md border text-pos-sm font-medium transition-all ${form.role === 'ADMIN'
                                                    ? 'bg-pos-accent-warning/10 border-pos-accent-warning text-pos-accent-warning'
                                                    : 'bg-pos-bg-primary border-pos-border-default text-pos-text-secondary hover:bg-pos-bg-elevated'
                                                }`}
                                        >
                                            Admin
                                        </button>
                                    </div>
                                </div>

                                {/* Active toggle */}
                                <div className="flex items-center justify-between">
                                    <label className="text-pos-sm text-pos-text-secondary">Active Status</label>
                                    <button
                                        onClick={() => setForm({ ...form, active: !form.active })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-pos-accent-success' : 'bg-pos-bg-elevated'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-pos-border-default flex gap-3">
                                <button
                                    onClick={() => setPanelOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-secondary hover:bg-pos-bg-elevated transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-pos-accent-primary text-white rounded-pos-md text-pos-sm font-medium hover:bg-pos-accent-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {saving && <Loader2 size={14} className="animate-spin" />}
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
