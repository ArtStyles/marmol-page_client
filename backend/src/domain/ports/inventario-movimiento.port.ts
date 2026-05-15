import type {
  InventarioMovimiento,
  InventarioMovimientoDetalleTipo,
} from '../entities/index.js'

export interface InventarioMovimientoPageCursor {
  fechaSolicitud: string
  id: string
}

export interface InventarioMovimientoPageQuery {
  limit: number
  cursor?: InventarioMovimientoPageCursor
  estado?: InventarioMovimiento['estado']
  detalleTipo?: InventarioMovimientoDetalleTipo
}

export interface InventarioMovimientoPageResult {
  items: InventarioMovimiento[]
  nextCursor: InventarioMovimientoPageCursor | null
  hasMore: boolean
}

export interface InventarioMovimientoRepositoryPort {
  findAll(): Promise<InventarioMovimiento[]>
  findPage(query: InventarioMovimientoPageQuery): Promise<InventarioMovimientoPageResult>
  findById(id: string): Promise<InventarioMovimiento | null>
  create(data: Omit<InventarioMovimiento, 'id'>): Promise<InventarioMovimiento>
  update(id: string, data: Partial<InventarioMovimiento>): Promise<InventarioMovimiento | null>
  delete(id: string): Promise<boolean>
}
