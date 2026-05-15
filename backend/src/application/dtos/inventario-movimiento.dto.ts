import type {
  EstadoInventario,
  InventarioMovimiento,
  InventarioMovimientoDetalleTipo,
} from '../../domain/entities/index.js'

export type CreateInventarioMovimientoDto = Omit<InventarioMovimiento, 'id'>
export type UpdateInventarioMovimientoDto = Partial<Omit<InventarioMovimiento, 'id'>>
export type InventarioMovimientoResponseDto = InventarioMovimiento

export interface InventarioMovimientoListQueryDto {
  limit?: number
  cursor?: string
  estado?: InventarioMovimiento['estado']
  detalleTipo?: InventarioMovimientoDetalleTipo
}

export interface InventarioMovimientoListResponseDto {
  items: InventarioMovimientoResponseDto[]
  nextCursor: string | null
  hasMore: boolean
}

export interface AprobarInventarioMovimientoDto {
  observaciones?: string
}

export interface RechazarInventarioMovimientoDto {
  motivoRechazo: string
}

export interface CreateSalidaProcesoInventarioDto {
  accionObjetivo: 'escuadrar' | 'devastar' | 'resinar' | 'pulir'
  productoId: string
  cantidadLosas: number
  motivo?: string
}

export interface CreateRetornoProcesoInventarioDto {
  productoId: string
  cantidadLosas: number
  motivo: string
  estadoObjetivo?: EstadoInventario
}

export interface CreateRetornoProcesoMasaInventarioDto {
  masaId: string
  motivo: string
}

export interface CreateSalidaAjusteInventarioDto {
  productoId: string
  cantidadLosas: number
  destino: 'Redimensión' | 'Otro'
  motivo: string
}
