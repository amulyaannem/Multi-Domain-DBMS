import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BusinessProvider } from './context/BusinessContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import WorkspaceSelector from './pages/WorkspaceSelector'
import RegisterBusiness from './pages/RegisterBusiness'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function ProtectedRoutes() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#EBEDF0] text-sm font-semibold text-slate-500">Loading…</div>
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function PublicRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#EBEDF0] text-sm font-semibold text-slate-500">Loading…</div>
  return isAuthenticated ? <Navigate to="/workspaces" replace /> : <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<ProtectedRoutes />}>
              <Route element={<AppLayout />}>
                <Route path="/workspaces" element={<WorkspaceSelector />} />
                <Route path="/register-business" element={<RegisterBusiness />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
