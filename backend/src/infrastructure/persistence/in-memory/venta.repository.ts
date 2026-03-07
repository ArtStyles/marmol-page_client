import type { VentaRepositoryPort } from '../../../domain/ports/index.js'
import type { Venta } from '../../../domain/entities/index.js'
import {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  deleteVenta,
} from '../../../store/index.js'

export class InMemoryVentaRepository implements VentaRepositoryPort {
  async findAll(): Promise<Venta[]> {
    return getVentas()
  }

  async findById(id: string): Promise<Venta | null> {
    const item = getVentaById(id)
    return item ?? null
  }

  async create(data: Omit<Venta, 'id'>): Promise<Venta> {
    return createVenta(data)
  }

  async update(id: string, data: Partial<Venta>): Promise<Venta | null> {
    return updateVenta(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteVenta(id)
  }
}
