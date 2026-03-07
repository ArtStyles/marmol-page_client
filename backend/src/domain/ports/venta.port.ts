import type { Venta } from '../entities/index.js'

export interface VentaRepositoryPort {
  findAll(): Promise<Venta[]>
  findById(id: string): Promise<Venta | null>
  create(data: Omit<Venta, 'id'>): Promise<Venta>
  update(id: string, data: Partial<Venta>): Promise<Venta | null>
  delete(id: string): Promise<boolean>
}
