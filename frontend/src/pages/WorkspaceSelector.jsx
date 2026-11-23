import { useEffect, useState } from 'react'
import { ArrowRight, Building2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getBusinesses } from '../services/businessService'
import { getErrorMessage } from '../services/api'
import { useBusiness } from '../context/BusinessContext'
import { getBusinessTypeName } from '../utils/businessTypes'
import { ErrorState, LoadingState } from '../components/ui/Feedback'

export default function WorkspaceSelector() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { business, switchBusiness } = useBusiness()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true); setError('')
    try { const data = await getBusinesses(); setBusinesses(data.businesses || []) }
    catch (err) { setError(getErrorMessage(err, 'Could not load workspaces')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const selectBusiness = (nextBusiness) => {
    switchBusiness(nextBusiness)
    navigate('/dashboard')
  }

  return <div className="mx-auto max-w-5xl">
    <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Your workspaces</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Choose a business</h1></div><button onClick={() => navigate('/register-business')} className="flex h-10 items-center gap-2 rounded-xl bg-[#131820] px-4 text-xs font-bold text-white"><Plus size={15} />Register</button></div>
    {loading ? <LoadingState label="Loading workspaces…" /> : error ? <ErrorState message={error} onRetry={load} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((item) => <button key={item.business_id} onClick={() => selectBusiness(item)} className={`group rounded-[22px] border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${String(business?.business_id) === String(item.business_id) ? 'border-[#6097E0] bg-white' : 'border-white/80 bg-white/75 hover:bg-white'}`}><div className="mb-8 flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ADCEEC]/35 text-[#417DAA]"><Building2 size={19} /></div><ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#417DAA]" /></div><p className="truncate text-base font-bold text-[#131820]">{item.business_name}</p><p className="mt-1 text-xs text-slate-400">{getBusinessTypeName(item.business_type_id)} · {item.currency_code}</p><div className="mt-5 border-t border-slate-100 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{item.member_role}</div></button>)}
      {!businesses.length && <div className="col-span-full rounded-[22px] border border-dashed border-slate-300 py-16 text-center"><p className="text-sm font-semibold">No workspaces yet</p><p className="mt-1 text-xs text-slate-400">Register a business to get started.</p></div>}
    </div>}
  </div>
}
