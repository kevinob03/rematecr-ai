import { createContext, useContext, useEffect, useState } from 'react'

const Comparison = createContext(null)
const key = 'rematecr-comparison-v1'

function initialItems() {
  try {
    const list = JSON.parse(sessionStorage.getItem(key) || '[]')
    return Array.isArray(list) ? [...new Set(list.filter(id => typeof id === 'string' && /^[a-f\d-]{36}$/i.test(id)))].slice(0, 2) : []
  } catch {
    return []
  }
}

export function ComparisonProvider({ children }) {
  const [ids, setIds] = useState(initialItems)
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(ids)) } catch { /* optional browser preference */ }
  }, [ids])
  function toggle(id) {
    setIds(items => items.includes(id) ? items.filter(item => item !== id) : [...items.slice(-1), id])
  }
  return <Comparison.Provider value={{ ids, toggle, setIds }}>{children}</Comparison.Provider>
}

export function useComparison() {
  return useContext(Comparison)
}
