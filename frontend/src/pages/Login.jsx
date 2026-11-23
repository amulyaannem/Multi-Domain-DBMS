import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Enter both email and password.') ; return }
    setLoading(true)
    try { await login(email.trim(), password); navigate('/workspaces', { replace: true }) }
    catch (err) { setError(getErrorMessage(err, 'Login failed')) }
    finally { setLoading(false) }
  }

  return <div className="grid min-h-screen bg-[#F7F8F9] lg:grid-cols-[1.08fr_.92fr]">
    <section className="hidden flex-col justify-between bg-[#131820] p-10 lg:flex xl:p-14">
      <div className="flex items-center gap-3 text-white"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Building2 size={19} /></div><span className="text-sm font-bold">BMS</span></div>
      <div className="max-w-lg"><p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#ADCEEC]">Business intelligence</p><h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-6xl">A clearer view of every business.</h1><p className="mt-6 max-w-md text-sm leading-7 text-slate-300">Manage workspaces, sales, inventory and daily operations from one focused control center.</p></div>
      <p className="text-xs text-slate-500">Business Management System</p>
    </section>
    <section className="flex items-center justify-center px-5 py-12 sm:px-10"><div className="w-full max-w-[410px]"><div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#131820] text-white"><Building2 size={19} /></div><span className="text-sm font-bold">BMS</span></div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6097E0]">Welcome back</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#131820]">Sign in to your account</h2><p className="mt-2 text-sm text-slate-500">Continue to your business workspace.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5"><div><label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#6097E0] focus:ring-4 focus:ring-[#6097E0]/10" placeholder="name@company.com" /></div><div><label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="password">Password</label><div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-[#6097E0] focus:ring-4 focus:ring-[#6097E0]/10" placeholder="Enter your password" /><button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>{error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}<button disabled={loading} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#131820] text-sm font-bold text-white transition hover:bg-[#273140] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}<ArrowRight size={16} /></button></form>
    </div></section>
  </div>
}
