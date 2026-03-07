import type { HistorialPago } from '../../domain/entities/index.js'

export type CreateHistorialPagoDto = Omit<HistorialPago, 'id'>
export type UpdateHistorialPagoDto = Partial<Omit<HistorialPago, 'id'>>
export type HistorialPagoResponseDto = HistorialPago
