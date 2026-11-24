import { lazy, Suspense, useState } from 'react'
import { ArrowRight, CircleHelp, ClipboardList, FileText, LayoutGrid, LogIn, LogOut, Scale, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Empty, Loading, PageHeading, Problem } from '../components/ui.jsx'
import { useComparison } from './comparison.jsx'
import { ROLE } from './format.js'
import { useSession } from './session.jsx'
import { CatalogPage, AssetPage, FavoritesPage } from '../features/catalog.jsx'
import { Bookmark } from 'lucide-react'
import { FileCheck2 } from 'lucide-react'
import { DocumentReview, DocumentQuestion, ImportReview } from '../features/documents.jsx'
import { RemyPage } from '../features/remy.jsx'
import { LoginPage } from '../features/login.jsx'
import { AccountAccess, PoliciesPage, Profile } from '../features/account.jsx'
import { api } from '../api/client.js'

const ComparePage = lazy(() => import('../features/compare.jsx').then(module => ({ default: module.ComparePage })))
const CrmPage = lazy(() => import('../features/crm.jsx').then(module => ({ default: module.CrmPage })))
const RequestPage = lazy(() => import('../features/crm.jsx').then(module => ({ default: module.RequestPage })))
const RequestDetails = lazy(() => import('../features/crm.jsx').then(module => ({ default: module.RequestDetails })))
const AuditPage = lazy(() => import('../features/crm.jsx').then(module => ({ default: module.AuditPage })))

function Brand() {
  return <Link to="/" className="brand">
    <span className="brand-pattern" aria-hidden="true"><svg width="23" height="23" viewBox="0 0 28 28" fill="none"><path d="M6 13.7 14 6l8 7.7M8.8 13.5V22h10.4v-8.5M11.5 17.2l2.2 2 3.7-3.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
    <span>RemateCR <strong>AI</strong></span>
  </Link>
}

function RailLink({ to, icon: Icon, children, count }) {
  return <NavLink className="rail-link" to={to} end={to === '/'}>
    <span className="rail-icon"><Icon size={21} strokeWidth={1.75} aria-hidden="true" />{count ? <span className="rail-count">{count}</span> : null}</span>
    <span>{children}</span>
  </NavLink>
}

function HeaderSearch({ initial }) {
  const [input, setInput] = useState(initial)
  const navigate = useNavigate()
  function submit(event) {
    event.preventDefault()
    const query = input.trim()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    navigate({ pathname: '/', search: params.toString() })
  }
  return <form className="header-search" role="search" onSubmit={submit}>
    <label className="sr-only" htmlFor="search-assets">Buscar bienes</label>
    <input id="search-assets" type="search" value={input} onChange={event => setInput(event.target.value)} maxLength={100} placeholder="Buscar bienes" />
    <button aria-label="Buscar bienes" type="submit"><Search size={17} /></button>
  </form>
}

function Shell() {
  const { user, pending, logout } = useSession()
  const { ids } = useComparison()
  const location = useLocation()
  const [query] = useSearchParams()
  const [signOutError, setSignOutError] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()
  async function endSession() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await logout()
      navigate('/')
    } catch (error) { setSignOutError(error) }
    finally { setSigningOut(false) }
  }
  return <div className="shell">
    <a href="#contenido" className="skip">Ir al contenido</a>
    <header className="topbar">
      <Brand />
      <div className="topbar-controls">
        <HeaderSearch key={location.pathname + location.search} initial={location.pathname === '/' ? query.get('q') || '' : ''} />
        {user ? <div className="account">
          <Link to="/perfil" aria-label="Mi cuenta"><strong>{user.name || user.email}</strong><small> · {ROLE[user.role]}</small></Link>
          <button type="button" className="account-button" onClick={endSession} disabled={signingOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={20} aria-hidden="true" /></button>
        </div> : pending ? null : <Link to="/login" className="button secondary header-login"><LogIn aria-hidden="true" size={17} /> <span>Iniciar sesión</span></Link>}
      </div>
    </header>
    <aside className="rail">
      <nav aria-label="Navegación principal">
        <RailLink to="/" icon={LayoutGrid}>Catálogo</RailLink>
        {user?.role === 'buyer' && <RailLink to="/favoritos" icon={Bookmark}>Favoritos</RailLink>}
        <RailLink to="/comparar" icon={Scale} count={ids.length}>Comparar</RailLink>
        {user?.role === 'buyer' || user?.role === 'admin' ? <RailLink to="/seguimiento" icon={ClipboardList}>Seguimiento</RailLink> : null}
        {user?.role === 'auditor' || user?.role === 'admin' ? <RailLink to="/auditoria" icon={ShieldCheck}>Auditoría</RailLink> : null}
        {user?.role === 'admin' && <RailLink to="/documentos" icon={FileCheck2}>Documentos</RailLink>}
        {user?.role === 'admin' && <RailLink to="/importaciones" icon={FileText}>Importaciones</RailLink>}
        {(user?.role === 'buyer' || user?.role === 'admin') && <RailLink to="/consultar-documentos" icon={FileText}>Consulta documental</RailLink>}
        {user?.role === 'buyer' && <RailLink to="/remy" icon={Sparkles}>Remy</RailLink>}
      </nav>
      <nav aria-label="Asistencia">
        <RailLink to="/ayuda" icon={CircleHelp}>Ayuda</RailLink>
      </nav>
    </aside>
    <main className="main" id="contenido">
      {signOutError ? <Problem error={signOutError} retry={endSession} /> : null}
      <Suspense fallback={<Loading label="Cargando pantalla" />}><Outlet /></Suspense>
      <footer className="footer"><span>RemateCR AI</span><Link to="/ayuda">Cómo se calculan los costos <ArrowRight size={13} aria-hidden="true" /></Link></footer>
    </main>
  </div>
}

function Require({ roles, children }) {
  const session = useSession()
  const location = useLocation()
  if (session.pending) return <Loading label="Comprobando sesión" />
  if (session.error) return <Problem error={session.error} retry={session.retry} />
  if (!session.user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (!roles.includes(session.user.role)) return <Empty icon={ShieldCheck} title="Este perfil no tiene acceso" action={<Link className="button secondary" to="/">Volver al catálogo</Link>}>Entrá con un perfil habilitado para esta vista.</Empty>
  return children
}

function HelpPage() {
  return <>
    <PageHeading title="Cómo usar RemateCR AI">Entendé los montos del catálogo y prepará tu evaluación.</PageHeading>
    <article className="card help-card">
      <details open><summary>¿Qué significa el costo total estimado?</summary><p>Es la suma del precio publicado y los gastos incluidos en el escenario. Las reparaciones y otros gastos mostrados en la demostración corresponden a ejemplos ficticios.</p></details>
      <details><summary>¿Qué pasa si desconozco un gasto?</summary><p>Dejá la partida en blanco en el comparador. El servicio devuelve los gastos pendientes y el subtotal de los valores conocidos. Ingresá 0 solo si sabés que el gasto es cero.</p></details>
      <details><summary>¿Quién ve una solicitud de seguimiento?</summary><p>El comprador que la registra y el equipo autorizado pueden consultar su información. Un administrador puede cambiar el estado, y el historial muestra cuándo se hizo cada cambio.</p></details>
      <details><summary>¿Puedo comprar o pujar desde el catálogo?</summary><p>RemateCR AI organiza la consulta, comparación y el seguimiento. La compra, adjudicación o puja se realiza con la fuente correspondiente.</p></details>
    </article>
  </>
}

function ClosureReceipt() {
  const { hash } = useLocation()
  const folio = hash.slice(1)
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  async function check(event) {
    event.preventDefault()
    const id = new FormData(event.currentTarget).get('folio').trim()
    setBusy(true)
    try {
      const { receipt } = await api('/auth/closure-status', { method: 'POST', body: { id } })
      setResult(receipt.status === 'completed' ? 'Baja completada. Tu cuenta y sus solicitudes se eliminaron.' : 'Tu solicitud está pendiente de revisión.')
    } catch (error) { setResult(error.message) }
    finally { setBusy(false) }
  }
  return <><PageHeading title="Consultar solicitud de baja" /><form className="card form-card stack" onSubmit={check}>
    {folio && <p>Guardá el folio privado para consultar el resultado de tu baja.</p>}
    <label className="field">Folio privado<input name="folio" required defaultValue={folio} /></label>
    <button className="button secondary" disabled={busy}>Consultar estado</button><p role="status">{result}</p>
  </form></>
}

export function App() {
  return <Routes>
    <Route element={<Shell />}>
      <Route index element={<CatalogPage />} />
      <Route path="/favoritos" element={<Require roles={['buyer']}><FavoritesPage /></Require>} />
      <Route path="/bienes/:assetId" element={<AssetPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/politicas" element={<PoliciesPage />} />
      <Route path="/registro" element={<AccountAccess key="register" mode="register" />} />
      <Route path="/recuperar" element={<AccountAccess key="recover" mode="recover" />} />
      <Route path="/restablecer" element={<AccountAccess key="reset" mode="reset" />} />
      <Route path="/perfil" element={<Require roles={['buyer','admin','auditor']}><Profile /></Require>} />
      <Route path="/baja-recibida" element={<ClosureReceipt />} />
      <Route path="/comparar" element={<Require roles={['buyer', 'admin']}><ComparePage /></Require>} />
      <Route path="/seguimiento" element={<Require roles={['buyer', 'admin']}><CrmPage /></Require>} />
      <Route path="/seguimiento/nuevo/:assetId" element={<Require roles={['buyer']}><RequestPage /></Require>} />
      <Route path="/seguimiento/:requestId" element={<Require roles={['buyer', 'admin']}><RequestDetails /></Require>} />
      <Route path="/auditoria" element={<Require roles={['auditor', 'admin']}><AuditPage /></Require>} />
      <Route path="/documentos" element={<Require roles={['admin']}><DocumentReview /></Require>} />
      <Route path="/importaciones" element={<Require roles={['admin']}><ImportReview /></Require>} />
      <Route path="/consultar-documentos" element={<Require roles={['buyer','admin']}><DocumentQuestion /></Require>} />
      <Route path="/remy" element={<Require roles={['buyer']}><RemyPage /></Require>} />
      <Route path="/ayuda" element={<HelpPage />} />
      <Route path="*" element={<Empty title="No encontramos esa página" action={<Link className="button secondary" to="/">Volver al catálogo</Link>} />} />
    </Route>
  </Routes>
}
