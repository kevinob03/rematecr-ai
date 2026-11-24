import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'

const Session = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api('/auth/me', { signal: controller.signal }).then(
      data => { setUser(data.user); setError(null); setPending(false) },
      failure => {
        if (controller.signal.aborted) return
        setUser(null)
        setError(failure.status === 401 ? null : failure)
        setPending(false)
      },
    )
    return () => controller.abort()
  }, [attempt])

  async function login(email, password) {
    const { user: account } = await api('/auth/login', { method: 'POST', body: { email, password } })
    setUser(account)
    setError(null)
    return account
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
    setError(null)
  }
  function retry() {
    setPending(true)
    setAttempt(value => value + 1)
  }
  return <Session.Provider value={{ user, pending, error, login, logout, retry, setAccount: setUser }}>{children}</Session.Provider>
}

export function useSession() {
  return useContext(Session)
}
