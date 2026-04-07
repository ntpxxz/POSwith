import React, { createContext, useContext, useState, useMemo } from 'react';
import { CartItemData, Product } from '../types';

interface CartContextType {
    cart: CartItemData[];
    addToCart: (product: Product) => void;
    updateQuantity: (productId: number, delta: number) => void;
    removeFromCart: (productId: number) => void;
    clearCart: () => void;
    discount: { type: 'PERCENT' | 'FIXED'; value: number };
    setDiscount: (discount: { type: 'PERCENT' | 'FIXED'; value: number }) => void;
    subtotal: number;
    discountAmount: number;
    netTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItemData[]>([]);
    const [discount, setDiscount] = useState<{ type: 'PERCENT' | 'FIXED'; value: number }>({ type: 'FIXED', value: 0 });

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                category: product.category,
                image: product.image
            }];
        });
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const clearCart = () => setCart([]);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

    const discountAmount = useMemo(() => {
        if (discount.type === 'PERCENT') return (subtotal * discount.value) / 100;
        return discount.value;
    }, [subtotal, discount]);

    const netTotal = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

    return (
        <CartContext.Provider value={{
            cart, addToCart, updateQuantity, removeFromCart, clearCart,
            discount, setDiscount, subtotal, discountAmount, netTotal
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) throw new Error('useCart must be used within a CartProvider');
    return context;
}
