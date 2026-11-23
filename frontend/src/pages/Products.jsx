import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Package, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext'
import { createProduct, getProduct, listProducts, updateProduct } from '../services/productService'
import { getErrorMessage } from '../services/api'
import { formatCurrency } from '../utils/currency'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'

const emptyForm = {
  product_name: '', category: '', description: '', unit_price: '', cost_price: '', initial_stock: '0', reorder_level: '0',
}

function ProductForm({ mode, product, onClose, onSaved }) {
  const { business } = useBusiness()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode === 'edit' && product) {
      setForm({
        product_name: product.product_name || '',
        category: product.category || '',
        description: product.description || '',
        unit_price: product.unit_price ?? '',
        cost_price: product.cost_price ?? '',
        is_active: product.is_active,
      })
    } else setForm(emptyForm)
  }, [mode, product])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.product_name.trim().length < 2) { setError('Product name must contain at least 2 characters.') ; return }
    setLoading(true)
    try {
      const payload = mode === 'edit'
        ? {
            product_name: form.product_name.trim(),
            category: form.category.trim() || null,
            description: form.description.trim() || null,
            unit_price: Number(form.unit_price),
            cost_price: form.cost_price === '' ? null : Number(form.cost_price),
            is_active: Boolean(form.is_active),
          }
        : {
            product_name: form.product_name.trim(),
            category: form.category.trim() || null,
            description: form.description.trim() || null,
            unit_price: Number(form.unit_price),
            cost_price: form.cost_price === '' ? null : Number(form.cost_price),
            initial_stock: Number(form.initial_stock),
            reorder_level: Number(form.reorder_level),
          }
      if (mode === 'edit') await updateProduct(business.business_id, product.product_id, payload)
      else await createProduct(business.business_id, payload)
      onSaved()
    } catch (err) { setError(getErrorMessage(err, 'Could not save product')) }
    finally { setLoading(false) }
  }

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  return <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close" className="absolute inset-0 bg-slate-950/25" onClick={onClose} /><aside className="relative h-full w-full max-w-[520px] overflow-y-auto bg-[#F7F8F9] p-5 shadow-xl sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">{mode === 'edit' ? 'Update record' : 'New record'}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{mode === 'edit' ? 'Edit product' : 'Add product'}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div>
    <form onSubmit={submit} className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Product name *</span><input value={form.product_name} onChange={(e) => update('product_name', e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#6097E0]" /></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-bold text-slate-600">Category</span><input value={form.category} onChange={(e) => update('category', e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" /></label><label><span className="mb-2 block text-xs font-bold text-slate-600">Selling price *</span><input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => update('unit_price', e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" /></label></div><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Cost price</span><input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => update('cost_price', e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" /></label><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Description</span><textarea rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" /></label>
      {mode === 'create' && <div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-bold text-slate-600">Initial stock</span><input type="number" min="0" step="0.001" value={form.initial_stock} onChange={(e) => update('initial_stock', e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" /></label><label><span className="mb-2 block text-xs font-bold text-slate-600">Reorder level</span><input type="number" min="0" step="0.001" value={form.reorder_level} onChange={(e) => update('reorder_level', e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" /></label></div>}
      {mode === 'edit' && <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"><span><span className="block text-xs font-bold text-slate-600">Active product</span><span className="mt-1 block text-[11px] text-slate-400">Controls availability for active use.</span></span><input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => update('is_active', e.target.checked)} className="h-4 w-4 accent-[#417DAA]" /></label>}
      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">Cancel</button><button disabled={loading} type="submit" className="h-11 rounded-xl bg-[#131820] px-5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add product'}</button></div>
    </form></aside></div>
}

export default function Products() {
  const { business } = useBusiness()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [formMode, setFormMode] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [notice, setNotice] = useState('')

  const load = async () => {
    if (!business?.business_id) { setProducts([]); setLoading(false); return }
    setLoading(true); setError('')
    try { const data = await listProducts(business.business_id); setProducts(data.products || []) }
    catch (err) { setError(getErrorMessage(err, 'Could not load products')) }
    finally { setLoading(false) }
  }

  useEffect(() => { setProducts([]); setSelectedProduct(null); setFormMode(null); setNotice(''); load() }, [business?.business_id])

  const categories = useMemo(() => ['all', ...new Set(products.map((item) => item.category).filter(Boolean))], [products])
  const filtered = useMemo(() => products.filter((item) => {
    const matchesSearch = `${item.product_name} ${item.category || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || item.category === category
    const matchesStatus = status === 'all' || (status === 'active' ? item.is_active : !item.is_active)
    return matchesSearch && matchesCategory && matchesStatus
  }), [products, search, category, status])

  const openDetail = async (item) => {
    try { const data = await getProduct(business.business_id, item.product_id); setSelectedProduct(data.product) }
    catch (err) { setError(getErrorMessage(err, 'Could not load product details')) }
  }

  const saved = async () => { setFormMode(null); setSelectedProduct(null); setNotice(formMode === 'edit' ? 'Product updated.' : 'Product created.'); await load() }

  if (!business) return <EmptyState title="Select a workspace" message="Choose a business to manage products." />

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Catalog</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Products</h1><p className="mt-1 text-sm text-slate-400">Manage the products available to {business.business_name}.</p></div><button onClick={() => { setSelectedProduct(null); setFormMode('create') }} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#131820] px-4 text-sm font-bold text-white"><Plus size={16} />Add product</button></div>
    {notice && <div className="mb-4 rounded-xl border border-[#A6B4AA]/30 bg-[#A6B4AA]/10 px-4 py-3 text-sm font-semibold text-[#64766B]">{notice}</div>}
    {loading ? <LoadingState label="Loading products…" /> : error ? <ErrorState message={error} onRetry={load} /> : <>
      <div className="mb-4 flex flex-col gap-3 rounded-[20px] border border-white/80 bg-white p-3 md:flex-row md:items-center"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or categories" className="h-10 w-full rounded-xl border border-slate-100 bg-[#F7F8F9] pl-9 pr-3 text-sm outline-none focus:border-[#6097E0]" /></div><div className="relative"><SlidersHorizontal size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-100 bg-[#F7F8F9] pl-9 pr-8 text-xs font-bold text-slate-600 md:w-44">{categories.map((item) => <option key={item} value={item}>{item === 'all' ? 'All categories' : item}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div><div className="relative"><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-100 bg-[#F7F8F9] px-3 pr-8 text-xs font-bold text-slate-600 md:w-32"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div></div>
      {filtered.length ? <div className="overflow-hidden rounded-[22px] border border-white/80 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-4 font-bold">Product</th><th className="px-5 py-4 font-bold">Category</th><th className="px-5 py-4 font-bold">Price</th><th className="px-5 py-4 font-bold">Cost</th><th className="px-5 py-4 font-bold">Stock</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4" /></tr></thead><tbody>{filtered.map((item) => { const low = Number(item.current_stock ?? 0) <= Number(item.reorder_level ?? 0); return <tr key={item.product_id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8F9FA]"><td className="px-5 py-4"><button onClick={() => openDetail(item)} className="flex items-center gap-3 text-left"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ADCEEC]/25 text-[#417DAA]"><Package size={16} /></div><div><p className="text-xs font-bold">{item.product_name}</p><p className="mt-1 max-w-52 truncate text-[10px] text-slate-400">{item.description || 'No description'}</p></div></button></td><td className="px-5 py-4 text-xs text-slate-500">{item.category || 'Uncategorised'}</td><td className="px-5 py-4 text-xs font-bold">{formatCurrency(item.unit_price, business.currency_code)}</td><td className="px-5 py-4 text-xs text-slate-500">{item.cost_price == null ? '—' : formatCurrency(item.cost_price, business.currency_code)}</td><td className="px-5 py-4"><p className={`text-xs font-bold ${low ? 'text-amber-700' : 'text-slate-700'}`}>{Number(item.current_stock ?? 0)}</p><p className="mt-1 text-[9px] text-slate-400">Reorder {Number(item.reorder_level ?? 0)}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${item.is_active ? 'bg-[#A6B4AA]/25 text-[#64766B]' : 'bg-slate-100 text-slate-500'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button onClick={() => { setSelectedProduct(item); setFormMode('edit') }} className="rounded-lg px-3 py-2 text-xs font-bold text-[#417DAA] hover:bg-[#ADCEEC]/20">Edit</button></td></tr>})}</tbody></table></div></div> : <EmptyState title="No products found" message="Try changing your search or filters." />}
    </>}

    {formMode && <ProductForm mode={formMode} product={selectedProduct} onClose={() => { setFormMode(null); setSelectedProduct(null) }} onSaved={saved} />}

    {selectedProduct && !formMode && <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close details" className="absolute inset-0 bg-slate-950/25" onClick={() => setSelectedProduct(null)} /><aside className="relative h-full w-full max-w-[430px] overflow-y-auto bg-[#F7F8F9] p-6 shadow-xl"><div className="mb-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">Product detail</p><h2 className="mt-2 text-xl font-semibold">{selectedProduct.product_name}</h2></div><button onClick={() => setSelectedProduct(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div><div className="space-y-3"><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Selling price</p><p className="mt-2 text-lg font-bold">{formatCurrency(selectedProduct.unit_price, business.currency_code)}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Cost</p><p className="mt-2 text-sm font-bold">{selectedProduct.cost_price == null ? '—' : formatCurrency(selectedProduct.cost_price, business.currency_code)}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Stock</p><p className="mt-2 text-sm font-bold">{Number(selectedProduct.current_stock ?? 0)}</p></div></div><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Description</p><p className="mt-2 text-sm leading-6 text-slate-600">{selectedProduct.description || 'No description supplied.'}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Category</p><p className="mt-2 text-sm font-bold">{selectedProduct.category || 'Uncategorised'}</p></div><button onClick={() => setFormMode('edit')} className="h-11 w-full rounded-xl bg-[#131820] text-sm font-bold text-white">Edit product</button></div></aside></div>}
  </div>
}
