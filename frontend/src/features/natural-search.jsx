import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useRemote } from '../api/useRemote.js'

export function NaturalSearch({ apply }) {
  const capabilities = useRemote('/capabilities')
  const request = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => request.current?.abort(), [])
  if (!capabilities.data?.searchAgent) return null

  async function submit(event) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('query')
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    try {
      const { filters } = await api('/agents/search', { method: 'POST', body: { query }, signal: controller.signal })
      const next = new URLSearchParams()
      if (filters.category) next.set('categoria', filters.category)
      if (filters.search) next.set('q', filters.search)
      if (filters.minPrice !== undefined) next.set('minPrice', String(filters.minPrice))
      if (filters.maxPrice !== undefined) next.set('maxPrice', String(filters.maxPrice))
      if (!controller.signal.aborted) apply(next)
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return <details className="card form-card"><summary>Buscar con IA</summary>
    <form className="stack" onSubmit={submit}>
      <label className="field">¿Qué bien buscás?<input name="query" required maxLength={300}
        placeholder="Vehículos de hasta 4 millones de colones" /></label>
      <small>La consulta se enviará al proveedor de IA para interpretar los filtros. Omití datos personales.</small>
      <div><button className="button secondary" disabled={busy}>{busy ? 'Interpretando…' : 'Buscar en el catálogo'}</button></div>
      {error && <p role="alert">{error} Podés seguir usando los filtros del catálogo.</p>}
    </form></details>
}
