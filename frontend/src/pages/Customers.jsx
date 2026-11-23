import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Mail, MapPin, Phone, Plus, Search, UserRound, X } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext'
import { createCustomer, getCustomer, listCustomers, updateCustomer } from '../services/customerService'
import { getErrorMessage } from '../services/api'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'

function CustomerForm({ mode, customer, onClose, onSaved }) {
  const { business } = useBusiness()
  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode === 'edit' && customer) {
      setForm({
        customer_name: customer.customer_name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
      })
    } else setForm({ customer_name: '', phone: '', email: '', address: '' })
  }, [mode, customer])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.customer_name.trim().length < 2) { setError('Customer name must contain at least 2 characters.') ; return }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Enter a valid email address.') ; return }
    setLoading(true)
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      }
      if (mode === 'edit') await updateCustomer(business.business_id, customer.customer_id, payload)
      else await createCustomer(business.business_id, payload)
      onSaved(mode)
    } catch (err) { setError(getErrorMessage(err, 'Could not save customer')) }
    finally { setLoading(false) }
  }

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  return <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close" className="absolute inset-0 bg-slate-950/25" onClick={onClose} /><aside className="relative h-full w-full max-w-[520px] overflow-y-auto bg-[#F7F8F9] p-5 shadow-xl sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">{mode === 'edit' ? 'Update record' : 'New record'}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{mode === 'edit' ? 'Edit customer' : 'Add customer'}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div>
    <form onSubmit={submit} className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Customer name *</span><input value={form.customer_name} onChange={(event) => update('customer_name', event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#6097E0]" /></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-bold text-slate-600">Phone</span><input value={form.phone} maxLength={25} onChange={(event) => update('phone', event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" /></label><label><span className="mb-2 block text-xs font-bold text-slate-600">Email</span><input type="email" value={form.email} maxLength={254} onChange={(event) => update('email', event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none" /></label></div><label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Address</span><textarea rows="4" value={form.address} onChange={(event) => update('address', event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" /></label>{error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">Cancel</button><button disabled={loading} type="submit" className="h-11 rounded-xl bg-[#131820] px-5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add customer'}</button></div></form></aside></div>
}

export default function Customers() {
  const { business } = useBusiness()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [formMode, setFormMode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')

  const load = async () => {
    if (!business?.business_id) { setCustomers([]); setLoading(false); return }
    setLoading(true); setError('')
    try { const data = await listCustomers(business.business_id); setCustomers(data.customers || []) }
    catch (err) { setError(getErrorMessage(err, 'Could not load customers')) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    setCustomers([]); setSelected(null); setFormMode(null); setSearch(''); setNotice('')
    load()
  }, [business?.business_id])

  const filtered = useMemo(() => customers.filter((customer) => {
    const text = `${customer.customer_name || ''} ${customer.phone || ''} ${customer.email || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  }), [customers, search])

  const openDetail = async (customer) => {
    try { const data = await getCustomer(business.business_id, customer.customer_id); setSelected(data.customer) }
    catch (err) { setError(getErrorMessage(err, 'Could not load customer details')) }
  }

  const saved = async (mode) => {
    setFormMode(null)
    setSelected(null)
    setNotice(mode === 'edit' ? 'Customer updated.' : 'Customer created.')
    await load()
  }

  if (!business) return <EmptyState title="Select a workspace" message="Choose a business to view customers." />

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Directory</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Customers</h1><p className="mt-1 text-sm text-slate-400">Manage customer records for {business.business_name}.</p></div><button onClick={() => { setSelected(null); setFormMode('create') }} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#131820] px-4 text-sm font-bold text-white"><Plus size={16} />Add customer</button></div>
    {notice && <div className="mb-4 rounded-xl border border-[#A6B4AA]/30 bg-[#A6B4AA]/10 px-4 py-3 text-sm font-semibold text-[#64766B]">{notice}</div>}
    {loading ? <LoadingState label="Loading customers…" /> : error ? <ErrorState message={error} onRetry={load} /> : <>
      <div className="mb-4 flex items-center rounded-[20px] border border-white/80 bg-white p-3"><div className="relative w-full"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, phone or email" className="h-10 w-full rounded-xl border border-slate-100 bg-[#F7F8F9] pl-9 pr-3 text-sm outline-none focus:border-[#6097E0]" /></div></div>
      {filtered.length ? <div className="overflow-hidden rounded-[22px] border border-white/80 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-4 font-bold">Customer</th><th className="px-5 py-4 font-bold">Phone</th><th className="px-5 py-4 font-bold">Email</th><th className="px-5 py-4 font-bold">Address</th><th className="px-5 py-4 font-bold">Registered</th><th className="px-5 py-4" /></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.customer_id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8F9FA]"><td className="px-5 py-4"><button onClick={() => openDetail(customer)} className="flex items-center gap-3 text-left"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ADCEEC]/25 text-[#417DAA]"><UserRound size={16} /></div><p className="text-xs font-bold">{customer.customer_name}</p></button></td><td className="px-5 py-4 text-xs text-slate-500">{customer.phone || '—'}</td><td className="px-5 py-4 text-xs text-slate-500">{customer.email || '—'}</td><td className="max-w-[220px] px-5 py-4"><p className="truncate text-xs text-slate-500">{customer.address || '—'}</p></td><td className="px-5 py-4 text-xs text-slate-500">{customer.registered_at ? new Date(customer.registered_at).toLocaleDateString() : '—'}</td><td className="px-5 py-4 text-right"><button onClick={() => { setSelected(customer); setFormMode('edit') }} className="rounded-lg px-3 py-2 text-xs font-bold text-[#417DAA] hover:bg-[#ADCEEC]/20">Edit</button></td></tr>)}</tbody></table></div></div> : <EmptyState title="No customers found" message="Try a different search or add a new customer." />}
    </>}

    {formMode && <CustomerForm mode={formMode} customer={selected} onClose={() => { setFormMode(null); setSelected(null) }} onSaved={saved} />}

    {selected && !formMode && <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Close customer details" className="absolute inset-0 bg-slate-950/25" onClick={() => setSelected(null)} /><aside className="relative h-full w-full max-w-[430px] overflow-y-auto bg-[#F7F8F9] p-6 shadow-xl"><div className="mb-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6097E0]">Customer detail</p><h2 className="mt-2 text-xl font-semibold">{selected.customer_name}</h2></div><button onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={18} /></button></div><div className="space-y-3"><div className="rounded-2xl bg-white p-4"><div className="flex items-center gap-3"><Phone size={16} className="text-[#417DAA]" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Phone</p><p className="mt-1 text-sm font-bold">{selected.phone || 'Not provided'}</p></div></div></div><div className="rounded-2xl bg-white p-4"><div className="flex items-center gap-3"><Mail size={16} className="text-[#417DAA]" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Email</p><p className="mt-1 break-all text-sm font-bold">{selected.email || 'Not provided'}</p></div></div></div><div className="rounded-2xl bg-white p-4"><div className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 text-[#417DAA]" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Address</p><p className="mt-1 text-sm leading-6 text-slate-600">{selected.address || 'Not provided'}</p></div></div></div><div className="rounded-2xl border border-dashed border-slate-200 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Order history</p><p className="mt-2 text-xs leading-5 text-slate-500">Customer order history is not exposed by the existing customer API. Orders can be viewed through the orders endpoint when implemented.</p></div><button onClick={() => setFormMode('edit')} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#131820] text-sm font-bold text-white">Edit customer <ChevronRight size={16} /></button></div></aside></div>}
  </div>
}
