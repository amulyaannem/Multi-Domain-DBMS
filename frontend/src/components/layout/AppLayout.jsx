import { useState } from 'react'
import { LayoutDashboard, BriefcaseBusiness, Package, Boxes, UsersRound, ShoppingCart, BarChart3, Settings, LogOut, Menu, X, ChevronDown, Building2 } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useBusiness } from '../../context/BusinessContext'
import { getBusinessTypeName } from '../../utils/businessTypes'

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const { business, clearBusiness } = useBusiness()
  const navigate = useNavigate()

  const signOut = () => { logout(); clearBusiness(); navigate('/login', { replace: true }) }

  const nav = <>
    <div className="mb-8 flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#131820] text-white"><Building2 size={18} /></div><div><p className="text-sm font-bold tracking-tight text-[#131820]">BMS</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Workspace</p></div></div>
    <nav className="space-y-1">
      <NavLink to="/dashboard" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><LayoutDashboard size={17} />Dashboard</NavLink>
      <NavLink to="/workspaces" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><BriefcaseBusiness size={17} />Workspaces</NavLink>
      <NavLink to="/products" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><Package size={17} />Products</NavLink>
      <NavLink to="/inventory" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><Boxes size={17} />Inventory</NavLink>
      <NavLink to="/customers" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><UsersRound size={17} />Customers</NavLink>
      <NavLink to="/orders" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><ShoppingCart size={17} />Orders</NavLink>
      <NavLink to="/analytics" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><BarChart3 size={17} />Analytics</NavLink>
      <NavLink to="/settings" onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-[#131820] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><Settings size={17} />Settings</NavLink>
    </nav>
  </>

  return <div className="min-h-screen bg-[#EBEDF0] text-[#131820]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] border-r border-white/70 bg-[#F7F8F9] p-5 lg:block">{nav}<button onClick={signOut} className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"><LogOut size={17} />Sign out</button></aside>
    {open && <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-slate-950/25" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[278px] bg-[#F7F8F9] p-5 shadow-xl"><button onClick={() => setOpen(false)} className="absolute right-4 top-4"><X size={20} /></button>{nav}<button onClick={signOut} className="mt-8 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500"><LogOut size={17} />Sign out</button></aside></div>}
    <div className="lg:pl-[238px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-white/70 bg-[#EBEDF0]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
        <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-white lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button><button onClick={() => navigate('/workspaces')} className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-left transition hover:bg-white"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#ADCEEC]/45 text-[#417DAA]"><Building2 size={15} /></div><div className="hidden sm:block"><p className="max-w-36 truncate text-xs font-bold">{business?.business_name || 'Select workspace'}</p><p className="text-[10px] text-slate-400">{business ? getBusinessTypeName(business.business_type_id) : 'No workspace selected'}</p></div><ChevronDown size={14} className="text-slate-400" /></button></div>
        <div className="flex items-center gap-3"><div className="text-right"><p className="text-xs font-bold">{user?.full_name}</p><p className="text-[10px] text-slate-400">Account owner</p></div><div className="grid h-9 w-9 place-items-center rounded-full bg-[#A6B4AA] text-xs font-bold text-white">{user?.full_name?.slice(0, 1)?.toUpperCase() || 'U'}</div></div>
      </header>
      <main className="p-4 sm:p-7 lg:p-9"><Outlet /></main>
    </div>
  </div>
}
