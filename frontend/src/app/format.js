const colones = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' })

export function money(amount) {
  return typeof amount === 'number' && Number.isFinite(amount) ? '₡' + colones.format(amount).replace(/[\u00a0\u202f\s]/g, '.') : 'Pendiente'
}

export function displayDate(value) {
  return value && !Number.isNaN(Date.parse(value)) ? dateTime.format(new Date(value)) : 'Sin fecha'
}

export const ROLE = { buyer: 'Comprador', admin: 'Administrador', auditor: 'Auditor' }
export const CATEGORY = { vehicle: 'Vehículo', property: 'Inmueble' }
export const STAGES = [
  ['received', 'Recibida'],
  ['reviewing', 'En revisión'],
  ['follow_up', 'Seguimiento pendiente'],
  ['attended', 'Atendida'],
  ['closed', 'Cerrada'],
]
export const stageLabel = Object.fromEntries(STAGES)
