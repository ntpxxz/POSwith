import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, X, ShieldCheck, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../lib/cart';
import { createOrder, cashPayment, getReceipt, getQR, confirmPayment, requestPrintReceipt } from '../lib/api';
import { Receipt } from '../components/Receipt';
import { createPortal } from 'react-dom';

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { cart, subtotal, discount, setDiscount, discountAmount, netTotal, clearCart } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [receivedAmount, setReceivedAmount] = useState<string>('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [orderInfo, setOrderInfo] = useState<any>(null);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrData, setQrData] = useState<any>(null);
    const [isConfirmingQR, setIsConfirmingQR] = useState(false);

    const change = Number(receivedAmount) > netTotal ? Number(receivedAmount) - netTotal : 0;

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const handleHardwarePrint = async () => {
        try {
            if (!orderInfo?.id) return;
            const toastId = toast.loading('Sending to physical printer...');
            await requestPrintReceipt(orderInfo.id);
            toast.success('Print command sent to ESC/POS device successfully!', { id: toastId });
        } catch (err) {
            toast.error('Hardware offline or error. Using browser fallback.');
            window.print();
        }
    };

    const handleCashPayment = async () => {
        if (Number(receivedAmount) < netTotal) {
            toast.error('Insufficient tender');
            return;
        }

        setIsSubmitting(true);
        try {
            const order = await createOrder({
                items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
                discountType: discount.value > 0 ? (discount.type === 'PERCENT' ? 'PERCENT' : 'FIXED') : undefined,
                discountValue: discount.value > 0 ? discount.value : undefined,
            });

            await cashPayment(order.id, { receivedAmount: Number(receivedAmount) });
            const fullOrder = await getReceipt(order.id);

            setOrderInfo({ ...fullOrder, change, receivedAmount: Number(receivedAmount) });
            setShowReceipt(true);
            toast.success('Funds Secured.');
            clearCart();
            setTimeout(() => window.print(), 800);
        } catch (err: any) {
            toast.error(err.message || 'Transaction failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQRPayment = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            const order = await createOrder({
                items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
                discountType: discount.value > 0 ? (discount.type === 'PERCENT' ? 'PERCENT' : 'FIXED') : undefined,
                discountValue: discount.value > 0 ? discount.value : undefined,
            });

            const qr = await getQR(order.id);
            setOrderInfo(order);
            setQrData(qr);
            setQrModalOpen(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate secure QR');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmQR = async () => {
        if (!orderInfo) return;
        setIsConfirmingQR(true);
        try {
            await confirmPayment(orderInfo.id);
            const fullOrder = await getReceipt(orderInfo.id);
            setOrderInfo(fullOrder);
            setQrModalOpen(false);
            setShowReceipt(true);
            toast.success('Digital signature verified');
            clearCart();
            setTimeout(() => window.print(), 800);
        } catch (err: any) {
            toast.error(err.message || 'Verification failed');
        } finally {
            setIsConfirmingQR(false);
        }
    };

    // Success Screen: Editorial Resolution
    if (showReceipt && orderInfo) {
        return (
            <div className="min-h-[100dvh] overflow-y-auto py-12 bg-pos-bg-primary font-body flex flex-col items-center justify-start p-6 selection:bg-pos-accent-primary/20 print:bg-white text-pos-text-primary">
                <div className="print:hidden w-full max-w-[80mm] flex flex-col gap-8 my-auto">
                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-pos-accent-primary mb-8 flex justify-center"
                        >
                            <CheckCircle2 size={72} strokeWidth={1.5} />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-4"
                        >
                            <h2 className="font-display font-wght-510 text-pos-3xl text-pos-text-primary leading-none">Order Signed</h2>
                            <p className="font-mono text-pos-sm text-pos-text-tertiary uppercase tracking-widest">
                                Manifest: {orderInfo.orderNumber}
                            </p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="shadow-pos-dialog border border-white/10 rounded-pos-lg bg-pos-bg-surface overflow-hidden"
                    >
                        <Receipt order={orderInfo} />
                    </motion.div>

                    <motion.div
                        className="flex flex-col gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <button
                            onClick={handleHardwarePrint}
                            className="w-full py-3 bg-white/10 hover:bg-white/15 text-pos-text-primary border border-pos-border-default rounded-pos-md font-body font-medium text-pos-sm transition-colors flex items-center justify-center gap-2"
                        >
                            Print Receipt
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-pos-text-primary border border-pos-border-default rounded-pos-md font-body font-medium text-pos-sm transition-colors"
                        >
                            Back to Terminal
                        </button>
                    </motion.div>
                </div>

                {createPortal(
                    <div id="print-root" className="hidden print:block">
                        <Receipt order={orderInfo} />
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pos-bg-primary text-pos-text-primary flex flex-col font-body selection:bg-pos-accent-primary/20">
            <header className="px-10 pt-12 pb-6 border-b border-pos-border-default flex items-end justify-between shrink-0 sticky top-0 z-10 bg-pos-bg-primary">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="group w-10 h-10 flex items-center justify-center -ml-2 mr-4 rounded-full text-pos-text-tertiary hover:text-pos-text-primary bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h2 className="text-pos-xs font-mono tracking-widest uppercase text-pos-text-tertiary mb-1">
                            Checkout Protocol
                        </h2>
                        <h1 className="font-display font-wght-510 text-pos-2xl leading-none text-pos-text-primary">
                            Final Review
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row max-w-[1100px] mx-auto w-full p-6 lg:p-12 gap-16 lg:items-start">
                <section className="flex-1 space-y-8">
                    <div className="pb-4">
                        <h2 className="font-display text-pos-xl font-wght-510 text-pos-text-primary tracking-tight">The Manifest</h2>
                    </div>

                    <div className="space-y-0 border-t border-pos-border-default">
                        {cart.length === 0 ? (
                            <div className="py-20 text-center bg-pos-bg-surface border-x border-b border-pos-border-default">
                                <p className="font-body text-pos-sm text-pos-text-tertiary">No items in the manifest.</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <motion.div
                                    key={item.productId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex justify-between items-center py-6 border-b border-pos-border-default"
                                >
                                    <div className="flex-1 min-w-0 pr-6">
                                        <h4 className="font-body font-semibold text-pos-lg text-pos-text-primary leading-tight mb-2">{item.name}</h4>
                                        <p className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">Qty: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-pos-lg font-bold text-pos-text-primary leading-none">฿{(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                <section className="w-full lg:w-[480px] space-y-10">
                    <div className="bg-pos-bg-surface p-8 rounded-pos-lg shadow-pos-card space-y-8 relative">

                        <div className="pb-2">
                            <h2 className="font-display text-pos-xl font-wght-510 text-pos-text-primary tracking-tight text-center">Settlement</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between font-mono text-pos-sm text-pos-text-secondary uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span>฿{subtotal.toLocaleString()}</span>
                            </div>

                            <div className="py-6 border-y border-pos-border-default space-y-6">
                                <div className="flex items-center justify-between font-mono text-pos-xs text-pos-text-secondary uppercase tracking-widest">
                                    <span>Discount Protocol</span>
                                    <div className="flex gap-2">
                                        {['PERCENT', 'FIXED'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setDiscount({ ...discount, type: type as any })}
                                                className={`px-3 py-1 font-medium transition-all border rounded-pos-sm ${discount.type === type ? 'bg-white/10 text-pos-text-primary border-pos-accent-violet' : 'bg-transparent border-white/5 text-pos-text-tertiary hover:border-white/10'}`}
                                            >
                                                {type === 'PERCENT' ? '%' : 'FIXED'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <input
                                        name="discount_value"
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="0.00"
                                        value={discount.value === 0 ? '' : discount.value}
                                        onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-pos-md px-4 py-2.5 text-pos-text-primary font-body text-pos-sm placeholder:text-pos-text-tertiary focus:border-pos-border-focus focus:outline-none transition-colors"
                                    />
                                    <button
                                        onClick={() => setDiscount({ type: 'FIXED', value: 0 })}
                                        className="p-2.5 rounded-pos-md text-pos-text-tertiary hover:bg-pos-bg-elevated hover:text-pos-text-primary transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex justify-between font-mono text-pos-sm text-pos-accent-danger tracking-widest">
                                    <span>Relief Applied</span>
                                    <span>-฿{discountAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between items-end">
                                <span className="font-body font-medium text-pos-lg text-pos-text-primary">Total Due</span>
                                <span className="font-mono text-pos-2xl font-bold text-pos-text-primary leading-none">฿{netTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-pos-border-default space-y-6">
                            <h3 className="font-body font-medium text-pos-xs text-pos-text-tertiary uppercase tracking-widest text-center">Select Tender Method</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleQRPayment}
                                    disabled={cart.length === 0 || isSubmitting}
                                    className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-pos-md text-pos-text-primary hover:bg-white/10 transition-colors font-body font-medium disabled:opacity-50"
                                >
                                    <QrCode size={24} className="text-pos-text-tertiary group-hover:text-pos-text-primary transition-colors" />
                                    <span className="text-pos-sm">Scan QR</span>
                                </button>

                                <div className="flex flex-col items-center justify-center gap-2 p-3 bg-[#08090a] border border-white/5 shadow-pos-subtle rounded-pos-md focus-within:border-pos-border-focus transition-colors relative">
                                    <span className="font-body font-medium text-pos-xs text-pos-text-secondary">Cash Tender</span>
                                    <input
                                        id="cash-received"
                                        name="cash_received"
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        autoComplete="off"
                                        value={receivedAmount}
                                        onChange={(e) => setReceivedAmount(e.target.value)}
                                        className="w-full bg-transparent border-0 p-0 text-center font-mono text-pos-lg font-bold focus:outline-none placeholder:text-pos-border-default"
                                    />
                                </div>
                            </div>

                            <AnimatePresence>
                                {Number(receivedAmount) > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        onClick={handleCashPayment}
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-pos-accent-primary text-white rounded-pos-md font-body font-medium text-pos-sm transition-colors hover:bg-pos-accent-hover flex flex-col items-center gap-1 disabled:opacity-50"
                                    >
                                        <span>Issue Tender</span>
                                        <span className="font-mono text-pos-xs opacity-70">Return: ฿{change.toLocaleString()}</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </section>

            </main>

            <AnimatePresence>
                {qrModalOpen && qrData && (
                    <div className="fixed inset-0 bg-pos-espresso/90 backdrop-blur-md z-50 flex items-center justify-center p-6 print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#191a1b] border border-pos-border-default w-full max-w-md rounded-pos-xl shadow-pos-dialog"
                        >
                            <div className="p-5 border-b border-pos-border-default flex justify-between items-center">
                                <h3 className="font-body font-semibold text-pos-text-primary text-pos-base">Secure Transfer</h3>
                                <button onClick={() => setQrModalOpen(false)} className="p-1 px-2 rounded-pos-sm text-pos-text-tertiary hover:bg-pos-bg-elevated hover:text-pos-text-primary transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-10 text-center">
                                <p className="font-body text-pos-sm text-pos-text-secondary font-medium mb-2">Awaiting Funds</p>
                                <p className="font-display font-wght-510 text-pos-2xl text-pos-text-primary mb-8 tracking-tight">฿{qrData.amount.toLocaleString()}</p>

                                <div className="bg-white p-4 rounded-pos-md shadow-pos-subtle inline-block mb-10">
                                    {qrData.qrCode.startsWith('data:image') ? (
                                        <img src={qrData.qrCode} alt="Secure QR" className="w-64 h-64 mx-auto mix-blend-darken" />
                                    ) : (
                                        <div className="w-64 h-64 bg-pos-border-default flex items-center justify-center text-pos-text-secondary">
                                            <Loader2 className="animate-spin" size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="mb-8 font-mono text-pos-sm text-pos-text-secondary border-y border-pos-border-default py-4">
                                    Ref: {qrData.reference}
                                </div>

                                <button
                                    onClick={handleConfirmQR}
                                    disabled={isConfirmingQR}
                                    className="w-full py-3 bg-pos-accent-primary text-white rounded-pos-md font-body font-medium text-pos-sm hover:bg-pos-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isConfirmingQR ? <Loader2 size={24} className="animate-spin flex-shrink-0" /> : <><ShieldCheck size={20} className="flex-shrink-0" /> <span>Validate Signature</span></>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
