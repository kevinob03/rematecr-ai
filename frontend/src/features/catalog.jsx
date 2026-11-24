import { ArrowRight, Building2, CarFront, FileText, Plus, Scale, ShieldCheck, Tag, Check, SearchX, Headset } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useRemote } from '../api/useRemote.js'
import { useComparison } from '../app/comparison.jsx'
import { CATEGORY, money } from '../app/format.js'
import { useSession } from '../app/session.jsx'
import { NaturalSearch } from './natural-search.jsx'
import { useState } from 'react'
import { FavoriteButton, PriceRange, PriceHistory } from './catalog-controls.jsx'
import { DollarReference } from '../components/exchange.jsx'
import { ScorePanel } from './score.jsx'
import { BackLink, Empty, Loading, PageHeading, Pagination, Problem, SourceStatus } from '../components/ui.jsx'

const categories = [['', 'Todos', null], ['vehicle', 'Vehículos', CarFront], ['property', 'Inmuebles', Building2]]

function AssetIcon({ category, large = false }) {
  const Icon = category === 'property' ? Building2 : CarFront
  return <span className={large ? 'asset-icon large' : 'asset-icon'} aria-hidden="true"><Icon size={large ? 68 : 33} strokeWidth={1.5} /></span>
}

function AddToCompare({ asset, large = false }) {
  const { ids, toggle } = useComparison()
  const selected = ids.includes(asset.id)
  if (large) return <button type="button" className={selected ? 'button secondary' : 'button primary'} aria-pressed={selected} onClick={() => toggle(asset.id)}>
    {selected ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
    {selected ? 'En comparación' : 'Agregar a comparación'}
  </button>
  const title = selected ? 'Quitar de la comparación' : 'Agregar a comparación'
  return <button type="button" className="round-action compare-toggle" aria-label={title + ': ' + asset.title} title={title} aria-pressed={selected} onClick={() => toggle(asset.id)}>
    {selected ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
  </button>
}

function AssetRow({ asset }) {
  return <article className="asset-row">
    <Link className="asset-row-link" to={'/bienes/' + encodeURIComponent(asset.id)}>
      <AssetIcon category={asset.category} />
      <div className="asset-main"><span className="eyebrow">{CATEGORY[asset.category] || 'Bien'}</span><h3>{asset.title}</h3></div>
      <div className="asset-price"><span>Precio publicado</span><strong>{money(asset.price)}</strong></div>
      <ArrowRight size={18} className="asset-arrow" aria-hidden="true" />
    </Link>
    <AddToCompare asset={asset} />
  </article>
}

function EstimatePanel({ items }) {
  const estimates = items.filter(item => typeof item.estimatedTotal === 'number').slice(0, 2)
  if (!estimates.length) return null
  return <section className="card total-card">
    <div className="panel-heading"><span className="panel-icon"><Scale size={19} aria-hidden="true" /></span><h2>Costo total estimado</h2></div>
    <dl className="totals-list">
      {estimates.map(item => <div key={item.id}><dt>{item.title}</dt><dd>{money(item.estimatedTotal)}</dd></div>)}
    </dl>
    <Link to="/comparar" className="soft-link">Abrir comparador <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>
}

function CatalogSource() {
  return <section className="card source-card">
    <div className="panel-heading"><span className="panel-icon"><ShieldCheck size={20} aria-hidden="true" /></span><h2>Procedencia</h2></div>
    <p>Los bienes y montos de este catálogo corresponden a casos ficticios de la propuesta de RemateCR AI.</p>
  </section>
}

export function CatalogPage() {
  const { user } = useSession()
  const [params, setParams] = useSearchParams()
  const requestedCategory = params.get('categoria')
  const category = requestedCategory === 'vehicle' || requestedCategory === 'property' ? requestedCategory : ''
  const search = (params.get('q') || '').slice(0, 100)
  const requestedPage = Number(params.get('pagina'))
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10_000 ? requestedPage : 1
  const query = new URLSearchParams()
  if (category) query.set('category', category)
  if (search) query.set('search', search)
  for (const key of ['minPrice', 'maxPrice']) {
    if (params.has(key)) query.set(key, params.get(key))
  }
  if (page > 1) query.set('page', String(page))
  const catalog = useRemote('/assets' + (query.size ? '?' + query.toString() : ''))
  const items = catalog.data?.items || []

  function selectCategory(next) {
    const filters = new URLSearchParams(params)
    if (next) filters.set('categoria', next)
    else filters.delete('categoria')
    filters.delete('pagina')
    setParams(filters)
  }

  return <>
    <section className="catalog-hero">
      <div className="hero-content">
        <SourceStatus />
        <h1>Catálogo de bienes</h1>
        <p>Explorá vehículos e inmuebles y compará su costo estimado antes de tomar una decisión.</p>
      </div>
      <div className="hero-visual">
        <img src="/images/auction-garage.webp" alt="" width="900" height="400" />
        <small>Imagen ilustrativa</small>
      </div>
    </section>
    {user?.role === 'buyer' && <NaturalSearch key={params.toString()} apply={setParams} />}
    <PriceRange key={'price-' + params.toString()} params={params} setParams={setParams} />
    <div className="filters" role="group" aria-label="Filtros del catálogo">
      {categories.map(([id, label, Icon]) => <button className="filter" key={id} type="button" aria-pressed={category === id} onClick={() => selectCategory(id)}>
        {Icon ? <Icon size={17} aria-hidden="true" /> : null}{label}
      </button>)}
      {['minPrice', 'maxPrice'].filter(key => params.has(key)).map(key => <button className="filter" key={key} onClick={() => {
        const next = new URLSearchParams(params)
        next.delete(key)
        next.delete('pagina')
        setParams(next)
      }}>{key === 'minPrice' ? 'Desde' : 'Hasta'} {money(Number(params.get(key)))} · Quitar</button>)}
      {search ? <button className="filter clear-search" type="button" onClick={() => setParams(old => {
        const next = new URLSearchParams(old)
        next.delete('q')
        next.delete('pagina')
        return next
      })}>Quitar búsqueda</button> : null}
    </div>
    {catalog.pending ? <Loading label="Cargando catálogo" /> : catalog.error ? <Problem error={catalog.error} retry={catalog.retry} /> :
      <div className="split">
        {items.length ? <section className="card catalog-results">
          <div className="section-heading"><div><h2>{search ? 'Resultados de búsqueda' : 'Bienes disponibles'}</h2>{search ? <p>Resultados para «{search}»</p> : null}</div><span>{items.length} {items.length === 1 ? 'bien' : 'bienes'}</span></div>
          <div className="asset-list">{items.map(item => <AssetRow asset={item} key={item.id} />)}</div>
        </section> : <Empty icon={SearchX} title={category === 'property' && !search ? 'Sin inmuebles en el catálogo' : 'No encontramos bienes'} action={<button className="button secondary" onClick={() => setParams({})}>Ver todos los bienes</button>}>
          {category === 'property' && !search ? 'Podés explorar los vehículos disponibles para la demostración.' : 'Cambiá los filtros o probá con otra búsqueda.'}
        </Empty>}
        <aside className="stack" aria-label="Resumen del catálogo"><EstimatePanel items={items} /><CatalogSource /></aside>
      </div>}
    {catalog.data ? <Pagination page={page} nextPage={catalog.data.nextPage} onChange={number => setParams(old => {
      const next = new URLSearchParams(old)
      next.set('pagina', String(number))
      return next
    })} /> : null}
  </>
}

export function FavoritesPage() {
  const [page, setPage] = useState(1)
  const remote = useRemote('/favorites?page=' + page)
  return <><PageHeading title="Mis favoritos">Bienes que guardaste para revisar después.</PageHeading>
    {remote.pending ? <Loading label="Cargando favoritos" /> : remote.error ? <Problem error={remote.error} retry={remote.retry} /> :
      <>{remote.data.items.length ? <section className="card catalog-results">{remote.data.items.map(item =>
        <AssetRow key={item.id} asset={item} />)}</section> : <Empty title="No hay favoritos en esta página"
          action={<Link className="button secondary" to="/">Explorar catálogo</Link>}>Podés guardar un bien desde su ficha.</Empty>}
        <Pagination page={page} nextPage={remote.data.nextPage} onChange={setPage} /></>}
  </>
}

export function AssetPage() {
  const { assetId } = useParams()
  const { user } = useSession()
  const { ids } = useComparison()
  const remote = useRemote('/assets/' + encodeURIComponent(assetId))
  if (remote.pending) return <Loading label="Cargando ficha" />
  if (remote.error?.status === 404) return <Empty title="No encontramos ese bien" action={<Link className="button secondary" to="/">Volver al catálogo</Link>} />
  if (remote.error) return <Problem error={remote.error} retry={remote.retry} />

  const asset = remote.data.asset
  const sourceState = { demo: 'Demostración', verified: 'Fuente verificada', unverified: 'Fuente por verificar' }[asset.sourceStatus]
  const followUp = '/seguimiento/nuevo/' + encodeURIComponent(asset.id)
  return <>
    <BackLink />
    <PageHeading title={asset.title} action={<SourceStatus />}>{CATEGORY[asset.category] || 'Bien'} del catálogo</PageHeading>
    <div className="split detail-split">
      <div className="stack">
        <section className="card detail-card">
          <div className="detail-art"><AssetIcon category={asset.category} large /><span>Sin fotografía de referencia</span></div>
          {user?.role === 'buyer' && <FavoriteButton key={asset.id} assetId={asset.id} />}
          <div className="section-heading"><h2>Información del bien</h2></div>
          {asset.summary ? <p>{asset.summary}</p> : null}
          <div className="detail-tags"><span><Tag size={16} aria-hidden="true" /> {CATEGORY[asset.category] || 'Bien'}</span><span><FileText size={16} aria-hidden="true" /> {sourceState || 'Estado sin confirmar'}</span></div>
          <div className="action-group"><AddToCompare asset={asset} large />{ids.length ? <Link className="button secondary" to="/comparar">Abrir comparador <ArrowRight size={17} aria-hidden="true" /></Link> : null}</div>
        </section>
        <section className="card source-card">
          <div className="panel-heading"><span className="panel-icon"><ShieldCheck size={20} aria-hidden="true" /></span><h2>Procedencia del bien</h2></div>
          <p>{asset.source || 'Fuente pendiente de confirmar'}</p>
          {asset.sourceUrl && <a href={asset.sourceUrl} target="_blank" rel="noreferrer">Abrir fuente original</a>}
        </section>
      </div>
      <aside className="stack" aria-label="Costos y seguimiento">
        {user?.role === 'buyer' && <ScorePanel key={asset.id} assetId={asset.id} />}
        <PriceHistory key={asset.id} assetId={asset.id} />
        <section className="card total-card">
          <div className="panel-heading"><span className="panel-icon"><Scale size={19} aria-hidden="true" /></span><h2>Desglose de costos</h2></div>
          <dl className="totals-list">
            <div><dt>Precio publicado</dt><dd>{money(asset.price)}</dd></div>
            {(asset.costs || []).map(cost => <div key={cost.id}><dt>{cost.label}</dt><dd>{money(cost.amount)}</dd></div>)}
            <div className="total-line"><dt>Costo total estimado</dt><dd>{money(asset.estimatedTotal)}</dd></div>
          </dl>
          <DollarReference amount={asset.estimatedTotal} />
        </section>
        {!user || user.role === 'buyer' ? <section className="card source-card">
          <div className="panel-heading"><span className="panel-icon"><Headset size={20} aria-hidden="true" /></span><h2>Seguimiento del bien</h2></div>
          <p>Compartí una consulta con el equipo si necesitás ayuda para evaluarlo.</p>
          <Link className="button secondary" to={followUp}>Solicitar seguimiento <ArrowRight size={16} aria-hidden="true" /></Link>
        </section> : null}
      </aside>
    </div>
  </>
}
