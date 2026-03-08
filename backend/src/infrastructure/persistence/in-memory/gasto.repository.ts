import type { Gasto } from '../../../domain/entities/index.js'
import type { GastoRepositoryPort } from '../../../domain/ports/index.js'
import { createGasto, deleteGasto, getGastoById, getGastos, updateGasto } from '../../../store/index.js'

export class InMemoryGastoRepository implements GastoRepositoryPort {
  async findAll(): Promise<Gasto[]> {
    return getGastos()
  }

  async findById(id: string): Promise<Gasto | null> {
    const item = getGastoById(id)
    return item ?? null
  }

  async create(data: Omit<Gasto, 'id'>): Promise<Gasto> {
    return createGasto(data)
  }

  async update(id: string, data: Partial<Gasto>): Promise<Gasto | null> {
    return updateGasto(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteGasto(id)
  }
}
