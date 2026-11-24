import { useState } from 'react'
import { useRemote } from '../api/useRemote.js'
import { Loading, Problem } from './ui.jsx'

const dollars = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'USD' })

export function DollarReference({ amount }) {
  const [open, setOpen] = useState(false)
  const remote = useRemote(open && amount != null ? '/exchange-rate?amount=' + amount : null)
  const rate = remote.data
  if (amount == null) return null
  return <div><button type="button" className="button secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
    {open ? 'Ocultar referencia en USD' : 'Ver referencia en USD'}</button>
    {open && (remote.error ? <Problem error={remote.error} retry={remote.retry} /> : remote.pending ? <Loading label="Consultando tipo de cambio" /> :
      rate ? <div role="status">
        {rate.status === 'available' && <p>Equivalente estimado <strong>{dollars.format(rate.amountUSD)}</strong></p>}
        {rate.status === 'stale' && <p>Última referencia disponible. La conversión queda pendiente de actualización.</p>}
        {rate.status === 'unavailable' && <p>Tipo de cambio sin confirmar. El importe se conserva en colones.</p>}
        {rate.date && <p>1 USD = ₡{rate.rate.toLocaleString('es-CR')} · Observación del {rate.date}</p>}
        <a href={rate.sourceUrl} target="_blank" rel="noreferrer">{rate.source}</a>
      </div> : null)}
  </div>
}
