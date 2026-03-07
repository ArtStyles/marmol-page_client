import type { EquipoRepositoryPort } from '../../../domain/ports/index.js'
import type { Equipo } from '../../../domain/entities/index.js'
import {
  getEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  deleteEquipo,
} from '../../../store/index.js'

export class InMemoryEquipoRepository implements EquipoRepositoryPort {
  async findAll(): Promise<Equipo[]> {
    return getEquipos()
  }

  async findById(id: string): Promise<Equipo | null> {
    const item = getEquipoById(id)
    return item ?? null
  }

  async create(data: Omit<Equipo, 'id'>): Promise<Equipo> {
    return createEquipo(data)
  }

  async update(id: string, data: Partial<Equipo>): Promise<Equipo | null> {
    return updateEquipo(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteEquipo(id)
  }
}
