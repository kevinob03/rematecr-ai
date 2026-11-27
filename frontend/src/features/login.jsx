import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../app/session.jsx'
import { BackLink, PageHeading } from '../components/ui.jsx'
import { useRemote } from '../api/useRemote.js'

const demoProfiles = [
  { label: 'Comprador', email: 'comprador@example.test' },
  { label: 'Comprador 2', email: 'comprador2@example.test' },
  { label: 'Administrador', email: 'admin@example.test' },
  { label: 'Auditor', email: 'auditor@example.test' },
]
const demoPassword = 'RemateCR-demo-2026!'

function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/'
}

export function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = safePath(location.state?.from)
  const capabilities = useRemote('/capabilities')
  const [showPassword, setShowPassword] = useState(false)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setProblem('')
    setBusy(true)
    try {
      await session.login(fields.get('email'), fields.get('password'))
      navigate(returnTo, { replace: true })
    } catch (error) { setProblem(error.message) }
    finally { setBusy(false) }
  }

  async function loginAsDemo(email) {
    setProblem('')
    setBusy(true)
    try {
      await session.login(email, demoPassword)
      navigate(returnTo, { replace: true })
    } catch (error) { setProblem(error.message) }
    finally { setBusy(false) }
  }

  if (session.user) return <Navigate to={returnTo} replace />

  return <>
    <BackLink />
    <PageHeading title="Iniciá sesión">Ingresá a tu cuenta para comparar bienes y darles seguimiento.</PageHeading>
    <div className="split auth-grid">
      <form className="card form-card stack" onSubmit={submit}>
        <div className="field"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
        <div className="field"><label htmlFor="password">Contraseña</label>
          <div className="password-wrap"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
          </div>
        </div>
        {problem ? <p className="inline-error" role="alert">{problem}</p> : null}
        <div><button className="button primary" disabled={busy} type="submit">{busy ? 'Ingresando…' : 'Ingresar'} <ArrowRight size={16} aria-hidden="true" /></button></div>
        <Link to="/recuperar">Olvidé mi contraseña</Link>
        <Link to="/registro">Crear cuenta de comprador</Link>
        <Link to="/baja-recibida">Consultar una solicitud de baja</Link>
      </form>
      <section className="card source-card auth-side">
        <div className="panel-heading"><span className="panel-icon"><ShieldCheck size={21} aria-hidden="true" /></span><h2>Acceso por perfil</h2></div>
        <p>El comprador accede a sus comparaciones y solicitudes. El administrador puede revisar las solicitudes y actualizar sus etapas.</p>
        {import.meta.env.DEV && capabilities.data?.demoAccountsEnabled ? <div className="stack demo-access">
          <h3>Acceso rápido de prueba</h3>
          <p>Usa cuentas ficticias del entorno local de demostración.</p>
          {demoProfiles.map(profile => <button key={profile.email} className="button secondary" type="button" disabled={busy} onClick={() => loginAsDemo(profile.email)}>
            {busy ? 'Ingresando…' : `Entrar como ${profile.label}`}
          </button>)}
        </div> : null}
      </section>
    </div>
  </>
}
