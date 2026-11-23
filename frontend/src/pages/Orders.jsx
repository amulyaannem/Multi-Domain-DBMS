import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Plus, Search, ShoppingCart, Truck, X } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext'
import { getErrorMessage } from '../services/api'
import { listCustomers } from '../services/customerService'
import { listProducts, listVariants } from '../services/productService'
import { getInventory } from '../services/inventoryService'
import { createOrder, getOrder, listOrders, placeOrder, updateDeliveryStatus, updateOrderStatus, updatePaymentStatus } from '../services/orderService'
import { formatCurrency } from '../utils/currency'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'

const orderStatusOptions = ['draft', 'placed', 'processing', 'completed', 'cancelled']
const paymentStatusOptions = ['pending', 'paid', 'partially_paid', 'refunded']

function StatusBadge({ status, type = 'order' }) {
  const styles = {
    draft: 'bg-slate-100 text-slate-500', placed: 'bg-[#B9B5D8]/25 text-[#777197]', processing: 'bg-[#ADCEEC]/35 text-[#417DAA]', completed: 'bg-[#A6B4AA]/25 text-[#64766B]', cancelled: 'bg-red-50 text-red-600', pending: 'bg-amber-50 text-amber-700', paid: 'bg-[#A6B4AA]/25 text-[#64766B]', partially_paid: 'bg-[#ADCEEC]/35 text-[#417DAA]', refunded: 'bg-red-50 text-red-600', preparing: 'bg-[#ADCEEC]/35 text-[#417DAA]', dispatched: 'bg-[#B9B5D8]/25 text-[#777197]', delivered: 'bg-[#A6B4AA]/25 text-[#64766B]', not_required: 'bg-slate-100 text-slate-500',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${styles[status] || 'bg-slate-100 text-slate-500'}`}>{status?.replaceAll('_', ' ') || '—'}</span>
}

function ConfirmDialog({ title, message, confirmLabel, tone = 'dark', onConfirm, onClose, loading }) {
  return <div className="fixed inset-0 z-[70] grid place-items-center p-4"><button aria-label="Close confirmation" className="absolute inset-0 bg-slate-950/30" onClick={onClose} /><div className="relative w-full max-w-sm rounded-[22px] border border-white/80 bg-white p-6 shadow-xl"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{message}</p><div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600">Cancel</button><button disabled={loading} onClick={onConfirm} className={`h-10 rounded-xl px-4 text-xs font-bold text-white disabled:opacity-60 ${tone === 'danger' ? 'bg-red-600' : 'bg-[#131820]'}`}>{loading ? 'Working…' : confirmLabel}</button></div></div></div>
}

function CreateOrderDrawer({ onClose, onSaved }) {
  const { business } = useBusiness()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [customerId, setCustomerId] = useState('walk-in')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity: '1' }])
  const [variantsByProduct, setVariantsByProduct] = useState({})
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([listCustomers(business.business_id), listProducts(business.business_id)])
      .then(async ([customerData, productData]) => {
        if (!active) return
        const activeProducts = (productData.products || []).filter((product) => product.is_active)
        setCustomers(customerData.customers || [])
        setProducts(activeProducts)
        const entries = await Promise.all(activeProducts.map(async (product) => {
          try {
            const data = await listVariants(business.business_id, product.product_id)
            return [String(product.product_id), data.variants || []]
          } catch {
            return [String(product.product_id), []]
          }
        }))
        if (active) setVariantsByProduct(Object.fromEntries(entries))
      })
      .catch((err) => active && setError(getErrorMessage(err, 'Could not load order options')))
      .finally(() => active && setLoadingOptions(false))
    return () => { active = false }
  }, [business.business_id])

  const updateItem = (index, key, value) => setItems((current) => current.map((item, itemIndex) => {
    if (itemIndex !== index) return item
    if (key === 'product_id') return { ...item, product_id: value, variant_id: '' }
    return { ...item, [key]: value }
  }))
  const addItem = () => setItems((current) => [...current, { product_id: '', variant_id: '', quantity: '1' }])
  const removeItem = (index) => setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!items.length || items.some((item) => !item.product_id || Number(item.quantity) <= 0)) { setError('Select a product and enter a quantity greater than zero for every item.') ; return }
    if (items.some((item) => (variantsByProduct[String(item.product_id)] || []).length > 0 && !item.variant_id)) { setError('A variant is required for one or more selected products.') ; return }
    setLoading(true)
    try {
      const payload = {
        customer_id: customerId === 'walk-in' ? null : Number(customerId),
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          variant_id: item.variant_id ? Number(item.variant_id) : null,
          quantity: Number(item.quantity),
        })),
        payment_method: paymentMethod.trim() || null,
      }
      await createOrder(business.business_id, payload)
      onSaved()
    } catch (err) {
      const data = err.response?.data
      if (data?.errors?.length) setError(data.errors.map((issue) => `${issue.field}: ${issue.message}`).join(' • '))
      else setError(getErrorMessage(err, 'Could not create draft order'))
    } finally { setLoading(false) }
  }

  return <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close" className="absolute inset-0 bg-slate-950/25" onClick={onClose} /><aside className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#F7F8F9] p-5 shadow-xl sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">New draft</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Create order</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div>{loadingOptions ? <LoadingState label="Loading customers and products…" /> : <form onSubmit={submit} className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Customer</span><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"><option value="walk-in">Walk-in customer</option>{customers.map((customer) => <option key={customer.customer_id} value={customer.customer_id}>{customer.customer_name}</option>)}</select></label><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Payment method</span><input value={paymentMethod} maxLength={30} onChange={(event) => setPaymentMethod(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" placeholder="Optional" /></label><div><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-600">Products</span><button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-[#417DAA]"><Plus size={14} />Add item</button></div><div className="space-y-3">{items.map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3"><div className="grid grid-cols-[1fr_100px] gap-3"><select value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-100 bg-[#F7F8F9] px-3 text-xs outline-none"><option value="">Select product</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} · {formatCurrency(product.unit_price, business.currency_code)}</option>)}</select><div className="flex h-11 items-center gap-2"><select value={item.variant_id} onChange={(event) => updateItem(index, 'variant_id', event.target.value)} className="h-full min-w-0 rounded-xl border border-slate-100 bg-[#F7F8F9] px-3 text-xs outline-none">{(variantsByProduct[String(item.product_id)] || []).map((variant) => <option key={variant.variant_id} value={variant.variant_id}>{variant.variant_name}</option>)}</select><input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} className="h-full rounded-xl border border-slate-100 bg-[#F7F8F9] px-3 text-xs outline-none" /></div></div>{items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="mt-2 text-[10px] font-bold text-red-500">Remove item</button>}</div>)}</div></div>{error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">Cancel</button><button disabled={loading} type="submit" className="h-11 rounded-xl bg-[#131820] px-5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Creating…' : 'Create draft'}</button></div></form>}</aside></div>
}

export default function Orders() {
  const { business } = useBusiness()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    if (!business?.business_id) { setOrders([]); setLoading(false); return }
    setLoading(true); setError('')
    try { const data = await listOrders(business.business_id); setOrders(data.orders || []) }
    catch (err) { setError(getErrorMessage(err, 'Could not load orders')) }
    finally { setLoading(false) }
  }

  useEffect(() => { setOrders([]); setSelected(null); setCreateOpen(false); setConfirm(null); setNotice(''); setSearch(''); setOrderStatus('all'); setPaymentStatus('all'); load() }, [business?.business_id])

  const filtered = useMemo(() => orders.filter((order) => {
    const text = `#${order.order_id} ${order.customer_name || 'walk-in'}`.toLowerCase()
    return text.includes(search.toLowerCase()) && (orderStatus === 'all' || order.order_status === orderStatus) && (paymentStatus === 'all' || order.payment_status === paymentStatus)
  }), [orders, search, orderStatus, paymentStatus])

  const openDetail = async (order) => {
    try { const data = await getOrder(business.business_id, order.order_id); setSelected(data.order) }
    catch (err) { setError(getErrorMessage(err, 'Could not load order details')) }
  }

  const refreshDetailAndList = async (orderId) => {
    const [orderData, listData] = await Promise.all([getOrder(business.business_id, orderId), listOrders(business.business_id)])
    setSelected(orderData.order)
    setOrders(listData.orders || [])
  }

  const runMutation = async (action) => {
    setMutationLoading(true); setError('')
    try {
      if (action.type === 'place') await placeOrder(business.business_id, action.orderId)
      if (action.type === 'order') await updateOrderStatus(business.business_id, action.orderId, action.value)
      if (action.type === 'payment' ) await updatePaymentStatus(business.business_id, action.orderId, action.value)
      if (action.type === 'delivery') await updateDeliveryStatus(business.business_id, action.orderId, action.value)
      await refreshDetailAndList(action.orderId)
      setNotice(action.type === 'place' ? 'Order placed. Inventory updates are handled by the server.' : action.type === 'payment' ? 'Administrative payment status updated.' : action.type === 'order' && action.value === 'cancelled' ? 'Order status changed to cancelled. Stock restoration is not assumed.' : 'Order status updated.')
    } catch (err) { setError(getErrorMessage(err, 'Could not update order')) }
    finally { setMutationLoading(false); setConfirm(null) }
  }

  const created = async () => { setCreateOpen(false); setNotice('Draft order created.'); await load() }

  if (!business) return <EmptyState title="Select a workspace" message="Choose a business to view orders." />

  const orderTransitions = selected ? ({ draft: ['cancelled'], placed: ['processing', 'cancelled'], processing: ['completed', 'cancelled'] }[selected.order_status] || []) : []
  const paymentTransitions = selected ? ({ pending: ['paid', 'partially_paid', 'refunded'], partially_paid: ['paid', 'refunded'], paid: ['refunded'], refunded: [] }[selected.payment_status] || []) : []
  const deliveryTransitions = selected ? ({ pending: ['preparing', 'cancelled'], preparing: ['dispatched', 'cancelled'], dispatched: ['delivered'], delivered: [], cancelled: [], not_required: [] }[selected.delivery_status] || []) : []

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Sales</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Orders</h1><p className="mt-1 text-sm text-slate-400">Manage orders for {business.business_name}.</p></div><button onClick={() => setCreateOpen(true)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#131820] px-4 text-sm font-bold text-white"><Plus size={16} />Create order</button></div>
    {notice && <div className="mb-4 rounded-xl border border-[#A6B4AA]/30 bg-[#A6B4AA]/10 px-4 py-3 text-sm font-semibold text-[#64766B]">{notice}</div>}
    {error && !selected && <div className="mb-4"><ErrorState message={error} onRetry={load} /></div>}
    {loading ? <LoadingState label="Loading orders…" /> : <>
      <div className="mb-4 flex flex-col gap-3 rounded-[20px] border border-white/80 bg-white p-3 md:flex-row md:items-center"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order or customer" className="h-10 w-full rounded-xl border border-slate-100 bg-[#F7F8F9] pl-9 pr-3 text-sm outline-none focus:border-[#6097E0]" /></div><div className="relative"><select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-100 bg-[#F7F8F9] px-3 pr-8 text-xs font-bold text-slate-600 md:w-36"><option value="all">All order status</option>{orderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div><div className="relative"><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-100 bg-[#F7F8F9] px-3 pr-8 text-xs font-bold text-slate-600 md:w-40"><option value="all">All payment status</option>{paymentStatusOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div></div>
      {filtered.length ? <div className="overflow-hidden rounded-[22px] border border-white/80 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-4 font-bold">Order</th><th className="px-5 py-4 font-bold">Customer</th><th className="px-5 py-4 font-bold">Date</th><th className="px-5 py-4 font-bold">Total</th><th className="px-5 py-4 font-bold">Order</th><th className="px-5 py-4 font-bold">Payment</th><th className="px-5 py-4 font-bold">Delivery</th><th className="px-5 py-4" /></tr></thead><tbody>{filtered.map((order) => <tr key={order.order_id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8F9FA]"><td className="px-5 py-4"><button onClick={() => openDetail(order)} className="flex items-center gap-3 text-left"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ADCEEC]/25 text-[#417DAA]"><ShoppingCart size={16} /></div><p className="text-xs font-bold">#{order.order_id}</p></button></td><td className="px-5 py-4 text-xs text-slate-600">{order.customer_name || 'Walk-in'}</td><td className="px-5 py-4 text-xs text-slate-500">{order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}</td><td className="px-5 py-4 text-xs font-bold">{formatCurrency(order.order_total, business.currency_code)}</td><td className="px-5 py-4"><StatusBadge status={order.order_status} /></td><td className="px-5 py-4"><StatusBadge status={order.payment_status} /></td><td className="px-5 py-4"><StatusBadge status={order.delivery_status} /></td><td className="px-5 py-4 text-right"><button onClick={() => openDetail(order)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#417DAA] hover:bg-[#ADCEEC]/20">View</button></td></tr>)}</tbody></table></div></div> : <EmptyState title="No orders found" message="Try changing the search or status filters." />}
    </>}

    {createOpen && <CreateOrderDrawer onClose={() => setCreateOpen(false)} onSaved={created} />}

    {selected && <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close order details" className="absolute inset-0 bg-slate-950/25" onClick={() => setSelected(null)} /><aside className="relative h-full w-full max-w-[560px] overflow-y-auto bg-[#F7F8F9] p-5 shadow-xl sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">Order detail</p><h2 className="mt-2 text-2xl font-semibold">#{selected.order_id}</h2></div><button onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div>{error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Customer</p><p className="mt-2 text-sm font-bold">{selected.customer_name || 'Walk-in'}</p></div><div className="rounded-2xl bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Order total</p><p className="mt-2 text-sm font-bold">{formatCurrency(selected.order_total, business.currency_code)}</p></div></div><div className="mt-3 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-white p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Order</p><div className="mt-2"><StatusBadge status={selected.order_status} /></div></div><div className="rounded-2xl bg-white p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Payment</p><div className="mt-2"><StatusBadge status={selected.payment_status} /></div></div><div className="rounded-2xl bg-white p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Delivery</p><div className="mt-2"><StatusBadge status={selected.delivery_status} /></div></div></div><div className="mt-4 rounded-2xl bg-white p-4"><p className="mb-3 text-xs font-bold">Items</p>{selected.items?.length ? <div className="divide-y divide-slate-100">{selected.items.map((item) => <div key={item.order_detail_id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-xs font-bold">{item.product_name}{item.sku ? ` · ${item.sku}` : ''}</p><p className="mt-1 text-[10px] text-slate-400">{item.quantity_ordered} × {formatCurrency(item.unit_price, business.currency_code)}</p></div><p className="text-xs font-bold">{formatCurrency(item.line_total, business.currency_code)}</p></div>)}</div> : <EmptyState title="No items" />}</div><div className="mt-4 space-y-3"><p className="text-xs font-bold">Actions</p>{selected.order_status === 'draft' && <button onClick={() => setConfirm({ type: 'place', orderId: selected.order_id, title: 'Place draft order?', message: 'Placing this order will ask the server to validate stock and deduct inventory.' })} className="h-11 w-full rounded-xl bg-[#131820] text-sm font-bold text-white">Place draft order</button>}{orderTransitions.map((status) => <button key={status} onClick={() => setConfirm({ type: 'order', orderId: selected.order_id, value: status, title: status === 'cancelled' ? 'Cancel order?' : `Set status to ${status}?`, message: status === 'cancelled' ? 'The order status will be changed to cancelled. Stock restoration is not assumed.' : `Change this order status to ${status}.`, tone: status === 'cancelled' ? 'danger' : 'dark' })} className={`h-11 w-full rounded-xl text-sm font-bold ${status === 'cancelled' ? 'border border-red-200 bg-red-50 text-red-600' : 'border border-slate-200 bg-white text-slate-700'}`}>{status === 'cancelled' ? 'Cancel order' : `Set ${status}`}</button>)}<div className="rounded-2xl bg-white p-4"><p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Administrative payment status</p>{paymentTransitions.length ? <div className="grid grid-cols-2 gap-2">{paymentTransitions.map((status) => <button key={status} onClick={() => runMutation({ type: 'payment', orderId: selected.order_id, value: status })} className="h-10 rounded-xl border border-slate-200 text-xs font-bold capitalize">{status.replaceAll('_', ' ')}</button>)}</div> : <p className="text-xs text-slate-400">No further payment status transitions.</p>}</div>{selected.delivery_status && <div className="rounded-2xl bg-white p-4"><p className="mb-2 text-[10px] font-bold uppercase text-slate-400"><Truck size={12} className="mr-1 inline" />Delivery status</p>{deliveryTransitions.length ? <div className="grid grid-cols-2 gap-2">{deliveryTransitions.map((status) => <button key={status} onClick={() => runMutation({ type: 'delivery', orderId: selected.order_id, value: status })} className="h-10 rounded-xl border border-slate-200 text-xs font-bold capitalize">{status.replaceAll('_', ' ')}</button>)}</div> : <p className="text-xs text-slate-400">No further delivery transitions.</p>}</div>}</div></aside></div>}

    {confirm && <ConfirmDialog {...confirm} loading={mutationLoading} onClose={() => setConfirm(null)} onConfirm={() => runMutation(confirm)} />}
  </div>
}
