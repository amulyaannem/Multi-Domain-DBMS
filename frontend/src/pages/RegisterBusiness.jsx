import { useState } from 'react'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { registerBusiness } from '../services/businessService'
import { getErrorMessage } from '../services/api'
import { useBusiness } from '../context/BusinessContext'
import { businessTypeNames } from '../utils/businessTypes'

export default function RegisterBusiness() {
  const [form, setForm] = useState({ business_name: '', business_type_id: '1', currency_code: 'INR' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { switchBusiness } = useBusiness()

  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (form.business_name.trim().length < 2) { setError('Business name must contain at least 2 characters.') ; return }
    setLoading(true)
    try {
      const data = await registerBusiness({ ...form, business_name: form.business_name.trim(), business_type_id: Number(form.business_type_id), currency_code: form.currency_code.toUpperCase() })
      switchBusiness(data.business)
      navigate('/dashboard', { replace: true })
    } catch (err) { setError(getErrorMessage(err, 'Could not register business')) }
    finally { setLoading(false) }
  }

  return <div className="mx-auto max-w-2xl"><button onClick={() => navigate('/workspaces')} className="mb-6 flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft size={15} />Back to workspaces</button><div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm sm:p-8"><div className="mb-8 flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ADCEEC]/35 text-[#417DAA]"><Building2 size={21} /></div><div><h1 className="text-xl font-semibold tracking-tight">Register a business</h1><p className="mt-1 text-sm text-slate-500">Create a new workspace.</p></div></div><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-slate-600">Business name</span><input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#6097E0]" placeholder="Example Bakery" /></label><label><span className="mb-2 block text-xs font-bold text-slate-600">Business type</span><select value={form.business_type_id} onChange={(e) => setForm({ ...form, business_type_id: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none">{Object.entries(businessTypeNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label><span className="mb-2 block text-xs font-bold text-slate-600">Currency code</span><input value={form.currency_code} maxLength={3} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm uppercase outline-none focus:border-[#6097E0]" /></label>{error && <div className="sm:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<div className="sm:col-span-2 flex justify-end"><button disabled={loading} type="submit" className="h-11 rounded-xl bg-[#131820] px-5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Creating…' : 'Create workspace'}</button></div></form></div></div>
}
