import { useEffect, useState } from 'react'
import { api } from './client.js'

export function useRemote(path) {
  const [state, setState] = useState({ path: null, data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!path) return
    const request = new AbortController()
    api(path, { signal: request.signal }).then(
      data => setState({ path, attempt, data, error: null }),
      error => {
        if (!request.signal.aborted) setState({ path, attempt, data: null, error })
      },
    )
    return () => request.abort()
  }, [path, attempt])

  const current = state.path === path && state.attempt === attempt
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    pending: Boolean(path) && !current,
    retry: () => setAttempt(value => value + 1),
  }
}
