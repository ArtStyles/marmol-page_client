import type { AccionLosa, Dimension, TipoProducto } from '@/lib/types'

export type AsignacionItem = {
  id: string
  fecha: string
  trabajadorId: string
  trabajadorNombre: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  accion: AccionLosa
  equipoId: string
  equipoNombre: string
  integrantesEquipo: number
  losasEquipo: number
  m2Equipo: number
  cantidadLosas: number
  totalM2: number
  losasPagables: number
  tarifaAplicada: number
  pagoEstimado: number
}

export type AccionResumen = {
  losas: number
  m2: number
  pago: number
}

export type ProduccionLoteGroup = {
  origenId: string
  origenNombre: string
  items: AsignacionItem[]
}

export type ProduccionWorkerGroup = {
  trabajadorId: string
  trabajadorNombre: string
  lotes: ProduccionLoteGroup[]
  resumenAcciones: Record<AccionLosa, AccionResumen>
  totalPagoEstimado: number
}

export type TopTrabajadorResumen = {
  nombre: string
  m2: number
  pago: number
}

