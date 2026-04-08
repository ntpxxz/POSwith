import React from 'react';
import { Coffee } from 'lucide-react';
import { Order } from '../types';

interface ReceiptProps {
    order: Order & {
        shopName?: string;
        receiptFooter?: string;
        cashierName?: string;
        taxPercent?: number;
    };
}

/**
 * Editorial Espresso Receipt Component
 * Redesigned for raw, print-like aesthetic
 * Optimized to fit securely within 80mm thermal width (~302px)
 */
export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ order }, ref) => {
    const getFormattedDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
            date: new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric'
            }).format(d),
            time: new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(d)
        };
    };

    const formattedDate = getFormattedDate(order.createdAt);
    const taxPercent = order.taxPercent || 0;
    const taxAmount = (order.netTotal * taxPercent) / (100 + taxPercent);

    return (
        <div
            ref={ref}
            className="px-5 py-6 bg-white text-black font-mono w-[80mm] max-w-full mx-auto print:m-0 print:w-full overflow-hidden relative border-2 border-black print:border-0 print:p-0 break-words"
        >
            {/* Header: Pure Typography */}
            <div className="text-center mb-6 border-b-[1.5px] border-black pb-5">
                <div className="inline-flex items-center justify-center w-8 h-8 border-[1.5px] border-black rounded-full mb-3 text-black">
                    <Coffee size={16} strokeWidth={2} />
                </div>
                <h1 className="font-display text-pos-xl text-black uppercase leading-none italic mb-1.5 tracking-tight">
                    {order.shopName || 'THE DAILY GRIND.'}
                </h1>
                <p className="font-mono text-[9px] text-[#8a8f98] uppercase tracking-widest">
                    Record of Transaction
                </p>
            </div>

            {/* Order Info */}
            <div className="space-y-1.5 mb-5 lowercase text-[11px] border-b-[1.5px] border-black border-dashed pb-4">
                <div className="flex justify-between items-baseline">
                    <span className="font-mono tracking-widest font-bold">Ref No.</span>
                    <span className="truncate ml-4">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="font-mono tracking-widest font-bold">Dated</span>
                    <span>{formattedDate.date} {formattedDate.time}</span>
                </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4 mb-6 border-b-[1.5px] border-black border-dashed pb-5">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="font-body font-bold text-[13px] leading-tight text-black mb-0.5">
                                {item.productName}
                            </p>
                            <p className="font-mono text-[9px] text-[#8a8f98] uppercase tracking-widest">
                                Qty: {item.quantity} × {item.unitPrice.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right font-mono font-bold text-[13px]">
                            ฿{(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Totals Section */}
            <div className="space-y-1.5 mb-6">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-[#8a8f98]">
                    <span>Subtotal</span>
                    <span>฿{(order.totalAmount - order.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {taxPercent > 0 && (
                    <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-[#8a8f98]">
                        <span>Tax ({taxPercent}%)</span>
                        <span>฿{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                )}
                {order.discountAmount > 0 && (
                    <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-red-500">
                        <span>Relief Applied</span>
                        <span>-฿{order.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                )}

                <div className="flex justify-between items-baseline pt-3 mt-3 border-t-[1.5px] border-black">
                    <span className="font-display italic text-pos-lg text-black leading-none">Total Due</span>
                    <span className="font-mono text-pos-xl font-bold tracking-tighter leading-none">
                        ฿{order.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="text-center pt-5 border-t-[1.5px] border-black">
                <p className="font-mono text-[9px] text-[#8a8f98] uppercase tracking-widest mb-4">Authentic Document</p>
                <div className="font-display text-pos-base italic text-black leading-snug mb-5 px-2 text-balance">
                    "{order.receiptFooter || 'Thank you for your patronage.'}"
                </div>

                {/* Conceptual Barcode Area */}
                <div className="flex flex-col items-center opacity-70">
                    <div className="flex items-end gap-[2px] h-8 mb-2">
                        {[2, 4, 1, 3, 2, 5, 1, 2, 4, 2, 3, 1, 4, 2, 1, 5, 2, 3, 1, 4, 2].map((h, i) => (
                            <div key={i} className="bg-black w-[2px]" style={{ height: `${h * 6}px` }} />
                        ))}
                    </div>
                    <p className="font-mono text-[7px] uppercase tracking-[0.3em]">End of Record</p>
                </div>
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';
