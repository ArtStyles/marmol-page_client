import type { TrabajadorRepositoryPort } from '../../../domain/ports/index.js'
import type { Trabajador } from '../../../domain/entities/index.js'
import {
  getTrabajadores,
  getTrabajadorById,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
} from '../../../store/index.js'

export class InMemoryTrabajadorRepository implements TrabajadorRepositoryPort {
  async findAll(): Promise<Trabajador[]> {
    return getTrabajadores()
  }

  async findById(id: string): Promise<Trabajador | null> {
    const item = getTrabajadorById(id)
    return item ?? null
  }

  async create(data: Omit<Trabajador, 'id'>): Promise<Trabajador> {
    return createTrabajador(data)
  }

  async update(id: string, data: Partial<Trabajador>): Promise<Trabajador | null> {
    return updateTrabajador(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteTrabajador(id)
  }
}
