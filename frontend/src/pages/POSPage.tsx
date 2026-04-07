import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    X,
    Wallet,
    Banknote,
    QrCode,
    Clock,
    User as UserIcon,
    LogOut,
    Settings,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getProducts, createOrder } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import type { Product, CartItemData } from '@/types';

function formatPrice(n: number): string {
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function POSPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const {
        cart, addToCart, updateQuantity, removeFromCart, clearCart,
        subtotal, discount, setDiscount, discountAmount, netTotal
    } = useCart();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await getProducts();
                console.log('Frontend received products:', res);
                setProducts(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error('Fetch products error:', err);
                toast.error('Failed to load products');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return ['All', ...Array.from(cats).sort()];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (!p) return false;
            const name = p.name || '';
            const cat = p.category || '';
            const matchSearch = name.toLowerCase().includes(search.toLowerCase());
            const matchCategory = activeCategory === 'All' || cat === activeCategory;
            return matchSearch && matchCategory;
        });
    }, [products, search, activeCategory]);

    const handleProceedToCheckout = () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }
        navigate('/checkout');
    };

    return (
        <div className="flex h-screen bg-pos-bg-primary overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-20 bg-pos-bg-surface border-r border-pos-border-default flex flex-col items-center py-6 gap-6 no-print">
                <div className="w-12 h-12 rounded-pos-lg bg-pos-accent-primary flex items-center justify-center shadow-pos-float text-white">
                    <ShoppingCart size={24} />
                </div>

                <nav className="flex-1 flex flex-col gap-4">
                    <button className="p-3 rounded-pos-md bg-pos-bg-elevated text-pos-accent-primary">
                        <ShoppingCart size={24} />
                    </button>
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-3 rounded-pos-md text-pos-text-secondary hover:bg-pos-bg-elevated hover:text-pos-text-primary transition-colors"
                        >
                            <Settings size={24} />
                        </button>
                    )}
                </nav>

                <div className="flex flex-col gap-4 mt-auto">
                    <button
                        onClick={logout}
                        className="p-3 rounded-pos-md text-pos-text-secondary hover:bg-pos-accent-danger/10 hover:text-pos-accent-danger transition-colors"
                    >
                        <LogOut size={24} />
                    </button>
                </div>
            </aside>

            {/* Main Content (Product Grid) */}
            <main className="flex-1 flex flex-col min-w-0 bg-pos-bg-primary">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-pos-border-default bg-pos-bg-surface">
                    <div className="flex items-center gap-4">
                        <h1 className="font-display font-bold text-pos-lg text-pos-text-primary">
                            Sandwich & Coffee
                        </h1>
                        <div className="h-4 w-[1px] bg-pos-border-default" />
                        <div className="flex items-center gap-2 text-pos-text-secondary text-pos-sm">
                            <Clock size={14} />
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search menu..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-pos-bg-primary border border-pos-border-default rounded-pos-full text-pos-sm focus:outline-none focus:border-pos-accent-primary transition-colors w-64"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-pos-full bg-pos-bg-elevated border border-pos-border-default">
                            <UserIcon size={14} className="text-pos-accent-primary" />
                            <span className="text-pos-xs font-medium">{user?.name}</span>
                        </div>
                    </div>
                </header>

                {/* Categories */}
                <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-pos-border-default bg-pos-bg-primary">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2 rounded-pos-full text-pos-sm font-medium transition-all whitespace-nowrap ${activeCategory === cat
                                ? 'bg-pos-accent-primary text-white shadow-pos-float'
                                : 'bg-pos-bg-surface text-pos-text-secondary border border-pos-border-default hover:border-pos-text-disabled'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth h-screen">
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="aspect-[4/5] bg-pos-bg-surface rounded-pos-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            <AnimatePresence>
                                {filteredProducts.map(product => (
                                    <motion.button
                                        layout
                                        key={product.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => addToCart(product)}
                                        className="flex flex-col bg-pos-bg-surface border border-pos-border-default rounded-pos-lg overflow-hidden hover:border-pos-accent-primary transition-colors group relative"
                                    >
                                        <div className="aspect-square bg-pos-bg-elevated overflow-hidden">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-pos-text-disabled">
                                                    <ShoppingCart size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 text-left flex-1 flex flex-col justify-between h-full min-h-[100px]">
                                            <div>
                                                <p className="text-pos-xs text-pos-accent-info font-medium mb-1">{product.category}</p>
                                                <h3 className="text-pos-sm font-semibold text-pos-text-primary line-clamp-2 leading-tight h-10">{product.name}</h3>
                                            </div>
                                            <p className="font-display font-bold text-pos-lg text-pos-accent-primary mt-2">
                                                ฿{formatPrice(product.price)}
                                            </p>
                                        </div>
                                        {/* Add Badge if needed */}
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Cart (Right Panel) */}
            <aside className="w-[400px] bg-pos-bg-surface border-l border-pos-border-default flex flex-col no-print">
                <div className="p-6 border-b border-pos-border-default flex justify-between items-center bg-pos-bg-elevated/30">
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={20} className="text-pos-accent-primary" />
                        <h2 className="font-display font-bold text-pos-md text-pos-text-primary">Current Order</h2>
                    </div>
                    <button
                        onClick={clearCart}
                        disabled={cart.length === 0}
                        className="p-2 text-pos-text-secondary hover:text-pos-accent-danger disabled:opacity-30 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence initial={false}>
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-pos-text-disabled py-12">
                                <ShoppingCart size={48} className="mb-4 opacity-20" />
                                <p className="text-pos-sm">Cart is empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <motion.div
                                    key={item.productId}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-3 bg-pos-bg-primary/50 p-3 rounded-pos-md border border-pos-border-default"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-pos-sm font-medium text-pos-text-primary truncate">{item.name}</h4>
                                        <p className="text-pos-xs text-pos-text-secondary">฿{formatPrice(item.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-pos-bg-surface rounded-pos-full p-1 border border-pos-border-default">
                                        <button
                                            onClick={() => updateQuantity(item.productId, -1)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-pos-bg-elevated text-pos-text-primary transition-colors"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="text-pos-sm font-mono font-bold min-w-[20px] text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.productId, 1)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-pos-bg-elevated text-pos-text-primary transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="text-right min-w-[70px]">
                                        <p className="text-pos-sm font-bold text-pos-text-primary">฿{formatPrice(item.price * item.quantity)}</p>
                                        <button
                                            onClick={() => removeFromCart(item.productId)}
                                            className="text-pos-xs text-pos-accent-danger hover:underline mt-1"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Summary & Checkout */}
                <div className="p-6 bg-pos-bg-elevated/20 border-t border-pos-border-default space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-pos-sm text-pos-text-secondary">
                            <span>Subtotal</span>
                            <span>฿{formatPrice(subtotal)}</span>
                        </div>

                        {/* Discount Section */}
                        <div className="flex items-center justify-between text-pos-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-pos-text-secondary">Discount</span>
                                {discount.value > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-pos-accent-primary/20 text-pos-accent-primary text-[10px] font-bold">
                                        {discount.type === 'PERCENT' ? `${discount.value}%` : 'FIXED'}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={discount.value > 0 ? 'text-pos-accent-danger' : 'text-pos-text-secondary'}>
                                    -฿{formatPrice(discountAmount)}
                                </span>
                                <button
                                    onClick={() => {
                                        const val = prompt('Enter discount value (number only):', discount.value.toString());
                                        if (val !== null && !isNaN(Number(val))) {
                                            const type = confirm('Is this a Percentage? (OK = %, Cancel = Fixed)') ? 'PERCENT' : 'FIXED';
                                            setDiscount({ type, value: Number(val) });
                                        }
                                    }}
                                    className="p-1 rounded hover:bg-pos-bg-elevated text-pos-accent-info"
                                >
                                    <Settings size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-pos-border-default flex justify-between items-end">
                            <span className="text-pos-base font-medium text-pos-text-primary">Net Total</span>
                            <span className="text-pos-3xl font-display font-bold text-pos-accent-primary leading-none">
                                ฿{formatPrice(netTotal)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={handleProceedToCheckout}
                            disabled={cart.length === 0}
                            className="flex flex-col items-center justify-center gap-1 h-20 bg-pos-accent-primary text-white rounded-pos-lg hover:shadow-pos-float transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                        >
                            <Banknote size={24} />
                            <span className="text-pos-md uppercase tracking-widest">Proceed to Checkout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
