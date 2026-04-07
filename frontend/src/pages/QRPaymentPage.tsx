import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getQR, confirmPayment, getOrderById } from '@/lib/api';
import type { Order } from '@/types';

function formatPrice(n: number): string {
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QRPaymentPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [qrData, setQrData] = useState<{ qrCode: string; reference: string; amount: number; expiresAt: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!orderId) return;
            setLoading(true);
            try {
                const [o, q] = await Promise.all([
                    getOrderById(Number(orderId)),
                    getQR(Number(orderId))
                ]);
                setOrder(o);
                setQrData(q);

                // Calculate initial time left
                const expiry = new Date(q.expiresAt).getTime();
                const now = new Date().getTime();
                const diff = Math.max(0, Math.floor((expiry - now) / 1000));
                setTimeLeft(diff);
                if (diff <= 0) setExpired(true);
            } catch (err: any) {
                toast.error(err.message || 'Failed to initialize payment');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orderId]);

    useEffect(() => {
        if (timeLeft <= 0 || expired) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setExpired(true);
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft, expired]);

    const handleConfirm = async () => {
        if (!orderId) return;
        setConfirming(true);
        try {
            await confirmPayment(Number(orderId));
            toast.success('Payment confirmed successfully');
            // Show success state briefly then navigate
            setTimeout(() => navigate('/'), 1500);
        } catch (err: any) {
            toast.error(err.message || 'Failed to confirm payment');
        } finally {
            setConfirming(false);
        }
    };

    const handleRefreshQR = async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const q = await getQR(Number(orderId));
            setQrData(q);
            setTimeLeft(300);
            setExpired(false);
            toast.success('QR Code refreshed');
        } catch (err: any) {
            toast.error('Failed to refresh QR Code');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-pos-bg-primary flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-pos-accent-primary" />
            </div>
        );
    }

    if (!qrData || !order) {
        return (
            <div className="min-h-screen bg-pos-bg-primary flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle size={64} className="text-pos-accent-danger mb-4" />
                <h2 className="text-pos-xl font-display font-bold text-pos-text-primary mb-2">Error Loading Payment</h2>
                <p className="text-pos-text-secondary mb-6">We couldn't load the payment information. Please try again.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-pos-accent-primary hover:bg-pos-accent-primary/90 text-white rounded-pos-md flex items-center gap-2"
                >
                    <ChevronLeft size={18} /> Back to POS
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pos-bg-primary flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-pos-bg-surface border border-pos-border-default rounded-pos-xl shadow-pos-modal overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-pos-border-default flex items-center justify-between bg-pos-bg-elevated/30">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-text-primary hover:bg-pos-bg-elevated transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-display font-bold text-pos-md text-pos-text-primary">PromptPay QR</span>
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-accent-danger hover:bg-pos-bg-elevated transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 flex flex-col items-center">
                    <div className="mb-6 text-center">
                        <p className="text-pos-sm text-pos-text-secondary uppercase tracking-widest mb-1 font-medium">Order Amount</p>
                        <h2 className="text-pos-hero font-display font-bold text-pos-accent-primary leading-none">
                            ฿{formatPrice(qrData.amount)}
                        </h2>
                    </div>

                    <div className="relative p-6 bg-white rounded-pos-lg shadow-pos-card mb-6">
                        <QRCodeSVG
                            value={qrData.qrCode}
                            size={220}
                            level="M"
                            includeMargin
                        />
                        <AnimatePresence>
                            {expired && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-white/90 rounded-pos-lg flex flex-col items-center justify-center p-4 text-center"
                                >
                                    <AlertCircle size={48} className="text-pos-accent-danger mb-3" />
                                    <p className="text-gray-900 font-bold text-pos-md mb-4">QR Code Expired</p>
                                    <button
                                        onClick={handleRefreshQR}
                                        className="px-6 py-2 bg-pos-accent-primary text-white rounded-pos-full font-bold shadow-pos-float flex items-center gap-2"
                                    >
                                        <RefreshCw size={18} /> Refresh QR
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="w-full space-y-4">
                        <div className="flex items-center justify-between text-pos-sm">
                            <span className="text-pos-text-secondary">Reference:</span>
                            <span className="text-pos-text-primary font-mono font-bold tracking-wider">{qrData.reference}</span>
                        </div>

                        {/* Timer Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-pos-xs font-bold uppercase tracking-wider">
                                <span className={timeLeft < 60 ? 'text-pos-accent-warning' : 'text-pos-text-secondary'}>
                                    {timeLeft < 60 ? 'Hurry up!' : 'Waiting for payment'}
                                </span>
                                <span className={timeLeft < 30 ? 'text-pos-accent-danger font-mono' : 'text-pos-text-primary font-mono'}>
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-pos-bg-elevated rounded-full overflow-hidden">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        width: `${(timeLeft / 300) * 100}%`,
                                        backgroundColor: timeLeft < 30 ? '#FF4757' : timeLeft < 60 ? '#F5A623' : '#10D98A'
                                    }}
                                    className="h-full"
                                />
                            </div>
                        </div>

                        <p className="text-pos-xs text-pos-text-secondary text-center px-4 leading-relaxed italic">
                            Ask the customer to scan this QR code with their banking app. Then press the button below to confirm.
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-pos-bg-elevated/30 border-t border-pos-border-default">
                    <button
                        onClick={handleConfirm}
                        disabled={confirming || expired}
                        className="w-full h-16 bg-pos-accent-success text-pos-bg-primary rounded-pos-lg font-bold text-pos-md flex items-center justify-center gap-3 shadow-pos-float hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                    >
                        {confirming ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 size={24} />
                                Confirm Payment Received
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
