import type {
  ProduccionRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import type { ProduccionDiaria, ProduccionTrabajador } from '../../../domain/entities/index.js'
import {
  getProduccion,
  getProduccionById,
  createProduccion,
  updateProduccion,
  deleteProduccion,
  getProduccionTrabajadores,
  getProduccionTrabajadorById,
  createProduccionTrabajador,
  updateProduccionTrabajador,
  deleteProduccionTrabajador,
} from '../../../store/index.js'

export class InMemoryProduccionRepository implements ProduccionRepositoryPort {
  async findAll(): Promise<ProduccionDiaria[]> {
    return getProduccion()
  }

  async findById(id: string): Promise<ProduccionDiaria | null> {
    const item = getProduccionById(id)
    return item ?? null
  }

  async create(data: Omit<ProduccionDiaria, 'id'>): Promise<ProduccionDiaria> {
    return createProduccion(data)
  }

  async update(id: string, data: Partial<ProduccionDiaria>): Promise<ProduccionDiaria | null> {
    return updateProduccion(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteProduccion(id)
  }
}

export class InMemoryProduccionTrabajadorRepository implements ProduccionTrabajadorRepositoryPort {
  async findAll(): Promise<ProduccionTrabajador[]> {
    return getProduccionTrabajadores()
  }

  async findById(id: string): Promise<ProduccionTrabajador | null> {
    const item = getProduccionTrabajadorById(id)
    return item ?? null
  }

  async create(data: Omit<ProduccionTrabajador, 'id'>): Promise<ProduccionTrabajador> {
    return createProduccionTrabajador(data)
  }

  async update(
    id: string,
    data: Partial<ProduccionTrabajador>
  ): Promise<ProduccionTrabajador | null> {
    return updateProduccionTrabajador(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteProduccionTrabajador(id)
  }
}
