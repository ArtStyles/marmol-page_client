import type { InventarioMovimiento } from '../entities/index.js'

export interface InventarioMovimientoRepositoryPort {
  findAll(): Promise<InventarioMovimiento[]>
  findById(id: string): Promise<InventarioMovimiento | null>
  create(data: Omit<InventarioMovimiento, 'id'>): Promise<InventarioMovimiento>
  update(id: string, data: Partial<InventarioMovimiento>): Promise<InventarioMovimiento | null>
  delete(id: string): Promise<boolean>
}

