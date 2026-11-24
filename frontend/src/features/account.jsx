import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useRemote } from '../api/useRemote.js'
import { useSession } from '../app/session.jsx'
import { BuyerPreferences } from './preferences.jsx'
import { BackLink, Loading, PageHeading, Problem } from '../components/ui.jsx'

const flows = {
  register: { title: 'Crear cuenta', action: 'Crear cuenta de comprador', endpoint: '/auth/register', done: 'Podés ingresar con tu correo y contraseña. Si ya tenías cuenta, usá tu contraseña anterior.' },
  recover: { title: 'Recuperar acceso', action: 'Solicitar enlace', endpoint: '/auth/recover', done: 'Si hay una cuenta activa con ese correo, recibirás un enlace válido durante 20 minutos.' },
  reset: { title: 'Elegir otra contraseña', action: 'Guardar contraseña', endpoint: '/auth/reset', done: 'Guardamos tu contraseña y cerramos las sesiones anteriores.' },
}

function Field({ name, label, ...props }) {
  return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} required {...props} /></div>
}

export function AccountAccess({ mode }) {
  const flow = flows[mode]
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [done, setDone] = useState(false)
  const [token] = useState(() => window.location.hash.slice(1))
  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const body = Object.fromEntries(fields)
    if (mode === 'register') Object.assign(body, { version: 'cuenta-v2', accepted: fields.has('terms') && fields.has('privacy') })
    if (mode === 'reset') body.token = token
    if (body.password && new TextEncoder().encode(body.password).length > 72) {
      setProblem('La contraseña supera los 72 bytes. Probá con una más corta.')
      return
    }
    setBusy(true)
    setProblem('')
    try {
      await api(flow.endpoint, { method: 'POST', body })
      setDone(true)
    } catch (error) { setProblem(error.message) }
    finally { setBusy(false) }
  }
  return <><BackLink /><PageHeading title={flow.title} />
    {done ? <section className="card form-card stack"><p role="status">{flow.done}</p><Link to="/login">Iniciar sesión</Link></section> :
    <form className="card form-card stack" onSubmit={submit}>
      {mode === 'register' && <Field name="name" label="Nombre" maxLength={120} autoComplete="name" />}
      {mode !== 'reset' && <Field name="email" label="Correo electrónico" type="email" maxLength={254} autoComplete="email" />}
      {mode !== 'recover' && <Field name="password" label="Nueva contraseña (mínimo 12 caracteres)" type="password" minLength={12} maxLength={72} autoComplete="new-password" />}
      {mode === 'register' && <>
        <label><input type="checkbox" name="terms" value="terminos-demo-v1" required /> Acepto los <Link to="/politicas#terminos-demo-v1" target="_blank" rel="noreferrer">términos de uso de la demostración</Link>.</label>
        <label><input type="checkbox" name="privacy" value="privacidad-demo-v1" required /> Acepto la <Link to="/politicas#privacidad-demo-v1" target="_blank" rel="noreferrer">política de privacidad de la demostración</Link>.</label>
      </>}
      {problem && <p role="alert" className="inline-error">{problem}</p>}
      <div><button className="button primary" disabled={busy}>{flow.action}</button></div>
      {mode === 'reset' && <Link to="/recuperar">Solicitar otro enlace</Link>}
    </form>}</>
}

function PendingClosures() {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const result = useRemote('/auth/closures?limit=20&page=' + page)
  async function approve() {
    setBusy(true)
    setProblem('')
    try {
      await api('/auth/closures/' + selected + '/approve', { method: 'POST' })
      setSelected(null)
      result.retry()
    } catch (error) { setProblem(error.message) }
    finally { setBusy(false) }
  }
  return <section className="card form-card stack">
    <h2>Solicitudes de baja pendientes</h2>
    {result.pending && <Loading label="Cargando solicitudes" />}
    {result.error && <Problem error={result.error} retry={result.retry} />}
    {result.data && (result.data.items.length ? <ul>{result.data.items.map(item =>
      <li key={item.id}>{new Date(item.requestedAt).toLocaleDateString('es-CR')} · Folio {item.id}
        <button className="button secondary" disabled={busy} onClick={() => setSelected(item.id)}>Revisar baja</button></li>
    )}</ul> : <p>No hay solicitudes pendientes.</p>)}
    {selected && <div><p>Al aprobar el folio {selected} se eliminarán la cuenta y sus solicitudes de seguimiento, incluidos los comentarios y el historial. Solo se conservarán conteos anónimos del CRM.</p>
      <button className="button primary" disabled={busy} onClick={approve}>Aprobar baja definitiva</button>
      <button className="button secondary" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button></div>}
    {problem && <p role="alert">{problem}</p>}
    {page > 1 && <button className="button secondary" onClick={() => setPage(page - 1)}>Anterior</button>}
    {result.data?.nextPage && <button className="button secondary" onClick={() => setPage(result.data.nextPage)}>Siguiente</button>}
  </section>
}

export function Profile() {
  const accepted = useRemote('/auth/acceptances')
  const { user, setAccount } = useSession()
  const [problem, setProblem] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setProblem('')
    setMessage('')
    setBusy(true)
    try {
      if (fields.has('password')) {
        const { receipt } = await api('/auth/closure', { method: 'POST', body: { password: fields.get('password'), confirmed: fields.has('confirmed') } })
        window.location.replace('/baja-recibida#' + receipt.id)
      } else {
        const data = await api('/auth/me', { method: 'PATCH', body: { name: fields.get('name') } })
        setAccount(data.user)
        setMessage('Nombre actualizado.')
      }
    } catch (error) { setProblem(error.message) }
    finally { setBusy(false) }
  }
  return <><PageHeading title="Mi cuenta">{user.email}</PageHeading>
    {problem && <p className="inline-error" role="alert">{problem}</p>}
    <div className="split auth-grid">
      <form className="card form-card stack" onSubmit={submit}>
        <Field name="name" label="Nombre" defaultValue={user.name} maxLength={120} autoComplete="name" />
        <button className="button secondary" disabled={busy}>Guardar nombre</button>
        {message && <p role="status">{message}</p>}
      </form>
      <form className="card form-card stack" onSubmit={submit}>
        <h2>Solicitar baja de cuenta</h2><p>Al confirmar se cerrarán tus sesiones. Tras la aprobación se eliminarán tu cuenta y tus solicitudes de seguimiento. Del CRM quedarán únicamente estadísticas anónimas. Guardá el folio para consultar el resultado.</p>
        <Field name="password" label="Contraseña actual" type="password" autoComplete="current-password" />
        <label><input name="confirmed" type="checkbox" required /> Confirmo que quiero solicitar la baja.</label>
        <button className="button secondary" disabled={busy}>Confirmar solicitud de baja</button>
      </form>
    </div>{user.role === 'buyer' && <BuyerPreferences />}{user.role === 'admin' && <PendingClosures />}
    <section className="card form-card"><h2>Aceptaciones de políticas</h2>
      {accepted.error ? <Problem error={accepted.error} retry={accepted.retry} /> : accepted.pending ? <Loading label="Cargando aceptaciones" /> :
        accepted.data.items.length ? <ul>{accepted.data.items.map(row => <li key={row.id}>{row.id} · {new Date(row.acceptedAt).toLocaleDateString('es-CR')}</li>)}</ul> :
        <p>Esta cuenta no tiene aceptaciones individuales registradas para estas versiones.</p>}
      <Link to="/politicas">Consultar los textos vigentes de la demostración</Link></section></>
}

export function PoliciesPage() {
  const result = useRemote('/policies')
  return <><BackLink /><PageHeading title="Condiciones de la demostración" />
    {result.pending ? <Loading label="Cargando políticas" /> : result.error ? <Problem error={result.error} retry={result.retry} /> :
      result.data.policies.map(policy => <section id={policy.id} key={policy.id} className="card form-card">
        <h2>{policy.title}</h2><small>Versión {policy.id}</small>{policy.paragraphs.map(text => <p key={text}>{text}</p>)}</section>)}
  </>
}
