import type { WorkshopTenant } from '@/lib/workshops'

export const formatMoney = (value: number): string => {
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(value))
  return `${sign}$${absolute.toLocaleString()}`
}

export const sortWorkshops = (workshops: WorkshopTenant[]): WorkshopTenant[] =>
  [...workshops].sort((a, b) => {
    if (a.estado === b.estado) return a.nombre.localeCompare(b.nombre)
    if (a.estado === 'activo') return -1
    if (b.estado === 'activo') return 1
    return a.estado.localeCompare(b.estado)
  })

