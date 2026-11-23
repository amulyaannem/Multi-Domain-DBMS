import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, ChevronDown, Package, Search, SlidersHorizontal, X } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext'
import { getInventory, getLowStock, updateInventory } from '../services/inventoryService'
import { getErrorMessage } from '../services/api'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'

const quantity = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(Number(value || 0))

function AdjustmentDrawer({ item, onClose, onSaved }) {
  const { business } = useBusiness()
  const [form, setForm] = useState({ quantity: item.quantity ?? '', reorder_level: item.reorder_level ?? '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.quantity === '' || Number(form.quantity) < 0) { setError('Quantity must be zero or greater.') ; return }
    if (form.reorder_level === '' || Number(form.reorder_level) < 0) { setError('Reorder level must be zero or greater.') ; return }
    setLoading(true)
    try {
      await updateInventory(business.business_id, item.product_id, {
        quantity: Number(form.quantity),
        reorder_level: Number(form.reorder_level),
      })
      onSaved()
    } catch (err) { setError(getErrorMessage(err, 'Could not adjust inventory')) }
    finally { setLoading(false) }
  }

  return <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close adjustment" className="absolute inset-0 bg-slate-950/25" onClick={onClose} /><aside className="relative h-full w-full max-w-[480px] overflow-y-auto bg-[#F7F8F9] p-5 shadow-xl sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">Stock adjustment</p><h2 className="mt-2 text-xl font-semibold tracking-tight">{item.product_name}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div><form onSubmit={submit} className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Current quantity</span><input type="number" min="0" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#6097E0]" /></label><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Reorder level</span><input type="number" min="0" step="0.001" value={form.reorder_level} onChange={(event) => setForm({ ...form, reorder_level: event.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#6097E0]" /></label>{error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">Cancel</button><button disabled={loading} type="submit" className="h-11 rounded-xl bg-[#131820] px-5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Saving…' : 'Save adjustment'}</button></div></form></aside></div>
}

function Metric({ title, value, icon: Icon, tone = 'blue' }) {
  const tones = { blue: 'bg-[#ADCEEC]/30 text-[#417DAA]', sage: 'bg-[#A6B4AA]/25 text-[#697C70]', amber: 'bg-amber-50 text-amber-700' }
  return <article className="rounded-[20px] border border-white/80 bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-400">{title}</p><p className="mt-3 text-[24px] font-semibold tracking-[-0.035em] text-[#131820]">{value}</p></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} /></div></div></article>
}

export default function Inventory() {
  const { business } = useBusiness()
  const [items, setItems] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [notice, setNotice] = useState('')

  const load = async () => {
    if (!business?.business_id) { setItems([]); setLowStockItems([]); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [inventoryData, lowStockData] = await Promise.all([
        getInventory(business.business_id),
        getLowStock(business.business_id),
      ])
      setItems(inventoryData.inventory || [])
      setLowStockItems(lowStockData.items || [])
    } catch (err) { setError(getErrorMessage(err, 'Could not load inventory')) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    setItems([]); setLowStockItems([]); setSelected(null); setAdjusting(null); setNotice(''); setSearch(''); setFilter('all'); setCategory('all')
    load()
  }, [business?.business_id])

  const categories = useMemo(() => ['all', ...new Set(items.map((item) => item.category).filter(Boolean))], [items])
  const lowIds = useMemo(() => new Set(lowStockItems.map((item) => String(item.product_id))), [lowStockItems])
  const filtered = useMemo(() => items.filter((item) => {
    const searchText = `${item.product_name || ''} ${item.category || ''}`.toLowerCase()
    const isLow = lowIds.has(String(item.product_id)) || Number(item.quantity) <= Number(item.reorder_level)
    return searchText.includes(search.toLowerCase())
      && (category === 'all' || item.category === category)
      && (filter === 'all' || (filter === 'low' ? isLow : !isLow))
  }), [items, search, category, filter, lowIds])

  const trackedProducts = items.length
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const lowCount = lowIds.size || items.filter((item) => Number(item.quantity) <= Number(item.reorder_level)).length

  const adjusted = async () => {
    setAdjusting(null)
    setSelected(null)
    setNotice('Inventory adjusted successfully.')
    await load()
  }

  if (!business) return <EmptyState title="Select a workspace" message="Choose a business to view inventory." />

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Stock control</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Inventory</h1><p className="mt-1 text-sm text-slate-400">Standard inventory for {business.business_name}</p></div></div>

    {loading ? <LoadingState label="Loading inventory…" /> : error ? <ErrorState message={error} onRetry={load} /> : <>
      {notice && <div className="mb-4 rounded-xl border border-[#A6B4AA]/30 bg-[#A6B4AA]/10 px-4 py-3 text-sm font-semibold text-[#64766B]">{notice}</div>}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric title="Tracked products" value={quantity(trackedProducts)} icon={Boxes} tone="blue" /><Metric title="Standard stock units" value={quantity(totalUnits)} icon={Package} tone="sage" /><Metric title="Low-stock items" value={quantity(lowCount)} icon={AlertTriangle} tone="amber" /></section>
      <div className="mt-4 mb-4 rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-xs leading-5 text-amber-800"><strong>Stock scope:</strong> This view shows standard <code className="font-semibold">inventory</code> records only. Clothing or boutique product-variant quantities are not aggregated here unless a separate API provides them.</div>

      <div className="mb-4 flex flex-col gap-3 rounded-[20px] border border-white/80 bg-white p-3 md:flex-row md:items-center"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or categories" className="h-10 w-full rounded-xl border border-slate-100 bg-[#F7F8F9] pl-9 pr-3 text-sm outline-none focus:border-[#6097E0]" /></div><div className="relative"><SlidersHorizontal size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-100 bg-[#F7F8F9] pl-9 pr-8 text-xs font-bold text-slate-600 md:w-44">{categories.map((item) => <option key={item} value={item}>{item === 'all' ? 'All categories' : item}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div><div className="relative"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-100 bg-[#F7F8F9] px-3 pr-8 text-xs font-bold text-slate-600 md:w-36"><option value="all">All stock</option><option value="low">Low stock</option><option value="healthy">Healthy stock</option></select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div></div>

      {filtered.length ? <div className="overflow-hidden rounded-[22px] border border-white/80 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-4 font-bold">Product</th><th className="px-5 py-4 font-bold">Category</th><th className="px-5 py-4 font-bold">Quantity</th><th className="px-5 py-4 font-bold">Reorder level</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4" /></tr></thead><tbody>{filtered.map((item) => { const isLow = lowIds.has(String(item.product_id)) || Number(item.quantity) <= Number(item.reorder_level); return <tr key={item.product_id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8F9FA]"><td className="px-5 py-4"><button onClick={() => setSelected(item)} className="flex items-center gap-3 text-left"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ADCEEC]/25 text-[#417DAA]"><Package size={16} /></div><div><p className="text-xs font-bold">{item.product_name}</p><p className="mt-1 text-[10px] text-slate-400">ID {item.product_id}</p></div></button></td><td className="px-5 py-4 text-xs text-slate-500">{item.category || 'Uncategorised'}</td><td className="px-5 py-4 text-xs font-bold">{quantity(item.quantity)}</td><td className="px-5 py-4 text-xs text-slate-500">{quantity(item.reorder_level)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${isLow ? 'bg-amber-50 text-amber-700' : 'bg-[#A6B4AA]/25 text-[#64766B]'}`}>{isLow ? 'Low stock' : 'Healthy'}</span></td><td className="px-5 py-4 text-right"><button onClick={() => setAdjusting(item)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#417DAA] hover:bg-[#ADCEEC]/20">Adjust</button></td></tr>})}</tbody></table></div></div> : <EmptyState title="No inventory records found" message="Try changing search or stock filters. Some products may not have an inventory record." />}
    </>}

    {selected && !adjusting && <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close inventory details" className="absolute inset-0 bg-slate-950/25" onClick={() => setSelected(null)} /><aside className="relative h-full w-full max-w-[430px] overflow-y-auto bg-[#F7F8F9] p-6 shadow-xl"><div className="mb-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">Inventory detail</p><h2 className="mt-2 text-xl font-semibold">{selected.product_name}</h2></div><button onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Quantity</p><p className="mt-2 text-lg font-bold">{quantity(selected.quantity)}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Reorder level</p><p className="mt-2 text-lg font-bold">{quantity(selected.reorder_level)}</p></div></div><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Category</p><p className="mt-2 text-sm font-bold">{selected.category || 'Uncategorised'}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Last updated</p><p className="mt-2 text-sm text-slate-600">{selected.updated_at ? new Date(selected.updated_at).toLocaleString() : 'Unavailable'}</p></div><button onClick={() => setAdjusting(selected)} className="h-11 w-full rounded-xl bg-[#131820] text-sm font-bold text-white">Adjust inventory</button></div></aside></div>}

    {adjusting && <AdjustmentDrawer item={adjusting} onClose={() => setAdjusting(null)} onSaved={adjusted} />}
  </div>
}
