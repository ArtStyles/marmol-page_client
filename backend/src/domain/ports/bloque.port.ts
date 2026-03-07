import type { BloqueOLote } from '../entities/index.js'

export interface BloqueRepositoryPort {
  findAll(): Promise<BloqueOLote[]>
  findById(id: string): Promise<BloqueOLote | null>
  create(data: Omit<BloqueOLote, 'id'>): Promise<BloqueOLote>
  update(id: string, data: Partial<BloqueOLote>): Promise<BloqueOLote | null>
  delete(id: string): Promise<boolean>
}
