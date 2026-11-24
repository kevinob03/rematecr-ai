import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '../api/client.js'

const labels = {
  economy: 'Presupuesto',
  useAndLocation: 'Uso y ubicación',
  attributes: 'Atributos del bien',
  dataCompleteness: 'Datos disponibles',
}

export function ScorePanel({ assetId }) {
  const [state, setState] = useState({ pending:false, result:null, error:null })
  async function load() {
    setState({ pending:true,result:null,error:null })
    try {
      const result = await api('/agents/score/' + encodeURIComponent(assetId))
      setState({ pending:false,result,error:null })
    } catch (error) { setState({ pending:false,result:null,error }) }
  }
  return <section className="card source-card stack">
    <div className="panel-heading"><span className="panel-icon"><Sparkles size={19} aria-hidden="true" /></span><h2>RemateScore</h2></div>
    <p>Afinidad preliminar basada en las preferencias y los datos disponibles. No representa rentabilidad ni seguridad del bien.</p>
    <div><button type="button" className="button secondary" disabled={state.pending} onClick={load}>
      {state.pending ? 'Evaluando…' : 'Consultar afinidad'}</button></div>
    {state.error && <p className="inline-error" role="alert">{state.error.message}</p>}
    {state.result && <div role="status" className="answer stack">
      <p><strong>{state.result.status === 'not_evaluable' ? 'No evaluable con la evidencia disponible' : 'Puntaje preliminar · ' + state.result.score + '/100'}</strong></p>
      <small>Pesos propuestos · versión {state.result.version}</small>
      <dl className="totals-list">{state.result.breakdown.map(part => <div key={part.id}>
        <dt>{labels[part.id]} · {Math.round(part.weight * 100)}%</dt>
        <dd>{part.status === 'missing' ? 'Falta evidencia' : part.value + '/100'}</dd>
      </div>)}</dl>
      <p>{state.result.explanation}</p>
    </div>}
  </section>
}
