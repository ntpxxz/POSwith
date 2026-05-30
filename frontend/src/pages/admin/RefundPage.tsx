import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RotateCcw, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminOrders, createRefund } from '@/lib/api';
import type { AdminOrder } from '@/types';

function formatPrice(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status: AdminOrder['status']) {
  const map: Record<string, string> = {
    COMPLETED: 'bg-pos-accent-success/10 text-pos-accent-success border-pos-accent-success/20',
    REFUNDED: 'bg-pos-accent-warning/10 text-pos-accent-warning border-pos-accent-warning/20',
    PENDING: 'bg-pos-accent-info/10 text-pos-accent-info border-pos-accent-info/20',
    CANCELLED: 'bg-pos-accent-danger/10 text-pos-accent-danger border-pos-accent-danger/20',
  };
  return map[status] ?? 'bg-pos-bg-elevated text-pos-text-tertiary border-pos-border-default';
}

export default function RefundPage() {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alreadyRefunded = selected
    ? selected.refunds.reduce((sum, r) => sum + r.amount, 0)
    : 0;
  const remaining = selected ? Math.round((selected.netTotal - alreadyRefunded) * 100) / 100 : 0;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await getAdminOrders({ search: search.trim(), status: 'COMPLETED' });
      setOrders(res.orders);
      setTotalFound(res.pagination.total);
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOrder = (order: AdminOrder) => {
    setSelected(order);
    setRefundAmount('');
    setRefundReason('');
  };

  const handleCloseModal = () => {
    setSelected(null);
    setRefundAmount('');
    setRefundReason('');
  };

  const handleSubmitRefund = async () => {
    if (!selected) return;
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) {
      toast.error('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return;
    }
    if (amt > remaining + 0.001) {
      toast.error(`จำนวนเงินเกินกว่าที่คืนได้ (฿${formatPrice(remaining)})`);
      return;
    }
    if (!refundReason.trim()) {
      toast.error('กรุณากรอกเหตุผลการคืนเงิน');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRefund({ orderId: selected.id, amount: amt, reason: refundReason.trim() });
      toast.success(`คืนเงิน ฿${formatPrice(amt)} สำเร็จ`);
      handleCloseModal();
      // Refresh search results
      const res = await getAdminOrders({ search: search.trim(), status: 'COMPLETED' });
      setOrders(res.orders);
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-wght-510 text-pos-2xl text-pos-text-primary tracking-tight leading-none mb-1">
          Refunds
        </h1>
        <p className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">
          ค้นหาออเดอร์และออกคำสั่งคืนเงิน
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-pos-text-tertiary" />
          <input
            type="text"
            placeholder="ค้นหาด้วยเลขออเดอร์ เช่น ORD-20260411"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-pos-bg-primary border border-pos-border-default rounded-pos-md pl-10 pr-4 py-2.5 text-pos-text-primary text-pos-sm placeholder:text-pos-text-tertiary focus:border-pos-border-focus focus:outline-none transition-colors font-body"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !search.trim()}
          className="px-5 py-2.5 bg-pos-accent-primary text-white rounded-pos-md font-body font-medium text-pos-sm hover:bg-pos-accent-hover transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          ค้นหา
        </button>
      </form>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-3">
          <p className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">
            พบ {totalFound} ออเดอร์
          </p>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-pos-bg-elevated border border-pos-border-default rounded-pos-lg text-center">
              <AlertCircle size={32} className="text-pos-text-tertiary mb-3" />
              <p className="text-pos-text-secondary text-pos-sm font-body">ไม่พบออเดอร์ที่ตรงกัน</p>
              <p className="text-pos-text-tertiary text-pos-xs font-mono mt-1">ลองค้นหาด้วยเลขออเดอร์อื่น</p>
            </div>
          ) : (
            <div className="border border-pos-border-default rounded-pos-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-pos-border-default bg-pos-bg-elevated">
                    <th className="px-5 py-3 text-left font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">เลขออเดอร์</th>
                    <th className="px-5 py-3 text-left font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">วันที่</th>
                    <th className="px-5 py-3 text-right font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">ยอดสุทธิ</th>
                    <th className="px-5 py-3 text-right font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">คืนแล้ว</th>
                    <th className="px-5 py-3 text-right font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">คืนได้อีก</th>
                    <th className="px-5 py-3 text-center font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">สถานะ</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const refunded = order.refunds.reduce((s, r) => s + r.amount, 0);
                    const rem = Math.round((order.netTotal - refunded) * 100) / 100;
                    return (
                      <tr key={order.id} className="border-b border-pos-border-default last:border-0 hover:bg-pos-bg-elevated transition-colors">
                        <td className="px-5 py-4 font-mono text-pos-sm text-pos-text-primary font-semibold tracking-wider">
                          {order.orderNumber}
                        </td>
                        <td className="px-5 py-4 font-mono text-pos-xs text-pos-text-tertiary">
                          {new Date(order.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-pos-sm text-pos-text-primary">
                          ฿{formatPrice(order.netTotal)}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-pos-xs text-pos-accent-warning">
                          {refunded > 0 ? `-฿${formatPrice(refunded)}` : '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-pos-sm font-semibold text-pos-accent-success">
                          ฿{formatPrice(rem)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-pos-sm border text-pos-nano font-mono font-bold uppercase tracking-widest ${statusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleSelectOrder(order)}
                            disabled={rem <= 0}
                            className="px-3 py-1.5 bg-pos-bg-elevated hover:bg-black/10 text-pos-text-primary border border-pos-border-default rounded-pos-sm font-body font-medium text-pos-xs transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <RotateCcw size={13} />
                            คืนเงิน
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Refund Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-pos-bg-surface border border-pos-border-default rounded-pos-xl shadow-pos-dialog w-full max-w-lg"
            >
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-pos-border-default flex items-center justify-between">
                <div>
                  <h2 className="font-display font-wght-510 text-pos-lg text-pos-text-primary tracking-tight leading-none">
                    คืนเงิน
                  </h2>
                  <p className="font-mono text-pos-xs text-pos-text-tertiary mt-0.5">{selected.orderNumber}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-pos-md text-pos-text-tertiary hover:text-pos-text-primary hover:bg-pos-bg-elevated transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Order summary */}
              <div className="px-6 py-4 border-b border-pos-border-default space-y-2">
                {selected.items.map((item) => (
                  <div key={item.id} className="flex justify-between font-body text-pos-sm">
                    <span className="text-pos-text-secondary">{item.productName} × {item.quantity}</span>
                    <span className="text-pos-text-primary font-mono">฿{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-pos-border-default flex justify-between font-body font-semibold text-pos-sm">
                  <span className="text-pos-text-secondary">ยอดสุทธิ</span>
                  <span className="text-pos-text-primary font-mono">฿{formatPrice(selected.netTotal)}</span>
                </div>
                {alreadyRefunded > 0 && (
                  <div className="flex justify-between font-body text-pos-sm">
                    <span className="text-pos-accent-warning">คืนไปแล้ว</span>
                    <span className="text-pos-accent-warning font-mono">-฿{formatPrice(alreadyRefunded)}</span>
                  </div>
                )}
                <div className="flex justify-between font-body font-semibold text-pos-base">
                  <span className="text-pos-accent-success">คืนได้อีก</span>
                  <span className="text-pos-accent-success font-mono">฿{formatPrice(remaining)}</span>
                </div>
              </div>

              {/* Refund form */}
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">
                    จำนวนเงินที่คืน (฿)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={`สูงสุด ฿${formatPrice(remaining)}`}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="flex-1 bg-pos-bg-primary border border-pos-border-default rounded-pos-md px-4 py-2.5 text-pos-text-primary font-mono text-pos-sm placeholder:text-pos-text-tertiary focus:border-pos-border-focus focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setRefundAmount(String(remaining))}
                      className="px-3 py-2.5 bg-pos-bg-elevated border border-pos-border-default rounded-pos-md text-pos-text-secondary hover:text-pos-text-primary hover:bg-black/10 font-mono text-pos-xs transition-colors whitespace-nowrap"
                    >
                      คืนเต็ม
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-pos-xs text-pos-text-tertiary uppercase tracking-widest">
                    เหตุผล
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น สินค้าผิด, ลูกค้าเปลี่ยนใจ"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full bg-pos-bg-primary border border-pos-border-default rounded-pos-md px-4 py-2.5 text-pos-text-primary font-body text-pos-sm placeholder:text-pos-text-tertiary focus:border-pos-border-focus focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 bg-pos-bg-elevated border border-pos-border-default text-pos-text-secondary rounded-pos-md font-body font-medium text-pos-sm hover:text-pos-text-primary hover:bg-black/10 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmitRefund}
                  disabled={isSubmitting || !refundAmount || !refundReason.trim()}
                  className="flex-1 py-2.5 bg-pos-accent-warning hover:bg-pos-accent-warning/90 text-white rounded-pos-md font-body font-semibold text-pos-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      ยืนยันคืนเงิน
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
