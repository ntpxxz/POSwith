import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Package,
  ChevronDown,
  ImagePlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '@/lib/api';
import type { Product } from '@/types';

const CATEGORIES = ['Coffee', 'Sandwich', 'Bakery'];

interface ProductForm {
  name: string;
  category: string;
  price: string;
  sort_order: string;
  image_url: string;
  is_active: boolean;
}

const emptyForm: ProductForm = {
  name: '',
  category: 'Coffee',
  price: '',
  sort_order: '0',
  image_url: '',
  is_active: true,
};

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `http://localhost:3000${url}`;
}

function formatBaht(n: number): string {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await getAllProducts();
      setProducts(res);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  const openAddPanel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPanelOpen(true);
  };

  const openEditPanel = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      sort_order: '0',
      image_url: product.image || '',
      is_active: product.active,
    });
    setPanelOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      toast.error('Valid price is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        sortOrder: Number(form.sort_order) || 0,
        image: form.image_url.trim() || undefined,
        active: form.is_active,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      setPanelOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteConfirm.id);
      toast.success('Product deleted');
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id);
    try {
      await updateProduct(product.id, { active: !product.active });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p))
      );
      toast.success(`${product.name} ${product.active ? 'deactivated' : 'activated'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle product');
    } finally {
      setTogglingId(null);
    }
  };

  const uniqueCategories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-pos-xl font-display font-bold text-pos-text-primary">Products</h1>
        <button
          onClick={openAddPanel}
          className="flex items-center gap-2 px-4 py-2.5 bg-pos-accent-primary text-white rounded-pos-md text-pos-sm font-medium hover:bg-pos-accent-primary/90 transition-colors shadow-pos-float"
        >
          <Plus size={16} />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-text-secondary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-pos-bg-surface border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary focus:outline-none focus:border-pos-border-focus transition-colors cursor-pointer"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-pos-text-secondary pointer-events-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-pos-bg-surface rounded-pos-lg shadow-pos-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-pos-bg-elevated rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package size={40} className="text-pos-text-disabled" />
            <p className="text-pos-text-secondary text-pos-sm">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-pos-xs text-pos-text-secondary uppercase tracking-wider border-b border-pos-border-default">
                  <th className="text-left px-5 py-3 font-medium">#</th>
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Category</th>
                  <th className="text-right px-5 py-3 font-medium">Price</th>
                  <th className="text-center px-5 py-3 font-medium">Active</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border-default">
                {filtered.map((product, idx) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-pos-bg-elevated/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-pos-sm text-pos-text-secondary font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={resolveImageUrl(product.image)}
                            alt={product.name}
                            className="w-8 h-8 rounded-pos-sm object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-pos-sm bg-pos-bg-elevated flex items-center justify-center">
                            <Package size={14} className="text-pos-text-disabled" />
                          </div>
                        )}
                        <span className="text-pos-sm text-pos-text-primary font-medium">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-pos-xs bg-pos-bg-elevated text-pos-text-secondary">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-pos-sm text-pos-text-primary text-right font-mono">
                      {formatBaht(product.price)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(product)}
                        disabled={togglingId === product.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          product.active ? 'bg-pos-accent-success' : 'bg-pos-bg-elevated'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                            product.active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditPanel(product)}
                          className="p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-accent-info hover:bg-pos-accent-info/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product)}
                          className="p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-accent-danger hover:bg-pos-accent-danger/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setPanelOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-pos-bg-surface border-l border-pos-border-default z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-pos-border-default">
                <h2 className="text-pos-lg font-display font-semibold text-pos-text-primary">
                  {editingId ? 'Edit Product' : 'Add Product'}
                </h2>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-2 rounded-pos-md text-pos-text-secondary hover:text-pos-text-primary hover:bg-pos-bg-elevated transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-pos-sm text-pos-text-secondary mb-1.5">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
                    placeholder="Product name"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-pos-sm text-pos-text-secondary mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary focus:outline-none focus:border-pos-border-focus transition-colors"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-pos-sm text-pos-text-secondary mb-1.5">
                    Price (฿)
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2.5 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-pos-sm text-pos-text-secondary mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="w-full px-4 py-2.5 bg-pos-bg-primary border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-primary placeholder:text-pos-text-disabled focus:outline-none focus:border-pos-border-focus transition-colors"
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-pos-sm text-pos-text-secondary mb-1.5">Image</label>
                  <label className={`flex flex-col items-center justify-center w-full h-40 rounded-pos-md border-2 border-dashed transition-colors cursor-pointer overflow-hidden relative
                    ${uploading ? 'opacity-50 pointer-events-none' : 'border-pos-border-default hover:border-pos-border-focus bg-pos-bg-primary'}`}>
                    {form.image_url ? (
                      <>
                        <img
                          src={resolveImageUrl(form.image_url)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-pos-xs font-medium">
                          <ImagePlus size={16} /> เปลี่ยนรูป
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-pos-text-disabled">
                        {uploading ? <Loader2 size={24} className="animate-spin" /> : <ImagePlus size={24} />}
                        <span className="text-pos-xs">{uploading ? 'กำลังอัพโหลด...' : 'คลิกเพื่ออัพโหลดรูป'}</span>
                        <span className="text-pos-nano text-pos-text-disabled">JPG, PNG, WEBP — สูงสุด 5MB</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const url = await uploadProductImage(file);
                          setForm(f => ({ ...f, image_url: url }));
                        } catch (err: any) {
                          toast.error(err?.message || 'Upload failed');
                        } finally {
                          setUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="mt-1.5 text-pos-xs text-pos-accent-danger hover:underline"
                    >
                      ลบรูป
                    </button>
                  )}
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-pos-sm text-pos-text-secondary">Active</label>
                  <button
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.is_active ? 'bg-pos-accent-success' : 'bg-pos-bg-elevated'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        form.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-pos-border-default flex gap-3">
                <button
                  onClick={() => setPanelOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-secondary hover:bg-pos-bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-pos-accent-primary text-white rounded-pos-md text-pos-sm font-medium hover:bg-pos-accent-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-pos-bg-surface border border-pos-border-default rounded-pos-lg shadow-pos-modal z-50 p-6"
            >
              <h3 className="text-pos-md font-display font-semibold text-pos-text-primary mb-2">
                Delete Product
              </h3>
              <p className="text-pos-sm text-pos-text-secondary mb-6">
                Are you sure you want to delete{' '}
                <span className="text-pos-text-primary font-medium">{deleteConfirm.name}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-pos-border-default rounded-pos-md text-pos-sm text-pos-text-secondary hover:bg-pos-bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-pos-accent-danger text-white rounded-pos-md text-pos-sm font-medium hover:bg-pos-accent-danger/90 transition-colors disabled:opacity-50"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
