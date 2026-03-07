import type { BloqueRepositoryPort } from '../../../domain/ports/index.js'
import type { BloqueOLote } from '../../../domain/entities/index.js'
import {
  getBloques,
  getBloqueById,
  createBloque,
  updateBloque,
  deleteBloque,
} from '../../../store/index.js'

export class InMemoryBloqueRepository implements BloqueRepositoryPort {
  async findAll(): Promise<BloqueOLote[]> {
    return getBloques()
  }

  async findById(id: string): Promise<BloqueOLote | null> {
    const item = getBloqueById(id)
    return item ?? null
  }

  async create(data: Omit<BloqueOLote, 'id'>): Promise<BloqueOLote> {
    return createBloque(data)
  }

  async update(id: string, data: Partial<BloqueOLote>): Promise<BloqueOLote | null> {
    return updateBloque(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteBloque(id)
  }
}
