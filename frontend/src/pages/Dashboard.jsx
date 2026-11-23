import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Package, ShoppingBag, CircleCheck, Clock3, IndianRupee, AlertTriangle, Boxes } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getDashboard } from '../services/dashboardService'
import { getErrorMessage } from '../services/api'
import { useBusiness } from '../context/BusinessContext'
import { formatCurrency } from '../utils/currency'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'

const numberFormat = new Intl.NumberFormat()

function MetricCard({ title, value, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-[#ADCEEC]/30 text-[#417DAA]',
    sage: 'bg-[#A6B4AA]/25 text-[#697C70]',
    lavender: 'bg-[#B9B5D8]/25 text-[#777197]',
    navy: 'bg-[#131820] text-white',
  }
  return <article className="rounded-[20px] border border-white/80 bg-white p-5 shadow-[0_1px_2px_rgba(19,24,32,.02)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-400">{title}</p><p className="mt-3 text-[24px] font-semibold tracking-[-0.035em] text-[#131820]">{value}</p></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} /></div></div></article>
}

function StatusBadge({ status }) {
  const styles = { completed: 'bg-[#A6B4AA]/25 text-[#64766B]', paid: 'bg-[#ADCEEC]/35 text-[#417DAA]', placed: 'bg-[#B9B5D8]/25 text-[#777197]', processing: 'bg-[#ADCEEC]/35 text-[#417DAA]', pending: 'bg-amber-50 text-amber-700', cancelled: 'bg-red-50 text-red-600', draft: 'bg-slate-100 text-slate-500' }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${styles[status] || 'bg-slate-100 text-slate-500'}`}>{status?.replace('_', ' ')}</span>
}

export default function Dashboard() {
  const { business } = useBusiness()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!business?.business_id) { setData(null); setLoading(false); return }
    setLoading(true); setError('')
    try { const response = await getDashboard(business.business_id); setData(response.dashboard) }
    catch (err) { setError(getErrorMessage(err, 'Could not load dashboard')) }
    finally { setLoading(false) }
  }

  useEffect(() => { setData(null); load() }, [business?.business_id])

  const currency = business?.currency_code || 'INR'
  const chartData = useMemo(() => (data?.monthly_order_value || []).map((item) => ({
    month: new Date(`${item.sales_month}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }),
    revenue: Number(item.revenue || 0),
  })), [data])

  if (!business) return <EmptyState title="Select a workspace" message="Choose a business to view its dashboard." />

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Overview</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Good to see you</h1><p className="mt-1 text-sm text-slate-400">{business.business_name}</p></div><div className="rounded-full border border-white/80 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-500">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div></div>

    {loading ? <LoadingState label="Loading workspace dashboard…" /> : error ? <ErrorState message={error} onRetry={load} /> : data && <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"> 
        <MetricCard title="Total orders" value={numberFormat.format(data.summary?.total_orders || 0)} icon={ShoppingBag} tone="blue" />
        <MetricCard title="Completed" value={numberFormat.format(data.summary?.completed_orders || 0)} icon={CircleCheck} tone="sage" />
        <MetricCard title="Active orders" value={numberFormat.format(data.summary?.active_orders || 0)} icon={Clock3} tone="lavender" />
        <MetricCard title="Order value" value={formatCurrency(data.summary?.total_order_value, currency)} icon={IndianRupee} tone="navy" />
        <MetricCard title="Collected" value={formatCurrency(data.summary?.collected_amount, currency)} icon={ArrowUpRight} tone="blue" />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_.75fr]">
        <article className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-bold">Monthly order value</p><p className="mt-1 text-xs text-slate-400">Last six months</p></div><div className="h-2 w-2 rounded-full bg-[#6097E0]" /></div>
          {chartData.length ? <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6097E0" stopOpacity={0.28}/><stop offset="100%" stopColor="#6097E0" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#EEF0F2" strokeDasharray="3 6" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill:'#98A2B3', fontSize:11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill:'#98A2B3', fontSize:11 }} tickFormatter={(value) => `${currency} ${Number(value)/1000 >= 1 ? `${(Number(value)/1000).toFixed(0)}k` : value}`}/><Tooltip formatter={(value) => formatCurrency(value, currency)} contentStyle={{ border:'1px solid #EEF0F2', borderRadius:'12px', fontSize:'12px', boxShadow:'0 8px 24px rgba(19,24,32,.06)' }}/><Area type="monotone" dataKey="revenue" stroke="#6097E0" strokeWidth={2.5} fill="url(#salesFill)" activeDot={{ r:5, fill:'#417DAA', stroke:'#fff', strokeWidth:3 }}/></AreaChart></ResponsiveContainer></div> : <EmptyState title="No sales in this period" />}
        </article>

        <article className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold">Inventory</p><p className="mt-1 text-xs text-slate-400">Stock snapshot</p></div><Boxes size={18} className="text-[#417DAA]" /></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#F4F6F7] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tracked</p><p className="mt-2 text-xl font-bold">{numberFormat.format(data.inventory?.tracked_products || 0)}</p></div><div className="rounded-2xl bg-[#F4F6F7] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low stock</p><p className="mt-2 text-xl font-bold text-amber-700">{numberFormat.format(data.inventory?.low_stock_count || 0)}</p></div></div><div className="mt-3 rounded-2xl bg-[#ADCEEC]/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock units</p><p className="mt-2 text-xl font-bold text-[#417DAA]">{numberFormat.format(Number(data.inventory?.total_stock_units || 0))}</p></div></article>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <article className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5"><p className="text-sm font-bold">Best-selling products</p><p className="mt-1 text-xs text-slate-400">Completed orders</p></div>{data.best_selling_products?.length ? <div className="space-y-3">{data.best_selling_products.map((product, index) => <div key={product.product_id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F1F3F4] text-xs font-bold text-slate-500">{index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{product.product_name}</p><p className="mt-1 text-[10px] text-slate-400">{numberFormat.format(Number(product.units_sold))} units</p></div><p className="text-xs font-bold text-[#417DAA]">{formatCurrency(product.sales_value, currency)}</p></div>)}</div> : <EmptyState title="No completed product sales" />}</article>

        <article className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold">Recent orders</p><p className="mt-1 text-xs text-slate-400">Latest activity</p></div><span className="rounded-full bg-[#F1F3F4] px-2.5 py-1 text-[10px] font-bold text-slate-500">{data.recent_orders?.length || 0}</span></div>{data.recent_orders?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="pb-3 font-bold">Order</th><th className="pb-3 font-bold">Customer</th><th className="pb-3 font-bold">Status</th><th className="pb-3 font-bold text-right">Amount</th></tr></thead><tbody>{data.recent_orders.map((order) => <tr key={order.order_id} className="border-b border-slate-50 last:border-0"><td className="py-3 text-xs font-bold">#{order.order_id}</td><td className="py-3 text-xs text-slate-600">{order.customer_name || 'Walk-in'}</td><td className="py-3"><StatusBadge status={order.order_status} /></td><td className="py-3 text-right text-xs font-bold">{formatCurrency(order.total_amount, currency)}</td></tr>)}</tbody></table></div> : <EmptyState title="No recent orders" />}</article>
      </section>

      <section className="mt-4 rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold">Low-stock alerts</p><p className="mt-1 text-xs text-slate-400">At or below reorder level</p></div><AlertTriangle size={18} className="text-amber-600" /></div>{data.low_stock_products?.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.low_stock_products.map((item) => <div key={item.product_id} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/40 p-4"><div><p className="text-xs font-bold">{item.product_name}</p><p className="mt-1 text-[10px] text-slate-400">Reorder at {numberFormat.format(Number(item.reorder_level))}</p></div><div className="text-right"><p className="text-sm font-bold text-amber-700">{numberFormat.format(Number(item.quantity))}</p><p className="text-[9px] uppercase text-slate-400">left</p></div></div>)}</div> : <EmptyState title="No low-stock items" message="Your stock levels are above reorder thresholds." />}</section>
    </>}
  </div>
}
