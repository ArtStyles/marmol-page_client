import type { InventarioMovimiento } from '../../domain/entities/index.js'

export type CreateInventarioMovimientoDto = Omit<InventarioMovimiento, 'id'>
export type UpdateInventarioMovimientoDto = Partial<Omit<InventarioMovimiento, 'id'>>
export type InventarioMovimientoResponseDto = InventarioMovimiento

export interface AprobarInventarioMovimientoDto {
  observaciones?: string
}

export interface RechazarInventarioMovimientoDto {
  motivoRechazo: string
}

