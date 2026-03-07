import type { MermaRepositoryPort } from '../../../domain/ports/index.js'
import type { Merma } from '../../../domain/entities/index.js'
import {
  getMermas,
  getMermaById,
  createMerma,
  updateMerma,
  deleteMerma,
} from '../../../store/index.js'

export class InMemoryMermaRepository implements MermaRepositoryPort {
  async findAll(): Promise<Merma[]> {
    return getMermas()
  }

  async findById(id: string): Promise<Merma | null> {
    const item = getMermaById(id)
    return item ?? null
  }

  async create(data: Omit<Merma, 'id'>): Promise<Merma> {
    return createMerma(data)
  }

  async update(id: string, data: Partial<Merma>): Promise<Merma | null> {
    return updateMerma(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteMerma(id)
  }
}
