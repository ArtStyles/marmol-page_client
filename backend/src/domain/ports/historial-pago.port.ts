import type { HistorialPago } from '../entities/index.js'

export interface HistorialPagoRepositoryPort {
  findAll(): Promise<HistorialPago[]>
  findById(id: string): Promise<HistorialPago | null>
  create(data: Omit<HistorialPago, 'id'>): Promise<HistorialPago>
  update(id: string, data: Partial<HistorialPago>): Promise<HistorialPago | null>
  delete(id: string): Promise<boolean>
}
