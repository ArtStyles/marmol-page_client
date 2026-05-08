import type { BloqueOLote } from '../../domain/entities/index.js'

export type CreateBloqueDto = {
  tipo: BloqueOLote['tipo']
  dimensionBase?: BloqueOLote['dimensionBase']
  costo: number
  costoTransporte: number
  metrosComprados: number
  fechaIngreso: string
  proveedor: string
  canteraOrigen: string
}

export type UpdateBloqueDto = Partial<{
  dimensionBase: BloqueOLote['dimensionBase']
  costo: number
  costoTransporte: number
  metrosComprados: number
  fechaIngreso: string
  proveedor: string
  canteraOrigen: string
}>

export type BloqueResponseDto = BloqueOLote & {
  canEdit: boolean
  canDelete: boolean
  lockReason?: string
}
