import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useRemote } from '../api/useRemote.js'
import { Loading, Pagination, Problem } from '../components/ui.jsx'
import { money } from '../app/format.js'

export function BuyerPreferences() {
  const settings = useRemote('/preferences')
  const [page, setPage] = useState(1)
  const alerts = useRemote('/alerts?page=' + page)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function save(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const raw = fields.get('budget')
    setBusy(true)
    setMessage('')
    try {
      await api('/preferences', { method: 'PUT', body: { budget: raw === '' ? null : Number(raw),
        categories: fields.getAll('categories'), alertsEnabled: fields.has('alerts') } })
      setMessage('Guardamos tus preferencias.')
    } catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }
  return <div className="split auth-grid">
    <section className="card form-card"><h2>Preferencias privadas</h2>
      {settings.pending ? <Loading label="Cargando preferencias" /> : settings.error ? <Problem error={settings.error} retry={settings.retry} /> :
        <form className="stack" onSubmit={save}>
          <label className="field">Presupuesto máximo (₡)<input type="number" min="0" max="2147483647" step="1" name="budget" defaultValue={settings.data.budget ?? ''} /></label>
          <fieldset><legend>Categorías de interés</legend>{[['vehicle','Vehículos'],['property','Inmuebles']].map(([id,label]) =>
            <label key={id}><input type="checkbox" name="categories" value={id} defaultChecked={settings.data.categories.includes(id)} /> {label} </label>)}</fieldset>
          <label><input type="checkbox" name="alerts" defaultChecked={settings.data.alertsEnabled} /> Recibir alertas dentro de RemateCR AI cuando coincidan la categoría y el precio publicado.</label>
          <div><button className="button secondary" disabled={busy}>Guardar preferencias</button></div>
          {message && <p role="status">{message}</p>}
        </form>}
    </section>
    <section className="card form-card"><h2>Mis alertas</h2>
      {alerts.pending ? <Loading label="Cargando alertas" /> : alerts.error ? <Problem error={alerts.error} retry={alerts.retry} /> :
        <>{alerts.data.items.length ? <ul>{alerts.data.items.map(item =>
          <li key={item.id}><Link to={'/bienes/' + item.assetId}>{item.title}</Link> · {money(item.price)} al generar la alerta</li>
        )}</ul> : <p>Todavía no tenés alertas en esta página.</p>}
          <Pagination page={page} nextPage={alerts.data.nextPage} onChange={setPage} />
          <button className="button secondary" onClick={alerts.retry}>Actualizar alertas</button></>}
    </section></div>
}
