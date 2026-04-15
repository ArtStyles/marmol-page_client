import type { MonoHiloMasaRepositoryPort } from '../../../domain/ports/index.js'
import type { MonoHiloMasa } from '../../../domain/entities/index.js'
import {
  createMonoHiloMasa,
  deleteMonoHiloMasa,
  getMonoHiloMasaById,
  getMonoHiloMasas,
  updateMonoHiloMasa,
} from '../../../store/index.js'

export class InMemoryMonoHiloMasaRepository implements MonoHiloMasaRepositoryPort {
  async findAll(): Promise<MonoHiloMasa[]> {
    return getMonoHiloMasas()
  }

  async findById(id: string): Promise<MonoHiloMasa | null> {
    const item = getMonoHiloMasaById(id)
    return item ?? null
  }

  async create(data: Omit<MonoHiloMasa, 'id'>): Promise<MonoHiloMasa> {
    return createMonoHiloMasa(data)
  }

  async update(id: string, data: Partial<MonoHiloMasa>): Promise<MonoHiloMasa | null> {
    return updateMonoHiloMasa(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteMonoHiloMasa(id)
  }
}
