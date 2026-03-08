import type { Gasto } from '../entities/index.js'

export interface GastoRepositoryPort {
  findAll(): Promise<Gasto[]>
  findById(id: string): Promise<Gasto | null>
  create(data: Omit<Gasto, 'id'>): Promise<Gasto>
  update(id: string, data: Partial<Gasto>): Promise<Gasto | null>
  delete(id: string): Promise<boolean>
}
