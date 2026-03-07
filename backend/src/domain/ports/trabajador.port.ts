import type { Trabajador } from '../entities/index.js'

export interface TrabajadorRepositoryPort {
  findAll(): Promise<Trabajador[]>
  findById(id: string): Promise<Trabajador | null>
  create(data: Omit<Trabajador, 'id'>): Promise<Trabajador>
  update(id: string, data: Partial<Trabajador>): Promise<Trabajador | null>
  delete(id: string): Promise<boolean>
}
