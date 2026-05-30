import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Save,
    Loader2,
    Store,
    CreditCard,
    QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSettings, updateSettings, getPaymentMethods, updatePaymentMethod } from '@/lib/api';
import type { Setting, PaymentMethod } from '@/types';

export default function SettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingPayment, setSavingPayment] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, pmRes] = await Promise.all([
                getSettings(),
                getPaymentMethods(),
            ]);
            setSettings(settingsRes.settings || []);
            setPaymentMethods(pmRes.payment_methods || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateSetting = (keyName: string, value: string) => {
        setSettings((prev) =>
            prev.map((s) => (s.key_name === keyName ? { ...s, value } : s))
        );
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            const payload = settings.map((s) => ({
                key_name: s.key_name,
                value: s.value,
            }));
            await updateSettings(payload);
            toast.success('Settings saved');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleTogglePaymentMethod = async (pm: any) => {
        setSavingPayment(pm.id);
        try {
            await updatePaymentMethod(pm.id, { is_active: pm.is_active ? 0 : 1 });
            setPaymentMethods((prev) =>
                prev.map((m: any) =>
                    m.id === pm.id ? { ...m, is_active: pm.is_active ? 0 : 1 } : m
                )
            );
            toast.success(`${pm.name} ${pm.is_active ? 'disabled' : 'enabled'}`);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update payment method');
        } finally {
            setSavingPayment(null);
        }
    };

    const handleUpdatePMConfig = (pmId: number, key: string, value: string) => {
        setPaymentMethods((prev) =>
            prev.map((pm: any) => {
                if (pm.id === pmId) {
                    const newConfigs = pm.configs.map((c: any) =>
                        c.key_name === key ? { ...c, value } : c
                    );
                    return { ...pm, configs: newConfigs };
                }
                return pm;
            })
        );
    };

    const savePMConfigs = async (pm: any) => {
        setSavingPayment(pm.id);
        try {
            await updatePaymentMethod(pm.id, {
                configs: pm.configs.map((c: any) => ({
                    key_name: c.key_name,
                    value: c.value,
                })),
            });
            toast.success(`${pm.name} configuration updated`);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save configuration');
        } finally {
            setSavingPayment(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl space-y-10 pb-20 animate-pulse">
                {[0, 1].map((s) => (
                    <div key={s} className="space-y-6">
                        {/* Section header */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-pos-lg bg-pos-bg-elevated" />
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-pos-bg-elevated rounded" />
                                <div className="h-3 w-48 bg-pos-secondary-surface rounded" />
                            </div>
                        </div>
                        {/* Field rows */}
                        <div className="space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-pos-border-default">
                                    <div className="space-y-1.5">
                                        <div className="h-3.5 w-28 bg-pos-bg-elevated rounded" />
                                        <div className="h-2.5 w-44 bg-pos-secondary-surface rounded" />
                                    </div>
                                    <div className="h-9 w-48 bg-pos-bg-elevated rounded-pos-md" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-10 pb-20">
            {/* Shop Settings */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-pos-lg bg-pos-accent-primary/10 flex items-center justify-center text-pos-accent-primary">
                            <Store size={22} />
                        </div>
                        <div>
                            <h2 className="text-pos-lg font-display font-bold text-pos-text-primary">
                                Shop Settings
                            </h2>
                            <p className="text-pos-xs text-pos-text-secondary">
                                General configuration for your store
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className="flex items-center gap-2 px-4 py-2 bg-pos-accent-primary text-white rounded-pos-md text-pos-sm font-medium hover:bg-pos-accent-primary/90 transition-colors disabled:opacity-50"
                    >
                        {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>

                <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default overflow-hidden">
                    <div className="divide-y divide-pos-border-default">
                        {settings.map((s) => (
                            <div key={s.id} className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                                <div className="w-full md:w-1/3">
                                    <label className="text-pos-sm font-medium text-pos-text-primary capitalize">
                                        {s.key_name.replace(/_/g, ' ')}
                                    </label>
                                </div>
                                <div className="flex-1">
                                    {s.key_name === 'RECEIPT_FOOTER' ? (
                                        <textarea
                                            value={s.value}
                                            onChange={(e) => handleUpdateSetting(s.key_name, e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-2 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary focus:outline-none focus:border-pos-border-focus transition-colors resize-none"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={s.value}
                                            onChange={(e) => handleUpdateSetting(s.key_name, e.target.value)}
                                            className="w-full px-4 py-2 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary focus:outline-none focus:border-pos-border-focus transition-colors"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Payment Methods */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-pos-lg bg-pos-accent-success/10 flex items-center justify-center text-pos-accent-success">
                        <CreditCard size={22} />
                    </div>
                    <div>
                        <h2 className="text-pos-lg font-display font-bold text-pos-text-primary">
                            Payment Methods
                        </h2>
                        <p className="text-pos-xs text-pos-text-secondary">
                            Configure how you receive money
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {paymentMethods.map((pm: any) => (
                        <motion.div
                            key={pm.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card border border-pos-border-default overflow-hidden"
                        >
                            <div className="p-6 border-b border-pos-border-default flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-pos-md bg-pos-bg-elevated flex items-center justify-center text-pos-text-primary">
                                        {pm.code === 'QR' ? <QrCode size={24} /> : <CreditCard size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-pos-md font-bold text-pos-text-primary">{pm.name}</h3>
                                        <p className="text-pos-xs text-pos-text-secondary">Code: {pm.code}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-pos-xs text-pos-text-secondary">
                                            {pm.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <button
                                            onClick={() => handleTogglePaymentMethod(pm)}
                                            disabled={savingPayment === pm.id}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pm.is_active ? 'bg-pos-accent-success' : 'bg-pos-bg-elevated'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${pm.is_active ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {pm.configs && pm.configs.length > 0 && (
                                <div className="p-6 bg-pos-bg-primary/30 space-y-4">
                                    <h4 className="text-pos-xs font-bold text-pos-text-secondary uppercase tracking-wider">
                                        Configuration
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {pm.configs.map((c: any) => (
                                            <div key={c.id}>
                                                <label className="block text-pos-xs text-pos-text-secondary mb-1 capitalize">
                                                    {c.key_name.replace(/_/g, ' ')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={c.value}
                                                    onChange={(e) => handleUpdatePMConfig(pm.id, c.key_name, e.target.value)}
                                                    className="w-full px-3 py-2 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary focus:outline-none focus:border-pos-border-focus transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={() => savePMConfigs(pm)}
                                            disabled={savingPayment === pm.id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-pos-bg-elevated text-pos-text-primary rounded-pos-md text-pos-xs font-medium hover:bg-pos-accent-primary hover:text-white transition-all shadow-sm"
                                        >
                                            {savingPayment === pm.id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Save size={12} />
                                            )}
                                            Update Config
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
}
