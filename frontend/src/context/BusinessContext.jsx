import { createContext, useContext, useState } from 'react'

const BusinessContext = createContext(null)

export function BusinessProvider({ children }) {
  const [business, setBusinessState] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('bms_business')) } catch { return null }
  })

  const switchBusiness = (nextBusiness) => {
    setBusinessState(null)
    sessionStorage.removeItem('bms_business')
    if (!nextBusiness) return
    setBusinessState(nextBusiness)
    sessionStorage.setItem('bms_business', JSON.stringify(nextBusiness))
  }

  const clearBusiness = () => switchBusiness(null)

  return <BusinessContext.Provider value={{ business, switchBusiness, clearBusiness }}>{children}</BusinessContext.Provider>
}

export const useBusiness = () => useContext(BusinessContext)
