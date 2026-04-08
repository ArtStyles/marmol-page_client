import type { Dimension, EstadoInventario, TipoProducto } from '@/lib/types'

export type FormDetalleProducto = {
  id: string
  tipo: TipoProducto | ''
  origenId: string
  dimension: Dimension | ''
  estado: EstadoInventario | ''
  productoId: string
  metrosCuadrados: number
  cantidadUnidades: number
}
