import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, X, ShieldCheck, QrCode, Banknote, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../lib/cart';
import { createOrder, cashPayment, getReceipt, getQR, confirmPayment, requestPrintReceipt } from '../lib/api';
import { Receipt } from '../components/Receipt';
import { createPortal } from 'react-dom';

const QUICK_CASH = [20, 50, 100, 500, 1000];

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
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');

    const received = Number(receivedAmount);
    const change = received > netTotal ? received - netTotal : 0;
    const insufficient = received > 0 && received < netTotal;

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const handleHardwarePrint = async () => {
        try {
            if (!orderInfo?.id) return;
            const toastId = toast.loading('Sending to printer...');
            await requestPrintReceipt(orderInfo.id);
            toast.success('Sent to printer!', { id: toastId });
        } catch {
            toast.error('Printer offline. Using browser print.');
            window.print();
        }
    };

    const tryAutoPrint = async (orderId: number) => {
        try {
            const result = await requestPrintReceipt(orderId);
            if (result.autoPrint && !result.success) window.print();
        } catch {
            // Backend unreachable — skip auto-print
        }
    };

    const handleCashPayment = async () => {
        if (received < netTotal) {
            toast.error('Received amount is less than total');
            return;
        }
        setIsSubmitting(true);
        try {
            const order = await createOrder({
                items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
                discountType: discount.value > 0 ? (discount.type === 'PERCENT' ? 'PERCENT' : 'FIXED') : undefined,
                discountValue: discount.value > 0 ? discount.value : undefined,
            });
            await cashPayment(order.id, { receivedAmount: received });
            const fullOrder = await getReceipt(order.id);
            setOrderInfo({ ...fullOrder, change, receivedAmount: received });
            setShowReceipt(true);
            toast.success('Payment complete!');
            clearCart();
            tryAutoPrint(order.id);
        } catch (err: any) {
            toast.error(err.message || 'Payment failed');
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
            toast.error(err.message || 'Failed to generate QR code');
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
            toast.success('Payment confirmed!');
            clearCart();
            tryAutoPrint(orderInfo.id);
        } catch (err: any) {
            toast.error(err.message || 'Confirmation failed');
        } finally {
            setIsConfirmingQR(false);
        }
    };

    // Success screen
    if (showReceipt && orderInfo) {
        return (
            <div className="min-h-[100dvh] overflow-y-auto py-12 bg-pos-bg-primary font-body flex flex-col items-center justify-start p-6 selection:bg-pos-accent-primary/20 print:bg-white text-pos-text-primary">
                <div className="print:hidden w-full max-w-[80mm] flex flex-col gap-8 my-auto">
                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-pos-accent-success mb-6 flex justify-center"
                        >
                            <CheckCircle2 size={64} strokeWidth={1.5} />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="space-y-2"
                        >
                            <h2 className="font-display font-wght-510 text-pos-2xl text-pos-text-primary leading-none">Payment Complete</h2>
                            <p className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">
                                Order: {orderInfo.orderNumber}
                            </p>
                        </motion.div>

                        {orderInfo.change > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="mt-6 p-4 bg-pos-accent-success/10 border border-pos-accent-success/20 rounded-pos-lg"
                            >
                                <p className="text-pos-xs text-pos-accent-success font-mono uppercase tracking-widest mb-1">Change</p>
                                <p className="font-display text-pos-2xl font-bold text-pos-accent-success leading-none">
                                    ฿{orderInfo.change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="shadow-pos-dialog border border-pos-border-default rounded-pos-lg bg-pos-bg-surface overflow-hidden"
                    >
                        <Receipt order={orderInfo} />
                    </motion.div>

                    <motion.div
                        className="flex flex-col gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <button
                            onClick={handleHardwarePrint}
                            className="w-full py-3 bg-pos-bg-elevated hover:bg-black/10 text-pos-text-primary border border-pos-border-default rounded-pos-md font-body font-medium text-pos-sm transition-colors flex items-center justify-center gap-2"
                        >
                            Print Receipt
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 bg-pos-accent-primary text-white rounded-pos-md font-body font-medium text-pos-sm hover:bg-pos-accent-hover transition-colors"
                        >
                            New Order
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
            {/* Header */}
            <header className="px-6 lg:px-10 py-4 border-b border-pos-border-default flex items-center justify-between shrink-0 sticky top-0 z-10 bg-pos-bg-surface/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center justify-center w-9 h-9 rounded-pos-md text-pos-text-tertiary hover:text-pos-text-primary bg-pos-bg-elevated hover:bg-black/10 border border-pos-border-default transition-colors"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="font-display font-wght-510 text-pos-lg leading-none text-pos-text-primary">Checkout</h1>
                        <p className="text-pos-xs text-pos-text-tertiary mt-0.5">
                            {cart.length} {cart.length === 1 ? 'item' : 'items'} · ฿{netTotal.toLocaleString()}
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row max-w-[1100px] mx-auto w-full p-4 lg:p-10 gap-8 lg:items-start">
                {/* Left — Order Items */}
                <section className="flex-1 min-w-0">
                    <h2 className="font-display text-pos-base font-semibold text-pos-text-secondary mb-4 uppercase tracking-wider text-pos-xs">
                        Order Items
                    </h2>

                    {cart.length === 0 ? (
                        <div className="py-16 text-center bg-pos-bg-surface border border-pos-border-default rounded-pos-lg flex flex-col items-center gap-4">
                            <ShoppingBag size={36} className="text-pos-text-disabled" />
                            <div>
                                <p className="font-body text-pos-sm text-pos-text-secondary font-medium">Cart is empty</p>
                                <p className="font-body text-pos-xs text-pos-text-tertiary mt-1">Go back to add items</p>
                            </div>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-2 px-5 py-2 bg-pos-accent-primary text-white rounded-pos-md font-body font-medium text-pos-sm hover:bg-pos-accent-hover transition-colors"
                            >
                                Add Items
                            </button>
                        </div>
                    ) : (
                        <div className="bg-pos-bg-surface border border-pos-border-default rounded-pos-lg overflow-hidden">
                            {cart.map((item, idx) => (
                                <motion.div
                                    key={item.productId}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="flex justify-between items-center px-5 py-4 border-b border-pos-border-default last:border-0"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="font-body font-medium text-pos-sm text-pos-text-primary truncate">{item.name}</p>
                                        <p className="font-mono text-pos-xs text-pos-text-tertiary mt-0.5">
                                            {item.quantity} × ฿{item.price.toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="font-mono text-pos-sm font-semibold text-pos-text-primary shrink-0">
                                        ฿{(item.price * item.quantity).toLocaleString()}
                                    </p>
                                </motion.div>
                            ))}
                            {/* Subtotal row */}
                            <div className="flex justify-between items-center px-5 py-4 bg-pos-bg-elevated">
                                <span className="font-body text-pos-sm text-pos-text-secondary">Subtotal</span>
                                <span className="font-mono text-pos-sm font-semibold text-pos-text-primary">฿{subtotal.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Right — Payment Panel */}
                <section className="w-full lg:w-[420px] shrink-0">
                    <div className="bg-pos-bg-surface border border-pos-border-default rounded-pos-lg overflow-hidden shadow-pos-card">

                        {/* Discount */}
                        <div className="p-5 border-b border-pos-border-default space-y-3">
                            <h3 className="font-body text-pos-xs font-semibold text-pos-text-secondary uppercase tracking-wider">Discount</h3>
                            <div className="flex gap-2">
                                <div className="flex rounded-pos-md border border-pos-border-default overflow-hidden shrink-0">
                                    {(['PERCENT', 'FIXED'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setDiscount({ ...discount, type })}
                                            className={`px-3 py-2 text-pos-xs font-medium transition-colors ${discount.type === type ? 'bg-pos-accent-primary text-white' : 'text-pos-text-secondary hover:bg-pos-bg-elevated'}`}
                                        >
                                            {type === 'PERCENT' ? '%' : '฿'}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    name="discount_value"
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={discount.value === 0 ? '' : discount.value}
                                    onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                                    className="flex-1 bg-pos-bg-primary border border-pos-border-default rounded-pos-md px-3 py-2 text-pos-text-primary font-body text-pos-sm placeholder:text-pos-text-disabled focus:border-pos-border-focus focus:outline-none transition-colors"
                                />
                                {discount.value > 0 && (
                                    <button
                                        onClick={() => setDiscount({ type: 'FIXED', value: 0 })}
                                        className="p-2 rounded-pos-md text-pos-text-tertiary hover:bg-pos-bg-elevated hover:text-pos-text-primary transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="p-5 space-y-3 border-b border-pos-border-default">
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-pos-sm">
                                    <span className="text-pos-text-secondary">Discount</span>
                                    <span className="text-pos-accent-danger font-mono">-฿{discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="font-display font-semibold text-pos-lg text-pos-text-primary">Total</span>
                                <span className="font-mono text-pos-2xl font-bold text-pos-text-primary">฿{netTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment Method Tabs */}
                        <div className="flex border-b border-pos-border-default">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-pos-sm font-medium transition-colors border-b-2 ${paymentMethod === 'cash' ? 'border-pos-accent-primary text-pos-accent-primary' : 'border-transparent text-pos-text-tertiary hover:text-pos-text-primary'}`}
                            >
                                <Banknote size={16} />
                                Cash
                            </button>
                            <button
                                onClick={() => setPaymentMethod('qr')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-pos-sm font-medium transition-colors border-b-2 ${paymentMethod === 'qr' ? 'border-pos-accent-primary text-pos-accent-primary' : 'border-transparent text-pos-text-tertiary hover:text-pos-text-primary'}`}
                            >
                                <QrCode size={16} />
                                PromptPay QR
                            </button>
                        </div>

                        {/* Cash Panel */}
                        {paymentMethod === 'cash' && (
                            <div className="p-5 space-y-4">
                                {/* Received amount input */}
                                <div>
                                    <label className="block text-pos-xs font-medium text-pos-text-secondary mb-2 uppercase tracking-wider">
                                        Received Amount
                                    </label>
                                    <div className={`flex items-center bg-pos-bg-primary border rounded-pos-md px-4 transition-colors ${insufficient ? 'border-pos-accent-danger' : 'border-pos-border-default focus-within:border-pos-border-focus'}`}>
                                        <span className="text-pos-text-tertiary font-mono mr-2">฿</span>
                                        <input
                                            id="cash-received"
                                            name="cash_received"
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="0"
                                            autoComplete="off"
                                            value={receivedAmount}
                                            onChange={(e) => setReceivedAmount(e.target.value)}
                                            className="flex-1 bg-transparent py-3 font-mono text-pos-lg font-bold focus:outline-none placeholder:text-pos-text-disabled text-pos-text-primary"
                                        />
                                        {receivedAmount && (
                                            <button onClick={() => setReceivedAmount('')} className="text-pos-text-tertiary hover:text-pos-text-primary transition-colors">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Quick cash buttons */}
                                <div className="grid grid-cols-5 gap-2">
                                    {QUICK_CASH.map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => setReceivedAmount(String(amount))}
                                            className={`py-2 text-pos-xs font-mono font-semibold rounded-pos-md border transition-colors ${receivedAmount === String(amount) ? 'bg-pos-accent-primary/10 border-pos-accent-primary/30 text-pos-accent-primary' : 'bg-pos-bg-elevated border-pos-border-default text-pos-text-secondary hover:border-pos-border-focus hover:text-pos-text-primary'}`}
                                        >
                                            {amount >= 1000 ? `${amount / 1000}K` : amount}
                                        </button>
                                    ))}
                                </div>

                                {/* Change display */}
                                <AnimatePresence>
                                    {received > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            className={`flex justify-between items-center p-4 rounded-pos-md border ${insufficient ? 'bg-pos-accent-danger/5 border-pos-accent-danger/20' : 'bg-pos-accent-success/5 border-pos-accent-success/20'}`}
                                        >
                                            <span className={`text-pos-sm font-medium ${insufficient ? 'text-pos-accent-danger' : 'text-pos-accent-success'}`}>
                                                {insufficient ? 'Insufficient' : 'Change'}
                                            </span>
                                            <span className={`font-mono text-pos-xl font-bold ${insufficient ? 'text-pos-accent-danger' : 'text-pos-accent-success'}`}>
                                                {insufficient
                                                    ? `-฿${(netTotal - received).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                                                    : `฿${change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                                                }
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={handleCashPayment}
                                    disabled={cart.length === 0 || received < netTotal || isSubmitting}
                                    className="w-full py-3.5 bg-pos-accent-primary text-white rounded-pos-md font-body font-semibold text-pos-sm hover:bg-pos-accent-hover transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        )}

                        {/* QR Panel */}
                        {paymentMethod === 'qr' && (
                            <div className="p-5 space-y-4">
                                <p className="text-pos-sm text-pos-text-secondary text-center">
                                    Generate a PromptPay QR code for customer to scan.
                                </p>
                                <div className="p-4 bg-pos-bg-elevated rounded-pos-md border border-pos-border-default text-center">
                                    <p className="text-pos-xs text-pos-text-tertiary font-mono uppercase tracking-widest mb-1">Amount</p>
                                    <p className="font-mono text-pos-2xl font-bold text-pos-text-primary">฿{netTotal.toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={handleQRPayment}
                                    disabled={cart.length === 0 || isSubmitting}
                                    className="w-full py-3.5 bg-pos-accent-primary text-white rounded-pos-md font-body font-semibold text-pos-sm hover:bg-pos-accent-hover transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><QrCode size={18} /> Generate QR Code</>}
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* QR Modal */}
            <AnimatePresence>
                {qrModalOpen && qrData && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-pos-bg-surface border border-pos-border-default w-full max-w-md rounded-pos-xl shadow-pos-dialog"
                        >
                            <div className="p-5 border-b border-pos-border-default flex justify-between items-center">
                                <h3 className="font-body font-semibold text-pos-text-primary text-pos-base">QR Payment</h3>
                                <button onClick={() => setQrModalOpen(false)} className="p-1.5 rounded-pos-md text-pos-text-tertiary hover:bg-pos-bg-elevated hover:text-pos-text-primary transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-8 text-center">
                                <p className="font-body text-pos-sm text-pos-text-secondary mb-1">Scan to Pay</p>
                                <p className="font-display font-wght-510 text-pos-2xl text-pos-text-primary mb-6 tracking-tight">฿{qrData.amount.toLocaleString()}</p>

                                <div className="bg-white p-4 rounded-pos-lg shadow-pos-subtle inline-block mb-6">
                                    {qrData.qrCode.startsWith('data:image') ? (
                                        <img src={qrData.qrCode} alt="PromptPay QR" className="w-56 h-56 mx-auto mix-blend-darken" />
                                    ) : (
                                        <div className="w-56 h-56 flex items-center justify-center text-pos-text-secondary">
                                            <Loader2 className="animate-spin" size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="mb-6 font-mono text-pos-xs text-pos-text-tertiary border-y border-pos-border-default py-3">
                                    Ref: {qrData.reference}
                                </div>

                                <button
                                    onClick={handleConfirmQR}
                                    disabled={isConfirmingQR}
                                    className="w-full py-3 bg-pos-accent-primary text-white rounded-pos-md font-body font-semibold text-pos-sm hover:bg-pos-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isConfirmingQR
                                        ? <Loader2 size={18} className="animate-spin" />
                                        : <><ShieldCheck size={18} /> Confirm Payment</>
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
