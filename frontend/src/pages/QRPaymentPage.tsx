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
import { getQR, confirmPayment, getOrderById, getReceipt } from '@/lib/api';
import type { Order } from '@/types';
import { Receipt } from '@/components/Receipt';
import { useRef } from 'react';
import { createPortal } from 'react-dom';

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
    const [showSuccess, setShowSuccess] = useState(false);
    const [orderInfo, setOrderInfo] = useState<any>(null);

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
            const fullOrder = await getReceipt(Number(orderId));
            setOrderInfo(fullOrder);
            setShowSuccess(true);
            toast.success('Payment confirmed successfully');

            // Auto print
            setTimeout(() => {
                window.print();
            }, 500);
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
                <Loader2 size={32} className="animate-spin text-pos-text-primary" />
            </div>
        );
    }

    if (showSuccess && orderInfo) {
        return (
            <div className="min-h-screen bg-pos-bg-primary flex flex-col items-center justify-center p-6 selection:bg-pos-accent-primary/20">
                <div className="no-print w-full max-w-sm flex flex-col gap-12 font-body">
                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-pos-text-primary mb-8 flex justify-center"
                        >
                            <CheckCircle2 size={72} strokeWidth={1} />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-2"
                        >
                            <h2 className="font-display font-wght-510 text-pos-2xl text-pos-text-primary leading-none">Order complete</h2>
                            <p className="font-mono text-pos-xs text-pos-text-tertiary">Receipt Number: {orderInfo.orderNumber}</p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-[#191a1b] rounded-pos-xl shadow-pos-dialog overflow-hidden border border-pos-border-default"
                    >
                        <div className="max-h-[50vh] overflow-y-auto">
                            <Receipt order={orderInfo} />
                        </div>
                    </motion.div>

                    <motion.div
                        className="flex flex-col gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <button
                            onClick={() => window.print()}
                            className="w-full py-4 bg-white/10 text-pos-text-primary border border-pos-border-default rounded-pos-md font-medium text-pos-sm transition-colors flex items-center justify-center gap-2 hover:bg-white/15"
                        >
                            Print Receipt
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-4 text-pos-text-secondary hover:text-pos-text-primary font-medium text-pos-sm transition-colors"
                        >
                            Back to Register
                        </button>
                    </motion.div>
                </div>

                {createPortal(
                    <div id="print-root">
                        <Receipt order={orderInfo} />
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    if (!qrData || !order) {
        return (
            <div className="min-h-screen bg-pos-bg-primary flex flex-col items-center justify-center p-6 text-center font-body">
                <AlertCircle size={48} className="text-pos-accent-danger mb-4" />
                <h2 className="font-display font-wght-510 text-pos-xl text-pos-text-primary mb-2">Error</h2>
                <p className="text-pos-text-tertiary mb-8 text-pos-sm">We couldn't load the payment information.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-3 bg-white/10 border border-white/20 text-pos-text-primary rounded-pos-md hover:bg-white/15 transition-colors font-medium text-pos-sm"
                >
                    Back to Register
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pos-bg-primary flex flex-col items-center justify-center p-4 font-body selection:bg-pos-accent-primary/20">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[400px] bg-[#0f1011] border border-pos-border-default rounded-pos-xl shadow-pos-dialog overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-pos-border-default flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-pos-text-tertiary hover:text-pos-text-primary transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="font-body text-pos-base font-semibold text-pos-text-primary tracking-tight">PromptPay</span>
                    <button
                        onClick={() => navigate('/')}
                        className="text-pos-text-tertiary hover:text-pos-text-primary transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 flex flex-col items-center">
                    <div className="mb-8 text-center">
                        <p className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest mb-2 font-medium">Total Amount</p>
                        <h2 className="font-display text-pos-3xl font-wght-510 text-pos-text-primary tracking-tight">
                            ฿{formatPrice(qrData.amount)}
                        </h2>
                    </div>

                    <div className="relative p-6 bg-white rounded-pos-lg border border-pos-border-default mb-8 flex items-center justify-center">
                        {qrData.qrCode.startsWith('data:') ? (
                            <img
                                src={qrData.qrCode}
                                alt="Payment QR Code"
                                className="w-[180px] h-[180px]"
                            />
                        ) : (
                            <QRCodeSVG
                                value={qrData.qrCode}
                                size={180}
                                level="M"
                                includeMargin
                            />
                        )}
                        <AnimatePresence>
                            {expired && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-pos-bg-primary/95 rounded-pos-md flex flex-col items-center justify-center p-4 text-center"
                                >
                                    <AlertCircle size={32} className="text-pos-accent-danger mb-4" />
                                    <p className="text-pos-text-primary font-bold text-pos-base mb-6">Payment Expired</p>
                                    <button
                                        onClick={handleRefreshQR}
                                        className="h-10 px-6 bg-pos-accent-primary text-white rounded-pos-md font-medium text-pos-sm transition-colors hover:bg-pos-accent-hover"
                                    >
                                        Refresh Code
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="w-full space-y-6">
                        <div className="flex items-center justify-between text-pos-xs font-mono">
                            <span className="text-pos-text-tertiary uppercase tracking-widest">Reference</span>
                            <span className="text-pos-text-primary font-bold tracking-widest">{qrData.reference}</span>
                        </div>

                        {/* Timer */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-pos-nano font-mono font-medium uppercase tracking-widest">
                                <span className={timeLeft < 60 ? 'text-pos-accent-danger' : 'text-pos-text-tertiary'}>
                                    {timeLeft < 60 ? 'Hurry' : 'Waiting'}
                                </span>
                                <span className="text-pos-text-primary">
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        width: `${(timeLeft / 300) * 100}%`,
                                        backgroundColor: timeLeft < 60 ? '#ef4444' : '#f7f8f8'
                                    }}
                                    className="h-full"
                                />
                            </div>
                        </div>

                        <p className="text-pos-nano text-pos-text-tertiary text-center px-4 leading-relaxed text-pretty">
                            Please use your banking app to scan the code. Confirm once done.
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-[#08090a] border-t border-pos-border-default">
                    <button
                        onClick={handleConfirm}
                        disabled={confirming || expired}
                        className="w-full h-12 bg-pos-accent-primary text-white rounded-pos-md font-medium text-pos-sm flex items-center justify-center gap-2 hover:bg-pos-accent-hover transition-colors disabled:opacity-40"
                    >
                        {confirming ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            'Confirm Payment'
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
