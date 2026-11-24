import { ArrowLeft, CircleAlert, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageHeading({ title, children, action }) {
  return <header className="page-heading">
    <div><h1>{title}</h1>{children ? <p>{children}</p> : null}</div>
    {action}
  </header>
}

export function BackLink({ to = '/', children = 'Volver al catálogo' }) {
  return <Link className="back-link" to={to}><ArrowLeft size={17} aria-hidden="true" />{children}</Link>
}

export function Problem({ error, retry }) {
  return <section className="card feedback" role="alert">
    <span className="feedback-icon"><CircleAlert size={23} aria-hidden="true" /></span>
    <div><h2>Algo salió mal</h2><p>{error.message}</p>
      {retry ? <button className="button secondary" onClick={retry}>Intentar de nuevo</button> : null}
    </div>
  </section>
}

export function Empty({ title, children, action, icon: Icon = SearchX }) {
  return <section className="card feedback">
    <span className="feedback-icon"><Icon size={23} aria-hidden="true" /></span>
    <div><h2>{title}</h2>{children ? <p>{children}</p> : null}{action}</div>
  </section>
}

export function Loading({ label = 'Cargando' }) {
  return <div className="card loading" aria-busy="true" role="status">
    <span className="sr-only">{label}</span>
    <span /><span /><span />
  </div>
}

export function SourceStatus() {
  return <span className="badge"><span className="status-dot" />Datos de demostración</span>
}

export function Pagination({ page, nextPage, onChange }) {
  if (page === 1 && !nextPage) return null
  return <nav className="action-group pager" aria-label="Páginas de resultados">
    <button type="button" className="button secondary" disabled={page === 1} onClick={() => onChange(page - 1)}>Anterior</button>
    <span>Página {page}</span>
    <button type="button" className="button secondary" disabled={!nextPage} onClick={() => onChange(nextPage)}>Siguiente</button>
  </nav>
}
