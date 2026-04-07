import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, Sandwich, ShoppingBag, Cake } from 'lucide-react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'coffee':
      return <Coffee className="w-8 h-8" />;
    case 'sandwich':
      return <Sandwich className="w-8 h-8" />;
    case 'bakery':
      return <Cake className="w-8 h-8" />;
    default:
      return <ShoppingBag className="w-8 h-8" />;
  }
}

function getCategoryColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'coffee':
      return 'text-amber-400 bg-amber-400/10';
    case 'sandwich':
      return 'text-emerald-400 bg-emerald-400/10';
    case 'bakery':
      return 'text-pink-400 bg-pink-400/10';
    default:
      return 'text-pos-accent-info bg-pos-accent-info/10';
  }
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const iconColor = getCategoryColor(product.category);

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => onClick(product)}
      className="flex flex-col items-center gap-3 p-4 bg-pos-bg-surface rounded-pos-lg border border-pos-border-default hover:border-pos-accent-primary hover:bg-pos-bg-elevated transition-colors cursor-pointer text-center w-full"
    >
      <div className={`w-14 h-14 rounded-pos-md flex items-center justify-center ${iconColor}`}>
        {getCategoryIcon(product.category)}
      </div>
      <div className="w-full">
        <p className="text-pos-md font-semibold text-pos-text-primary truncate">
          {product.name}
        </p>
        <p className="text-pos-xl font-display font-bold text-pos-accent-primary mt-1">
          {product.price.toFixed(0)}
          <span className="text-pos-sm font-normal ml-1">฿</span>
        </p>
      </div>
    </motion.button>
  );
}
