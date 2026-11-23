import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, login as loginRequest } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('bms_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('bms_token')
    if (!token) {
      setLoading(false)
      return
    }
    getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => {
        sessionStorage.removeItem('bms_token')
        sessionStorage.removeItem('bms_user')
        sessionStorage.removeItem('bms_business')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await loginRequest(email, password)
    sessionStorage.setItem('bms_token', data.token)
    sessionStorage.setItem('bms_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    sessionStorage.removeItem('bms_token')
    sessionStorage.removeItem('bms_user')
    sessionStorage.removeItem('bms_business')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: Boolean(user) }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
