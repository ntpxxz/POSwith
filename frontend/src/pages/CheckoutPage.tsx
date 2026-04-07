import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Banknote, Tag, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../lib/cart';
import { createOrder, cashPayment } from '../lib/api';

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { cart, subtotal, discount, setDiscount, discountAmount, netTotal, clearCart } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [receivedAmount, setReceivedAmount] = useState<string>('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [orderInfo, setOrderInfo] = useState<any>(null);

    const change = Number(receivedAmount) > netTotal ? Number(receivedAmount) - netTotal : 0;

    const handleCashPayment = async () => {
        if (Number(receivedAmount) < netTotal) {
            toast.error('Insufficient amount received');
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

            setOrderInfo({ ...order, change, receivedAmount: Number(receivedAmount) });
            setShowReceipt(true);
            toast.success('Payment successful!');
            clearCart();
        } catch (err: any) {
            toast.error(err.message || 'Payment failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQRPayment = async () => {
        setIsSubmitting(true);
        try {
            const order = await createOrder({
                items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
                discountType: discount.value > 0 ? (discount.type === 'PERCENT' ? 'PERCENT' : 'FIXED') : undefined,
                discountValue: discount.value > 0 ? discount.value : undefined,
            });
            navigate(`/payment/qr/${order.id}`);
        } catch (err: any) {
            toast.error(err.message || 'Checkout failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showReceipt && orderInfo) {
        return (
            <div className="min-h-screen bg-pos-bg-primary flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md bg-pos-bg-surface rounded-pos-lg border border-pos-border-default p-8 text-center"
                >
                    <div className="w-16 h-16 bg-pos-accent-success/20 text-pos-accent-success rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-pos-xl font-display font-bold text-pos-text-primary mb-2">Payment Successful</h2>
                    <p className="text-pos-text-secondary mb-6">Order #{orderInfo.orderNumber}</p>

                    <div className="bg-pos-bg-elevated/50 rounded-pos-md p-4 mb-6 text-left space-y-2">
                        <div className="flex justify-between">
                            <span className="text-pos-text-secondary">Total Amount</span>
                            <span className="font-bold">฿{netTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-pos-text-secondary">Cash Received</span>
                            <span className="font-bold">฿{orderInfo.receivedAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-pos-border-default text-pos-accent-success">
                            <span className="font-bold">Total Change</span>
                            <span className="font-bold">฿{orderInfo.change.toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-pos-accent-primary text-white rounded-pos-lg font-bold hover:shadow-pos-float transition-all"
                    >
                        Back to Sales
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pos-bg-primary text-pos-text-primary flex flex-col font-sans">
            <header className="h-16 flex items-center px-6 border-b border-pos-border-default bg-pos-bg-surface shrink-0">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 -ml-2 text-pos-text-secondary hover:text-pos-text-primary transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-display font-bold text-pos-md uppercase tracking-widest">
                    Checkout Summary
                </h1>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-hidden flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 lg:p-8 gap-8">
                {/* Left: Order Items */}
                <section className="flex-1 flex flex-col bg-pos-bg-surface rounded-pos-lg border border-pos-border-default overflow-hidden">
                    <div className="p-4 border-b border-pos-border-default bg-pos-bg-elevated/30">
                        <h2 className="font-bold text-pos-sm flex items-center gap-2">
                            Order Items ({cart.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {cart.length === 0 ? (
                            <p className="text-center text-pos-text-disabled py-12">Your cart is empty.</p>
                        ) : (
                            cart.map(item => (
                                <div key={item.productId} className="flex justify-between items-center bg-pos-bg-primary/30 p-3 rounded-pos-md border border-pos-border-default">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-pos-sm">{item.name}</h4>
                                        <p className="text-pos-xs text-pos-text-secondary">฿{item.price.toLocaleString()} x {item.quantity}</p>
                                    </div>
                                    <p className="font-bold">฿{(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Right: Summary & Payment */}
                <section className="w-full lg:w-[450px] space-y-6">
                    {/* Summary Card */}
                    <div className="bg-pos-bg-surface rounded-pos-lg border border-pos-border-default p-6 space-y-4 shadow-pos-card">
                        <h2 className="font-bold text-pos-md border-b border-pos-border-default pb-2">Final Total</h2>

                        <div className="space-y-2">
                            <div className="flex justify-between text-pos-sm text-pos-text-secondary">
                                <span>Subtotal</span>
                                <span>฿{subtotal.toLocaleString()}</span>
                            </div>

                            {/* Discount Input */}
                            <div className="bg-pos-bg-elevated/50 p-4 rounded-pos-md border border-pos-border-default">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-pos-xs font-bold text-pos-accent-info">
                                        <Tag size={14} />
                                        <span>APPLY DISCOUNT</span>
                                    </div>
                                    <div className="flex bg-pos-bg-surface rounded px-1 py-1 border border-pos-border-default">
                                        <button
                                            onClick={() => setDiscount({ ...discount, type: 'PERCENT' })}
                                            className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all ${discount.type === 'PERCENT' ? 'bg-pos-accent-primary text-white shadow-sm' : 'text-pos-text-secondary'}`}
                                        >
                                            %
                                        </button>
                                        <button
                                            onClick={() => setDiscount({ ...discount, type: 'FIXED' })}
                                            className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all ${discount.type === 'FIXED' ? 'bg-pos-accent-primary text-white shadow-sm' : 'text-pos-text-secondary'}`}
                                        >
                                            ฿
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={discount.value === 0 ? '' : discount.value}
                                        onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                                        className="flex-1 bg-pos-bg-surface border border-pos-border-default rounded-pos-md px-3 py-2 text-pos-sm focus:outline-none focus:border-pos-accent-primary"
                                    />
                                    <button
                                        onClick={() => setDiscount({ type: 'FIXED', value: 0 })}
                                        className="p-2 text-pos-text-secondary hover:text-pos-accent-danger transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between text-pos-sm text-pos-accent-danger">
                                <span>Discount Amount</span>
                                <span>-฿{discountAmount.toLocaleString()}</span>
                            </div>

                            <div className="pt-4 border-t border-pos-border-default flex justify-between items-baseline">
                                <span className="font-bold text-pos-lg">NET TOTAL</span>
                                <span className="font-display font-bold text-pos-4xl text-pos-accent-primary">฿{netTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Select */}
                    <div className="space-y-4">
                        <h3 className="text-pos-xs font-bold text-pos-text-secondary uppercase tracking-widest pl-2">Select Payment Method</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* QR Mode (Button) */}
                            <button
                                onClick={handleQRPayment}
                                disabled={cart.length === 0 || isSubmitting}
                                className="h-28 flex flex-col items-center justify-center gap-2 bg-pos-bg-surface border-2 border-pos-accent-info/30 rounded-pos-lg text-pos-accent-info hover:bg-pos-accent-info/10 transition-all font-bold group"
                            >
                                <div className="p-3 bg-pos-accent-info/20 rounded-full group-hover:scale-110 transition-transform">
                                    <CreditCard size={28} />
                                </div>
                                <span>QR PAYMENT</span>
                            </button>

                            {/* Cash Mode (Show input) */}
                            <div className="h-28 flex flex-col items-center justify-center gap-2 bg-pos-bg-surface border-2 border-pos-accent-success/30 rounded-pos-lg text-pos-accent-success group p-2">
                                <Banknote size={24} />
                                <span className="text-pos-xs font-bold">CASH RECEIVED</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={receivedAmount}
                                    onChange={(e) => setReceivedAmount(e.target.value)}
                                    className="w-full bg-pos-bg-primary border border-pos-border-default rounded px-2 py-1 text-center text-pos-sm focus:outline-none focus:border-pos-accent-success"
                                />
                            </div>
                        </div>

                        {/* Cash Confirm Button */}
                        {Number(receivedAmount) > 0 && (
                            <motion.button
                                layout
                                onClick={handleCashPayment}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-pos-accent-success text-white rounded-pos-lg font-bold shadow-pos-float hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col items-center"
                            >
                                <span className="text-pos-md uppercase tracking-wider">Complete Cash Sale</span>
                                <span className="text-pos-xs opacity-80">Change: ฿{change.toLocaleString()}</span>
                            </motion.button>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
