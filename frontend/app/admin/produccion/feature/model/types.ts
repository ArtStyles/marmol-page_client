import type { AccionLosa, Dimension, ProduccionDiaria, TipoProducto } from '@/lib/types'

export type ActionUsageDimensionForm = {
  id: string
  dimension: Dimension
  cantidadLosas: number
  cantidadTouched: boolean
  mermaTotalLosas: number
  mermaTotalTouched: boolean
  reutilizableLosas: number
  reutilizableTouched: boolean
  cantidadResina: number
  resinaTouched: boolean
}

export type ActionUsageForm = {
  id: string
  origenId: string
  tipo: TipoProducto | ''
  trabajadorIds: string[]
  equipoId: string
  dimensiones: ActionUsageDimensionForm[]
}

export type ActionFormState = {
  cantidadLosas: number
  cantidadTouched: boolean
  usos: ActionUsageForm[]
}

export type FormData = {
  fecha: string
  accionActiva: AccionLosa | ''
  acciones: Record<AccionLosa, ActionFormState>
}

export type DateEditPolicy = {
  hasRecords: boolean
  canMutate: boolean
  message: string
}

export type UpdateActionUsageFn = (
  accion: AccionLosa,
  usageId: string,
  patch: Partial<ActionUsageForm>,
) => void

export type UpdateActionUsageDimensionFn = (
  accion: AccionLosa,
  usageId: string,
  dimensionUsageId: string,
  patch: Partial<ActionUsageDimensionForm>,
) => void

export type UsageDimensionNumericField =
  | 'cantidadLosas'
  | 'mermaTotalLosas'
  | 'reutilizableLosas'
  | 'cantidadResina'

export type UsageDimensionTouchedField =
  | 'cantidadTouched'
  | 'mermaTotalTouched'
  | 'reutilizableTouched'
  | 'resinaTouched'

export type UpdateUsageDimensionNumericInputParams = {
  action: AccionLosa
  usageId: string
  dimensionUsageId: string
  rawValue: string
  numericField: UsageDimensionNumericField
  touchedField: UsageDimensionTouchedField
  updateUsageDimension: UpdateActionUsageDimensionFn
}
