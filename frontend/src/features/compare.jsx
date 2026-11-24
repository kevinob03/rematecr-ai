import { ArrowDownToLine, ArrowRight, Calculator, CheckCircle2, CircleHelp, Info, Scale, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useRemote } from '../api/useRemote.js'
import { useSession } from '../app/session.jsx'
import { DollarReference } from '../components/exchange.jsx'
import { useComparison } from '../app/comparison.jsx'
import { CATEGORY, money } from '../app/format.js'
import { BackLink, Empty, Loading, PageHeading, Problem } from '../components/ui.jsx'

function currentSelection(preferred, items) {
  const available = new Set(items.map(item => item.id))
  return [...new Set([...preferred.filter(id => available.has(id)), ...items.map(item => item.id)])].slice(0, 2)
}

function selectionOptions(items, other) {
  return items.filter(item => item.id !== other)
}

function simulationPayload(asset, fields) {
  return {
    assetId: asset.id,
    costs: asset.costs.map(({ id }) => ({ id, amount: fields[id] === '' ? null : Number(fields[id]) })),
  }
}

function inputState(assets) {
  return assets.map(asset => Object.fromEntries(asset.costs.map(({ id, amount }) => [id, amount == null ? '' : String(amount)])))
}

function AgentExplanation({ body, comparison = false }) {
  const [state, setState] = useState({ pending: false, response: null, error: null })
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [])
  async function explain() {
    const controller = new AbortController()
    request.current = controller
    setState({ pending: true, response: null, error: null })
    try {
      const response = await api(comparison ? '/agents/compare' : '/agents/finance', { method: 'POST', body, signal: controller.signal })
      setState({ pending: false, response, error: null })
    } catch (error) {
      if (!controller.signal.aborted) setState({ pending: false, response: null, error })
    }
  }
  return <div className="agent-explanation">
    <p>{comparison ? 'Para explicar la comparación, se enviarán al proveedor de IA los precios y las partidas comunes con importes conocidos.' : 'Al solicitar una explicación, se comparten las partidas conocidas con el proveedor de IA configurado.'}</p>
    <button className="button secondary" type="button" disabled={state.pending} onClick={explain}>
      <Sparkles size={15} aria-hidden="true" /> {state.pending ? 'Consultando…' : comparison ? 'Explicar la comparación' : 'Explicar con IA'}
    </button>
    {state.error ? <p className="inline-error" role="alert">{state.error.message}</p> : null}
    {state.response ? <div className="answer" role="status">
      <h3>{comparison ? 'Comparación explicada · AG-07' : 'Explicación de AG-06'}</h3>
      <p>{state.response.explanation}</p>
      {state.response.limits?.map(limit => <p key={limit}>{limit}</p>)}
      {state.response.references && <div><strong>Fichas de referencia</strong><ul>{state.response.references.map(ref =>
        <li key={ref.id}><Link to={'/bienes/' + ref.id}>{ref.title}</Link> · {ref.source}</li>
      )}</ul><p>Los gastos corresponden al escenario ingresado.</p></div>}
      {state.response.model ? <small>Modelo: {state.response.model}</small> : null}
    </div> : null}
  </div>
}

function CostEditor({ asset, index, fields, update, result, requestBody, canExplain }) {
  return <section className="card cost-card">
    <div className="section-heading">
      <div><span className="eyebrow">{CATEGORY[asset.category] || 'Bien'}</span><h2>{asset.title}</h2></div>
      <span className="panel-icon"><Calculator size={19} aria-hidden="true" /></span>
    </div>
    <dl className="price-line"><div><dt>Precio publicado</dt><dd>{money(asset.price)}</dd></div></dl>
    <div className="cost-fields">
      {asset.costs.map(cost => <div className="field" key={cost.id}>
        <label htmlFor={'cost-' + index + '-' + cost.id}>{cost.label}</label>
        <div className="amount-input"><span aria-hidden="true">₡</span><input id={'cost-' + index + '-' + cost.id} inputMode="numeric" pattern="[0-9]*" maxLength={9} placeholder="Pendiente" value={fields[cost.id]} onChange={event => update(index, cost.id, event.target.value)} /></div>
      </div>)}
    </div>
    {result ? <>
      <dl className="scenario-total" aria-live="polite">
        {result.total === null ? <><div><dt>Subtotal conocido</dt><dd>{money(result.subtotal)}</dd></div><div><dt>Costo total</dt><dd>Pendiente</dd></div></> :
          <div><dt>Costo total estimado</dt><dd>{money(result.total)}</dd></div>}
      </dl>
      {result.missing?.length ? <p className="missing"><Info size={17} aria-hidden="true" /> Falta estimar: {result.missing.join(', ')}.</p> : null}
      {canExplain ? <AgentExplanation body={requestBody} /> : null}
      <DollarReference amount={result.total} />
    </> : null}
  </section>
}

function ComparisonOutcome({ results, assets }) {
  if (results.length !== 2) return null
  const [first, second] = results
  const sameCosts = first.costs.length === second.costs.length && first.costs.every(cost =>
    second.costs.some(other => other.id === cost.id && other.label === cost.label))
  if (!sameCosts) return <div className="comparison-outcome muted-outcome" role="status"><Info aria-hidden="true" /><p>Las partidas de los dos escenarios difieren. Podés comparar el precio y los gastos comunes.</p></div>
  if (first.total === null || second.total === null) return <div className="comparison-outcome muted-outcome" role="status">
    <Info size={22} aria-hidden="true" /><div><h2>Diferencia pendiente</h2><p>Completá los gastos pendientes para comparar ambos totales.</p></div>
  </div>
  const difference = Math.abs(first.total - second.total)
  return <div className="comparison-outcome" role="status">
    <CheckCircle2 size={25} aria-hidden="true" />
    <div><h2>{difference ? 'Diferencia estimada de ' + money(difference) : 'Los costos estimados coinciden'}</h2>
      {difference ? <p>{assets[first.total < second.total ? 0 : 1].title} tiene el menor costo total con las partidas ingresadas.</p> : null}
    </div>
  </div>
}

function Scenarios({ assets, canExplain, canCompare }) {
  const [fields, setFields] = useState(() => inputState(assets))
  const [state, setState] = useState({ pending: true, results: null, payloads: null, error: null })
  const current = useRef(null)

  async function calculate(payloads) {
    current.current?.abort()
    const controller = new AbortController()
    current.current = controller
    setState({ pending: true, results: null, payloads: null, error: null })
    try {
      const results = await Promise.all(payloads.map(body => api('/simulations', { method: 'POST', body, signal: controller.signal })))
      if (!controller.signal.aborted) setState({ pending: false, results, payloads, error: null })
    } catch (error) {
      if (!controller.signal.aborted) setState({ pending: false, results: null, payloads: null, error })
    }
  }

  useEffect(() => {
    const defaults = inputState(assets)
    calculate(assets.map((asset, index) => simulationPayload(asset, defaults[index])))
    return () => current.current?.abort()
  }, [assets])

  function edit(index, id, value) {
    if (!/^\d*$/.test(value)) return
    current.current?.abort()
    setFields(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, [id]: value } : row))
    setState({ pending: false, results: null, payloads: null, error: null })
  }

  function onSubmit(event) {
    event.preventDefault()
    calculate(assets.map((asset, index) => simulationPayload(asset, fields[index])))
  }

  return <form className="stack compare-scenarios" onSubmit={onSubmit}>
    <div className="tip"><CircleHelp size={19} aria-hidden="true" /> Dejá en blanco un gasto que todavía no conocés. Ingresá cero si sabés que es ₡0.</div>
    <div className="double">
      {assets.map((asset, index) => <CostEditor key={asset.id} index={index} asset={asset} fields={fields[index]} update={edit} result={state.results?.[index]} requestBody={state.payloads?.[index]} canExplain={canExplain} />)}
    </div>
    {state.error ? <p className="inline-error" role="alert">{state.error.message}</p> : null}
    {state.results ? <ComparisonOutcome assets={assets} results={state.results} /> : null}
    {canCompare && state.payloads?.length === 2 && <AgentExplanation comparison body={{ scenarios: state.payloads }} />}
    <div className="action-group">
      <button type="submit" className="button primary" disabled={state.pending}><ArrowDownToLine size={17} aria-hidden="true" />{state.pending ? 'Calculando…' : 'Calcular costos'}</button>
      <button type="button" className="button secondary" disabled={state.pending} onClick={() => {
        const defaults = inputState(assets)
        setFields(defaults)
        calculate(assets.map((asset, index) => simulationPayload(asset, defaults[index])))
      }}>Restaurar estimaciones</button>
    </div>
  </form>
}

function AssetScenarios({ first, second, canExplain, canCompare }) {
  const remote1 = useRemote('/assets/' + encodeURIComponent(first))
  const remote2 = useRemote(second ? '/assets/' + encodeURIComponent(second) : null)
  if (remote1.error) return <Problem error={remote1.error} retry={remote1.retry} />
  if (remote2.error) return <Problem error={remote2.error} retry={remote2.retry} />
  if (remote1.pending || remote2.pending) return <Loading label="Cargando partidas de costo" />
  return <LoadedScenarios first={remote1.data.asset} second={remote2.data?.asset} canExplain={canExplain} canCompare={canCompare} />
}

function LoadedScenarios({ first, second, canExplain, canCompare }) {
  const [assets] = useState(() => second ? [first, second] : [first])
  return <Scenarios assets={assets} canExplain={canExplain} canCompare={canCompare} />
}

function ComparisonSetup({ items }) {
  const { ids, setIds } = useComparison()
  const { user } = useSession()
  const capabilities = useRemote('/capabilities')
  const [first, second] = currentSelection(ids, items)
  return <>
    <section className="card selection-card">
      <div className="section-heading"><div><h2>Bienes para evaluar</h2><p>Elegí los casos que querés comparar.</p></div><span className="panel-icon"><Scale size={20} aria-hidden="true" /></span></div>
      <div className="double">
        <div className="field"><label htmlFor="first-asset">Primer bien</label><select id="first-asset" value={first} onChange={event => setIds([event.target.value, second].filter(Boolean))}>{selectionOptions(items, second).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
        {second ? <div className="field"><label htmlFor="second-asset">Segundo bien</label><select id="second-asset" value={second} onChange={event => setIds([first, event.target.value])}>{selectionOptions(items, first).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div> : null}
      </div>
    </section>
    <AssetScenarios key={first + ':' + (second || '')} first={first} second={second} canExplain={capabilities.data?.financeAgent === true} canCompare={user?.role === 'buyer' && capabilities.data?.comparisonAgent === true} />
  </>
}

export function ComparePage() {
  const catalog = useRemote('/assets?limit=100')
  return <>
    <BackLink />
    <PageHeading title="Comparar costos">Sumá precio y gastos en un mismo escenario.</PageHeading>
    {catalog.error ? <Problem error={catalog.error} retry={catalog.retry} /> : catalog.pending ? <Loading label="Cargando bienes" /> :
      catalog.data.items.length ? <ComparisonSetup items={catalog.data.items} /> :
        <Empty title="Todavía no hay bienes para comparar" icon={Scale} action={<Link className="button secondary" to="/">Ir al catálogo <ArrowRight size={16} aria-hidden="true" /></Link>} />}
  </>
}
