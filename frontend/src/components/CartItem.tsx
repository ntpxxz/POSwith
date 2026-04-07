import React from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Plus } from 'lucide-react';
import type { CartItemData } from '@/types';

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 py-3 px-2 border-b border-pos-border-default last:border-0"
    >
      <button
        onClick={() => onRemove(item.productId)}
        className="touch-target-sm flex items-center justify-center w-8 h-8 rounded-pos-sm bg-pos-accent-danger/10 text-pos-accent-danger hover:bg-pos-accent-danger/20 transition-colors flex-shrink-0"
        aria-label="Remove item"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-pos-sm font-medium text-pos-text-primary truncate">{item.name}</p>
        <p className="text-pos-xs text-pos-text-secondary">{item.price.toFixed(0)} ฿</p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onUpdateQuantity(item.productId, -1)}
          className="touch-target-sm flex items-center justify-center w-10 h-10 rounded-pos-sm bg-pos-bg-elevated text-pos-text-primary hover:bg-pos-border-default transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus className="w-4 h-4" />
        </motion.button>
        <span className="w-10 text-center text-pos-md font-mono font-bold text-pos-text-primary">
          {item.quantity}
        </span>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onUpdateQuantity(item.productId, 1)}
          className="touch-target-sm flex items-center justify-center w-10 h-10 rounded-pos-sm bg-pos-bg-elevated text-pos-text-primary hover:bg-pos-border-default transition-colors"
          aria-label="Increase quantity"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      <p className="text-pos-md font-display font-bold text-pos-accent-primary w-20 text-right flex-shrink-0">
        {(item.price * item.quantity).toFixed(0)} ฿
      </p>
    </motion.div>
  );
}
