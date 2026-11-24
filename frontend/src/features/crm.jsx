import { ArrowRight, CalendarClock, ClipboardList, FileCheck2, Info, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useRemote } from '../api/useRemote.js'
import { displayDate, STAGES, stageLabel } from '../app/format.js'
import { useSession } from '../app/session.jsx'
import { BackLink, Empty, Loading, PageHeading, Pagination, Problem } from '../components/ui.jsx'

function Stage({ value }) {
  return <span className={'badge stage stage-' + value}><span className="status-dot" />{stageLabel[value] || value}</span>
}

function RequestList({ items }) {
  return <section className="card">
    <div className="section-heading"><h2>Mis solicitudes</h2><span>{items.length} {items.length === 1 ? 'solicitud' : 'solicitudes'}</span></div>
    <div className="request-list">
      {items.map(item => <Link className="request-list-row" to={'/seguimiento/' + encodeURIComponent(item.id)} key={item.id}>
        <div><strong>{item.subject}</strong><span>{item.assetTitle} · {displayDate(item.updatedAt)}</span></div>
        <Stage value={item.stage} /><ArrowRight size={18} aria-hidden="true" />
      </Link>)}
    </div>
  </section>
}

function Board({ items }) {
  const grouped = Object.groupBy(items, item => item.stage)
  const pending = (grouped.received?.length || 0) + (grouped.follow_up?.length || 0)
  return <>
    <div className="crm-overview">
      <section className="card metric-card"><span className="panel-icon"><ClipboardList size={19} aria-hidden="true" /></span><div><h2>Solicitudes en esta página</h2><strong>{items.length}</strong></div></section>
      <section className="card metric-card"><span className="panel-icon"><CalendarClock size={19} aria-hidden="true" /></span><div><h2>Por revisar o dar seguimiento en esta página</h2><strong>{pending}</strong></div></section>
    </div>
    <section className="card">
      <div className="section-heading"><div><h2>Tablero por etapas</h2><p>Abrí una solicitud para consultar su historial y actualizar su estado.</p></div></div>
      <div className="crm-board">
        {STAGES.map(([stage, label]) => {
          const requests = grouped[stage] || []
          return <section className="board-column" key={stage}>
            <h3>{label} <span>{requests.length}</span></h3>
            {requests.length ? requests.map(item => <Link className="board-ticket" to={'/seguimiento/' + encodeURIComponent(item.id)} key={item.id}>
              <strong>{item.subject}</strong><span>{item.assetTitle}</span><small>{displayDate(item.updatedAt)}</small>
            </Link>) : <p className="board-empty">Sin solicitudes</p>}
          </section>
        })}
      </div>
    </section>
  </>
}

export function CrmPage() {
  const { user } = useSession()
  const [page, setPage] = useState(1)
  const remote = useRemote('/crm/requests?page=' + page)
  const admin = user.role === 'admin'
  return <>
    <PageHeading title={admin ? 'Tablero de seguimiento' : 'Mis solicitudes'} action={admin ? null : <Link to="/" className="button secondary">Explorar bienes <ArrowRight size={17} aria-hidden="true" /></Link>}>
      {admin ? 'Revisá las consultas ingresadas y organizá su atención.' : 'Consultá el estado de tus solicitudes y los cambios registrados.'}
    </PageHeading>
    {remote.pending ? <Loading label="Cargando solicitudes" /> : remote.error ? <Problem error={remote.error} retry={remote.retry} /> :
      admin ? <Board items={remote.data.items} /> : remote.data.items.length ? <RequestList items={remote.data.items} /> :
        <Empty icon={ClipboardList} title="Todavía no tenés solicitudes" action={<Link className="button primary" to="/">Explorar catálogo <ArrowRight size={16} aria-hidden="true" /></Link>}>Podés pedir seguimiento desde la ficha de un bien.</Empty>}
    {remote.data ? <Pagination page={page} nextPage={remote.data.nextPage} onChange={setPage} /> : null}
  </>
}

export function RequestPage() {
  const { assetId } = useParams()
  const navigate = useNavigate()
  const remote = useRemote('/assets/' + encodeURIComponent(assetId))
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setFormError('')
    setBusy(true)
    try {
      const { request } = await api('/crm/requests', {
        method: 'POST',
        body: { assetId, subject: fields.get('subject').trim(), comment: fields.get('comment').trim(), consent: fields.get('consent') === 'on' },
      })
      navigate('/seguimiento/' + encodeURIComponent(request.id), { replace: true, state: { created: true } })
    } catch (error) { setFormError(error.message) }
    finally { setBusy(false) }
  }
  return <>
    <BackLink to={'/bienes/' + encodeURIComponent(assetId)}>Volver a la ficha</BackLink>
    <PageHeading title="Solicitar seguimiento">Pedile al equipo ayuda para continuar la evaluación de un bien.</PageHeading>
    {remote.pending ? <Loading label="Cargando el bien" /> : remote.error ? <Problem error={remote.error} retry={remote.retry} /> :
      <div className="split">
        <form className="card form-card stack" onSubmit={submit}>
          <h2>Solicitud sobre {remote.data.asset.title}</h2>
          <div className="field"><label htmlFor="subject">Tema</label><input id="subject" name="subject" required minLength={3} maxLength={180} /></div>
          <div className="field"><label htmlFor="comment">Comentario opcional</label><textarea id="comment" name="comment" maxLength={2000} rows={5} /></div>
          <label className="check-field"><input type="checkbox" name="consent" required /><span>Autorizo compartir el tema, el comentario y el bien con el equipo que atiende las solicitudes.</span></label>
          {formError ? <p role="alert" className="inline-error">{formError}</p> : null}
          <div><button type="submit" className="button primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar solicitud'} <ArrowRight size={17} aria-hidden="true" /></button></div>
        </form>
        <section className="card source-card align-start">
          <div className="panel-heading"><span className="panel-icon"><ShieldCheck size={20} aria-hidden="true" /></span><h2>Acceso a la solicitud</h2></div>
          <p>Podrás consultar los cambios de etapa desde Mis solicitudes. Compartí únicamente lo necesario para explicar tu consulta.</p>
        </section>
      </div>}
  </>
}

function RequestEditor({ record, canUpdate }) {
  const [request, setRequest] = useState(record)
  const [stage, setStage] = useState(record.stage)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  async function changeStage(event) {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    setNotice('')
    try {
      const { request: updated } = await api('/crm/requests/' + encodeURIComponent(request.id) + '/stage', { method: 'PATCH', body: { stage } })
      setRequest(updated)
      setStage(updated.stage)
      setNotice('Etapa actualizada.')
    } catch (error) { setFormError(error.message) }
    finally { setBusy(false) }
  }

  return <div className="split">
    <div className="stack">
      <section className="card">
        <div className="section-heading"><h2>{request.subject}</h2><Stage value={request.stage} /></div>
        <dl className="facts"><div><dt>Bien</dt><dd><Link to={'/bienes/' + encodeURIComponent(request.assetId)}>{request.assetTitle}</Link></dd></div><div><dt>Registrada</dt><dd>{displayDate(request.createdAt)}</dd></div></dl>
        <div className="comment-content"><h3>Comentario compartido</h3><p>{request.comment || 'Sin comentario'}</p></div>
      </section>
      {canUpdate ? <form className="card form-card stack" onSubmit={changeStage}>
        <h2>Actualizar etapa</h2>
        <div className="field"><label htmlFor="stage">Nueva etapa</label><select id="stage" value={stage} onChange={event => setStage(event.target.value)}>{STAGES.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></div>
        {formError ? <p className="inline-error" role="alert">{formError}</p> : null}
        {notice ? <p className="inline-success" role="status">{notice}</p> : null}
        <div><button className="button primary" type="submit" disabled={busy || stage === request.stage}>{busy ? 'Guardando…' : 'Guardar etapa'} <ArrowRight size={17} aria-hidden="true" /></button></div>
      </form> : null}
    </div>
    <section className="card align-start">
      <div className="panel-heading"><span className="panel-icon"><CalendarClock size={20} aria-hidden="true" /></span><h2>Historial de etapas</h2></div>
      {request.history?.length ? <ol className="timeline">{[...request.history].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map((entry, index) =>
        <li key={entry.at + ':' + index}><strong>{stageLabel[entry.stage] || entry.stage}</strong><span>{displayDate(entry.at)}</span></li>)}</ol> :
        <p>Todavía no hay cambios registrados.</p>}
    </section>
  </div>
}

export function RequestDetails() {
  const { requestId } = useParams()
  const { user } = useSession()
  const { state } = useLocation()
  const remote = useRemote('/crm/requests/' + encodeURIComponent(requestId))
  return <>
    <BackLink to="/seguimiento">Volver a seguimiento</BackLink>
    <PageHeading title="Detalle de la solicitud" />
    {state?.created ? <div className="tip" role="status"><FileCheck2 size={19} aria-hidden="true" /> Solicitud recibida. Podés consultar su estado en esta pantalla.</div> : null}
    {remote.pending ? <Loading label="Cargando solicitud" /> : remote.error ? <Problem error={remote.error} retry={remote.retry} /> : <RequestEditor key={requestId} record={remote.data.request} canUpdate={user.role === 'admin'} />}
  </>
}

export function AuditPage() {
  const remote = useRemote('/audit/summary')
  return <>
    <PageHeading title="Resumen de auditoría">Consultá la actividad registrada del seguimiento.</PageHeading>
    {remote.pending ? <Loading label="Cargando resumen" /> : remote.error ? <Problem error={remote.error} retry={remote.retry} /> : <>
      <div className="crm-overview">
        <section className="card metric-card"><span className="panel-icon"><ClipboardList size={19} aria-hidden="true" /></span><div><h2>Solicitudes registradas</h2><strong>{remote.data.totalRequests}</strong></div></section>
        <section className="card metric-card"><span className="panel-icon"><CalendarClock size={19} aria-hidden="true" /></span><div><h2>Eventos de etapa registrados</h2><strong>{remote.data.totalTransitions}</strong></div></section>
      </div>
      <section className="card"><h2>Solicitudes por etapa</h2><dl className="facts">{STAGES.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{remote.data.requestsByStage[key] ?? 0}</dd></div>)}</dl></section>
      <div className="tip"><Info size={19} aria-hidden="true" /> Este panel muestra cantidades agregadas.</div>
    </>}
  </>
}
