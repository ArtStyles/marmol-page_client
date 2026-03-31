import type { InventarioMovimientoRepositoryPort } from '../../../domain/ports/index.js'
import type { InventarioMovimiento } from '../../../domain/entities/index.js'
import {
  createInventarioMovimiento,
  deleteInventarioMovimiento,
  getInventarioMovimientoById,
  getInventarioMovimientos,
  updateInventarioMovimiento,
} from '../../../store/index.js'

export class InMemoryInventarioMovimientoRepository implements InventarioMovimientoRepositoryPort {
  async findAll(): Promise<InventarioMovimiento[]> {
    return getInventarioMovimientos()
  }

  async findById(id: string): Promise<InventarioMovimiento | null> {
    const item = getInventarioMovimientoById(id)
    return item ?? null
  }

  async create(data: Omit<InventarioMovimiento, 'id'>): Promise<InventarioMovimiento> {
    return createInventarioMovimiento(data)
  }

  async update(id: string, data: Partial<InventarioMovimiento>): Promise<InventarioMovimiento | null> {
    return updateInventarioMovimiento(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteInventarioMovimiento(id)
  }
}

