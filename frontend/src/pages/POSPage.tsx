import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Trash2, Plus, Minus, Settings, LogOut, Coffee, Sandwich, Cake, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getProducts } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import type { Product } from '@/types';

function CategoryPlaceholder({ category }: { category: string }) {
    const props = { size: 32, className: 'text-pos-text-disabled' };
    const cat = category.toLowerCase();
    if (cat === 'coffee') return <Coffee {...props} />;
    if (cat === 'sandwich') return <Sandwich {...props} />;
    if (cat === 'bakery') return <Cake {...props} />;
    return <ShoppingBag {...props} />;
}

export default function POSPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const {
        cart, addToCart, updateQuantity, removeFromCart, clearCart,
        subtotal, discount, discountAmount, netTotal
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
                setProducts(Array.isArray(res) ? res : []);
            } catch (err) {
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
            const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
            const matchCategory = activeCategory === 'All' || p.category === activeCategory;
            return matchSearch && matchCategory;
        });
    }, [products, search, activeCategory]);

    const handleProceedToCheckout = () => {
        if (cart.length === 0) {
            toast.error('Manifest is empty');
            return;
        }
        navigate('/checkout');
    };

    return (
        <div className="flex h-screen bg-pos-bg-primary font-body selection:bg-pos-accent-primary/20 text-pos-text-primary overflow-hidden">
            {/* Minimal/Raw Sidebar */}
            <aside className="w-20 border-r border-pos-border-default flex flex-col items-center py-8 gap-8 bg-pos-bg-surface z-20 shrink-0">
                <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center text-pos-text-primary hover:bg-white/10 transition-colors cursor-pointer">
                    <Coffee size={20} strokeWidth={2.5} />
                </div>

                <nav className="flex-1 flex flex-col gap-6 w-full items-center pt-8">
                    <button className="w-12 h-12 flex justify-center items-center rounded-pos-md bg-white/5 border border-white/10 text-pos-text-primary">
                        <ShoppingCart size={20} />
                    </button>
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-3 text-pos-text-tertiary hover:text-pos-text-primary transition-colors w-12 h-12 flex justify-center items-center"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                </nav>

                <button
                    onClick={logout}
                    className="p-3 text-pos-text-tertiary hover:text-pos-accent-danger transition-colors w-12 h-12 flex justify-center items-center"
                >
                    <LogOut size={20} />
                </button>
            </aside>

            {/* Main Editorial Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-pos-bg-primary overflow-hidden">
                {/* High Editorial Header */}
                <header className="px-10 pt-12 pb-6 border-b border-pos-border-default flex justify-between items-end shrink-0 z-10 bg-pos-bg-primary">
                    <div>
                        <h2 className="font-mono text-pos-xs text-pos-text-tertiary uppercase mb-2">
                            Terminal 01 // {user?.name}
                        </h2>
                        <h1 className="font-display font-wght-510 text-pos-xl leading-none text-pos-text-primary">
                            {user?.shopName || 'The Daily Grind'}
                        </h1>
                    </div>

                    <div className="relative w-72">
                        <Search size={16} className="absolute left-3 bottom-3 text-pos-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Find provision..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-pos-border-default rounded-pos-md text-pos-sm font-body focus:outline-none focus:border-pos-border-focus placeholder:text-pos-text-tertiary transition-colors"
                        />
                    </div>
                </header>

                {/* Taxonomy Filter */}
                <div className="px-10 py-6 flex gap-4 overflow-x-auto no-scrollbar shrink-0">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1 font-body text-pos-sm tracking-wide transition-all border rounded-pos-pill whitespace-nowrap ${activeCategory === cat
                                ? 'bg-white/10 border-white/20 text-pos-text-primary'
                                : 'bg-transparent border-transparent text-pos-text-tertiary hover:bg-white/5 hover:border-white/10'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product Masonry/Grid */}
                <div className="flex-1 overflow-y-auto px-10 pb-12 pt-2 scroll-smooth">
                    {loading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="aspect-[4/3] bg-white/5 animate-pulse border border-white/10 rounded-pos-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence>
                                {filteredProducts.map((product, idx) => (
                                    <motion.button
                                        layout
                                        key={product.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.03, duration: 0.3 }}
                                        onClick={() => addToCart(product)}
                                        className="group text-left bg-white/5 hover:bg-white/10 border border-pos-border-default transition-colors rounded-pos-lg flex flex-col overflow-hidden"
                                    >
                                        {/* Image area */}
                                        <div className="relative w-full aspect-square bg-pos-bg-elevated overflow-hidden">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <CategoryPlaceholder category={product.category} />
                                                </div>
                                            )}
                                            <span className="absolute top-2 left-2 text-pos-xs bg-black/40 backdrop-blur-sm rounded-pos-sm px-2 py-0.5 text-white/70 border border-white/10">
                                                {product.category}
                                            </span>
                                        </div>

                                        {/* Info area */}
                                        <div className="p-3 flex items-center justify-between gap-2">
                                            <h3 className="font-body font-semibold text-pos-sm text-pos-text-primary truncate">
                                                {product.name}
                                            </h3>
                                            <span className="font-mono text-pos-sm font-bold text-pos-text-primary shrink-0">
                                                ฿{product.price}
                                            </span>
                                        </div>
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Editorial Invoice Panel (Cart) */}
            <aside className="w-[380px] bg-pos-bg-surface border-l border-pos-border-default flex flex-col z-20 shrink-0">
                <div className="p-6 border-b border-pos-border-default bg-pos-bg-surface text-pos-text-primary">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="font-body font-wght-510 text-pos-lg leading-none">Manifest</h2>
                            <p className="font-mono text-pos-xs text-pos-text-tertiary uppercase mt-2">DRAFT / {new Date().toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={clearCart}
                            disabled={cart.length === 0}
                            className="p-2 opacity-50 hover:opacity-100 transition-opacity disabled:opacity-20"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                    <AnimatePresence>
                        {cart.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-pos-text-tertiary">
                                <p className="font-body text-pos-sm text-center">No provisions added to the manifest yet.</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <motion.div
                                    key={item.productId}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex flex-col gap-2 pb-4 border-b border-pos-border-default border-dashed"
                                >
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-body font-semibold text-pos-sm text-pos-text-primary leading-tight pr-4">
                                            {item.name}
                                        </h4>
                                        <p className="font-mono text-pos-sm font-semibold">฿{(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex items-center gap-3 border border-white/10 rounded-pos-md bg-white/5 px-2 py-1 w-fit">
                                            <button onClick={() => updateQuantity(item.productId, -1)} className="text-pos-text-tertiary hover:text-pos-text-primary">
                                                <Minus size={12} strokeWidth={2.5} />
                                            </button>
                                            <span className="font-mono text-pos-xs font-semibold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.productId, 1)} className="text-pos-text-tertiary hover:text-pos-text-primary">
                                                <Plus size={12} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.productId)}
                                            className="font-mono text-pos-xs text-pos-text-tertiary hover:text-pos-accent-danger transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-6 bg-pos-bg-surface border-t border-pos-border-default">
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between font-mono text-pos-xs text-pos-text-secondary uppercase tracking-wide">
                            <span>Subtotal</span>
                            <span>฿{subtotal.toLocaleString()}</span>
                        </div>
                        {discount.value > 0 && (
                            <div className="flex justify-between font-mono text-pos-xs text-pos-accent-danger uppercase tracking-wide">
                                <span>Relief</span>
                                <span>-฿{discountAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="pt-4 mt-2 border-t border-pos-border-default flex justify-between items-baseline">
                            <span className="font-body font-semibold text-pos-base">Total Due</span>
                            <span className="font-mono text-pos-xl font-bold">
                                ฿{netTotal.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleProceedToCheckout}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-pos-accent-primary text-white rounded-pos-md font-body font-medium text-pos-sm transition-all hover:bg-pos-accent-hover disabled:opacity-40 disabled:hover:bg-pos-accent-primary flex justify-center items-center gap-2"
                    >
                        Issue Tender
                    </button>
                </div>
            </aside>
        </div>
    );
}

