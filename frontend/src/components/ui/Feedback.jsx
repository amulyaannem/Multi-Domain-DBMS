import { AlertCircle, LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }) {
  return <div className="flex min-h-48 items-center justify-center text-sm font-medium text-slate-500"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />{label}</div>
}

export function ErrorState({ message, onRetry }) {
  return <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5 text-red-700"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">Unable to load data</p><p className="mt-1 text-sm text-red-600">{message}</p></div></div>{onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-bold shadow-sm">Try again</button>}</div>
}

export function EmptyState({ title, message }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center"><p className="text-sm font-semibold text-slate-700">{title}</p>{message && <p className="mt-1 text-xs text-slate-400">{message}</p>}</div>
}
