import type { Venta } from '../../domain/entities/index.js'

export type CreateVentaDto = Omit<Venta, 'id'>
export type UpdateVentaDto = Partial<Omit<Venta, 'id'>>
export type VentaResponseDto = Venta
