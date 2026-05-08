import type { Dimension, Producto, Venta, VentaDetalleProducto } from '@/lib/types'

export type SaleDocumentState = 'Crudo' | 'Escuadrado' | 'Pulido'
export type SlabDocumentState = Extract<SaleDocumentState, 'Crudo' | 'Pulido'>
export type FloorDocumentDimension = '80x40' | '60x40' | '40x40'

export type FloorSaleFormRow = {
  id: string
  dimension: FloorDocumentDimension
  estado: SaleDocumentState
  cantidadM2: number
  precioM2: number
}

export type SlabSaleFormRow = {
  id: string
  dimension: Dimension
  estado: SlabDocumentState
  cantidadUnidades: number
  precioUnitario: number
}

export type VentaFormState = {
  bloqueId: string
  fecha: string
  observaciones: string
  fechaLiquidacion: string
  floorRows: FloorSaleFormRow[]
  slabRows: SlabSaleFormRow[]
}

export type VentaResolvedDetailRow = VentaDetalleProducto & {
  tipo: Producto['tipo']
  estadoDocumento: SaleDocumentState
  precioUnitario?: number
}

export type VentaResolvedSections = {
  floorRows: VentaResolvedDetailRow[]
  slabRows: VentaResolvedDetailRow[]
}

export type VentaListItem = Venta & {
  bloqueResumen: string
}
