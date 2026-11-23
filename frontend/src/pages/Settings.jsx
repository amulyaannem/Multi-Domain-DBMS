import { useEffect, useState } from 'react'
import { Building2, ChevronRight, KeyRound, LogOut, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBusiness } from '../context/BusinessContext'
import {
  getAccountProfile, getBusinesses, getBusinessProfile, updateBusinessProfile,
  getBusinessModules, updateBusinessModule, getBusinessMembers,
  updateBusinessMember, removeBusinessMember, updateAccountProfile, changePassword,
} from '../services/settingsService'
import { getErrorMessage } from '../services/api'
import { getBusinessTypeName } from '../utils/businessTypes'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'

const tabs = [
  { id: 'business', label: 'Business profile', icon: Building2 },
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'team', label: 'Team & roles', icon: UsersRound },
  { id: 'modules', label: 'Business modules', icon: ShieldCheck },
  { id: 'security', label: 'Security', icon: KeyRound },
]

function InfoRow({ label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="text-right text-sm font-bold text-[#131820]">{value || '—'}</p></div>
}

export default function Settings() {
  const { business, clearBusiness } = useBusiness()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('business')
  const [account, setAccount] = useState(user)
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [businessProfile, setBusinessProfile] = useState(null)
  const [modules, setModules] = useState([])
  const [members, setMembers] = useState([])
  const [businessName, setBusinessName] = useState('')
  const [currencyCode, setCurrencyCode] = useState('INR')
  const [accountName, setAccountName] = useState(user?.full_name || '')
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' })
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [accountData, businessData] = await Promise.all([getAccountProfile(), getBusinesses()])
      setAccount(accountData.user || user)
      setAccountName(accountData.user?.full_name || user?.full_name || '')
      setBusinesses(businessData.businesses || [])
      if (business?.business_id) {
        const [profileData, modulesData, membersData] = await Promise.all([
          getBusinessProfile(business.business_id),
          getBusinessModules(business.business_id),
          getBusinessMembers(business.business_id),
        ])
        const profile = profileData.business
        setBusinessProfile(profile)
        setBusinessName(profile?.business_name || business.business_name || '')
        setCurrencyCode(profile?.currency_code || business.currency_code || 'INR')
        setModules(modulesData.modules || [])
        setMembers(membersData.members || [])
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load settings'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAccount(user)
    setBusinesses([])
    setError('')
    load()
  }, [business?.business_id])

  if (!business) return <EmptyState title="Select a workspace" message="Choose a business to view workspace settings." />

  const activeBusiness = businesses.find((item) => String(item.business_id) === String(business.business_id)) || business

  const signOut = () => {
    logout()
    clearBusiness()
  }

  return <div>
    <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Settings</h1><p className="mt-1 text-sm text-slate-400">Profile and account information for {business.business_name}</p></div>

    {loading ? <LoadingState label="Loading settings…" /> : error ? <ErrorState message={error} onRetry={load} /> : <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-[22px] border border-white/80 bg-white p-2 lg:sticky lg:top-[88px] lg:h-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-xs font-bold transition ${activeTab === tab.id ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-[#F7F8F9] hover:text-[#131820]'}`}><span className="flex items-center gap-2"><Icon size={15} />{tab.label}</span>{activeTab === tab.id && <ChevronRight size={14} />}</button>
        })}
      </aside>

      <div className="min-w-0">
        {activeTab === 'business' && <section className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5"><p className="text-sm font-bold">Business profile</p><p className="mt-1 text-xs text-slate-400">Active workspace details</p></div><div className="rounded-2xl bg-[#F7F8F9] px-4"><InfoRow label="Business name" value={activeBusiness.business_name} /><InfoRow label="Business type" value={getBusinessTypeName(activeBusiness.business_type_id)} /><InfoRow label="Currency" value={activeBusiness.currency_code} /><InfoRow label="Member role" value={activeBusiness.member_role} /><InfoRow label="Created" value={activeBusiness.created_at ? new Date(activeBusiness.created_at).toLocaleDateString() : '—'} /></div><div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-xs leading-5 text-amber-800">Business profile editing and module configuration are not available through the existing backend contracts.</div></section>}

        {activeTab === 'account' && <section className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5"><p className="text-sm font-bold">Account profile</p><p className="mt-1 text-xs text-slate-400">Authenticated account information</p></div><div className="rounded-2xl bg-[#F7F8F9] px-4"><InfoRow label="Name" value={account?.full_name} /><InfoRow label="Email" value={account?.email} /><InfoRow label="User ID" value={account?.user_id} /></div><div className="mt-4 rounded-2xl border border-slate-200 px-4 py-3 text-xs leading-5 text-slate-500">Profile editing and password change are not exposed by the existing authentication API.</div></section>}

        {activeTab === 'team' && <section className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5"><p className="text-sm font-bold">Team & roles</p><p className="mt-1 text-xs text-slate-400">Workspace membership information available to this account</p></div><div className="rounded-2xl bg-[#F7F8F9] p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">{activeBusiness.business_name}</p><p className="mt-1 text-xs text-slate-400">Current workspace membership</p></div><span className="rounded-full bg-[#ADCEEC]/35 px-3 py-1 text-xs font-bold text-[#417DAA]">{activeBusiness.member_role || '—'}</span></div></div><div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-xs leading-5 text-slate-500">Team listing, invitations, role changes and member removal have no backend endpoints. The account role is shown from the workspace response only; no frontend-only permissions are assumed.</div></section>}

        {activeTab === 'modules' && <section className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5"><p className="text-sm font-bold">Business modules</p><p className="mt-1 text-xs text-slate-400">Enabled modules for this workspace</p></div><div className="rounded-2xl border border-dashed border-slate-200 p-5"><EmptyState title="Module list unavailable" message="The workspace list does not expose enabled module keys. Module activation has no supported backend endpoint." /></div></section>}

        {activeTab === 'security' && <section className="rounded-[22px] border border-white/80 bg-white p-5 sm:p-6"><div className="mb-5"><p className="text-sm font-bold">Security & account</p><p className="mt-1 text-xs text-slate-400">Supported account session controls</p></div><div className="rounded-2xl bg-[#F7F8F9] p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Password</p><p className="mt-1 text-xs text-slate-400">No password-change endpoint is available.</p></div><button disabled className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-400">Unavailable</button></div></div><button onClick={signOut} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 text-sm font-bold text-red-600"><LogOut size={16} />Sign out</button></section>}
      </div>
    </div>}
  </div>
}
