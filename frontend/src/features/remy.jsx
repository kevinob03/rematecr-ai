import {useState} from 'react'
import {Link} from 'react-router-dom'
import {api} from '../api/client.js'
import {money} from '../app/format.js'
import {PageHeading} from '../components/ui.jsx'

export function RemyPage(){
  const [busy,setBusy]=useState(false)
  const [answer,setAnswer]=useState(null)
  const [error,setError]=useState('')
  async function submit(event){
    event.preventDefault();setBusy(true);setError('');setAnswer(null)
    const query=new FormData(event.currentTarget).get('query')
    try{setAnswer(await api('/agents/remy',{method:'POST',body:{query}}))}
    catch(problem){setError(problem.message)}
    finally{setBusy(false)}
  }
  return <><PageHeading title="Remy">Guía para buscar, comparar y consultar bienes.</PageHeading>
    <form className="card form-card stack" onSubmit={submit}>
      <label className="field">¿Qué necesitás hacer?<textarea name="query" required minLength={2} maxLength={500} rows={3} /></label>
      <small>La consulta se enviará al proveedor de IA. No incluyás información personal.</small>
      <div><button className="button primary" disabled={busy}>{busy?'Preparando guía…':'Consultar a Remy'}</button></div>
    </form>
    {error&&<p className="inline-error" role="alert">{error}</p>}
    {answer&&<section className="card form-card stack" role="status"><p>{answer.message}</p>
      {answer.path&&<Link className="button secondary" to={answer.path}>Abrir esta sección</Link>}
      {answer.items?.length>0&&<ul>{answer.items.map(item=><li key={item.id}>
        <Link to={'/bienes/'+item.id}>{item.title}</Link> · {money(item.price)} · {item.source}
      </li>)}</ul>}
    </section>}
  </>
}
