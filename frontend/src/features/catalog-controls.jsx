import { useState } from 'react'
import { api } from '../api/client.js'
import { useRemote } from '../api/useRemote.js'
import { Loading, Pagination, Problem } from '../components/ui.jsx'
import { money } from '../app/format.js'

export function PriceHistory({ assetId }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const result = useRemote(open ? '/assets/' + assetId + '/prices?page=' + page : null)
  return <details className="card form-card" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Historial del precio publicado</summary>
    {open && (result.pending ? <Loading label="Cargando historial" /> : result.error ? <Problem error={result.error} retry={result.retry} /> :
      result.data && <><p>La fecha indica cuándo RemateCR AI registró el precio de la fuente.</p>
        {result.data.items.length ? <ul>{result.data.items.map(item => <li key={item.id}>{money(item.price)} · {item.source} · {new Date(item.observedAt).toLocaleDateString('es-CR', {timeZone:'America/Costa_Rica'})}</li>)}</ul> : <p>Sin observaciones registradas.</p>}
        <Pagination page={page} nextPage={result.data.nextPage} onChange={setPage} /></>)}
  </details>
}

export function PriceRange({ params, setParams }) {
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const low = fields.get('minPrice')
    const high = fields.get('maxPrice')
    if (low && high && Number(low) > Number(high)) {
      setError('El precio mínimo debe ser menor o igual al máximo.')
      return
    }
    const next = new URLSearchParams(params)
    for (const key of ['minPrice', 'maxPrice']) {
      if (fields.get(key)) next.set(key, String(Number(fields.get(key))))
      else next.delete(key)
    }
    next.delete('pagina')
    setError('')
    setParams(next)
  }
  return <details className="card form-card"><summary>Filtrar por precio publicado</summary>
    <form className="stack" onSubmit={submit}>
      <div className="double">{[['minPrice','Mínimo'], ['maxPrice','Máximo']].map(([key,label]) =>
        <label key={key} className="field">{label} (₡)<input type="number" min="0" max="2147483647" step="1"
          name={key} defaultValue={params.get(key) || ''} /></label>)}</div>
      <div><button className="button secondary">Aplicar precio</button></div>{error && <p role="alert">{error}</p>}
    </form></details>
}

export function FavoriteButton({ assetId }) {
  const path = '/favorites/' + encodeURIComponent(assetId)
  const remote = useRemote(path)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function toggle() {
    setBusy(true)
    setError('')
    try {
      await api(path, { method: remote.data.saved ? 'DELETE' : 'PUT' })
      remote.retry()
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  if (remote.error) return <Problem error={remote.error} retry={remote.retry} />
  return <div><button className="button secondary" disabled={busy || remote.pending} aria-pressed={Boolean(remote.data?.saved)} onClick={toggle}>
    {remote.data?.saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}</button>{error && <p role="alert">{error}</p>}</div>
}
