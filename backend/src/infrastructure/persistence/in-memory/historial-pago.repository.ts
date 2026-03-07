import type { HistorialPagoRepositoryPort } from '../../../domain/ports/index.js'
import type { HistorialPago } from '../../../domain/entities/index.js'
import {
  getHistorialPagos,
  getHistorialPagoById,
  createHistorialPago,
  updateHistorialPago,
  deleteHistorialPago,
} from '../../../store/index.js'

export class InMemoryHistorialPagoRepository implements HistorialPagoRepositoryPort {
  async findAll(): Promise<HistorialPago[]> {
    return getHistorialPagos()
  }

  async findById(id: string): Promise<HistorialPago | null> {
    const item = getHistorialPagoById(id)
    return item ?? null
  }

  async create(data: Omit<HistorialPago, 'id'>): Promise<HistorialPago> {
    return createHistorialPago(data)
  }

  async update(id: string, data: Partial<HistorialPago>): Promise<HistorialPago | null> {
    return updateHistorialPago(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteHistorialPago(id)
  }
}
