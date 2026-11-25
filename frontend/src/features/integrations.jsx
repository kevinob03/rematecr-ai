import {CheckCircle2, CircleAlert, CircleDashed, Link2} from 'lucide-react'
import {useRemote} from '../api/useRemote.js'
import {Loading,PageHeading,Problem} from '../components/ui.jsx'

function State({configured,connectionChecked}){
  if(connectionChecked)return <span className="badge"><CheckCircle2 size={15} aria-hidden="true"/>Conexión comprobada</span>
  if(configured)return <span className="badge"><CircleDashed size={15} aria-hidden="true"/>Configurado; falta comprobar</span>
  return <span className="badge"><CircleAlert size={15} aria-hidden="true"/>Pendiente de configuración</span>
}

export function IntegrationReadiness(){
  const remote=useRemote('/admin/integrations')
  return <>
    <PageHeading title="Integraciones y preparación">Este panel muestra si hay configuración local. No prueba conexión ni revela valores secretos.</PageHeading>
    {remote.pending?<Loading label="Consultando configuración"/>:remote.error?<Problem error={remote.error} retry={remote.retry}/>:<>
      <section className="card form-card stack">
        <h2>Entorno actual</h2>
        <p>Modo: <strong>{remote.data.environment==='production'?'Producción':'Desarrollo'}</strong></p>
        <p>Base de datos: <strong>{remote.data.database.provider==='postgresql'?'PostgreSQL':'PGlite local'}</strong></p>
        <p>Datos de demostración: <strong>{remote.data.database.demoData?'Activos':'Desactivados'}</strong></p>
      </section>
      <div className="stack integration-list">
        {remote.data.integrations.map(item=><article className="card form-card stack" key={item.id}>
          <div className="section-heading"><h2><Link2 size={18} aria-hidden="true"/> {item.name}</h2><State configured={item.configured} connectionChecked={item.connectionChecked}/></div>
          <p>{item.detail}</p>
        </article>)}
      </div>
    </>}
  </>
}
