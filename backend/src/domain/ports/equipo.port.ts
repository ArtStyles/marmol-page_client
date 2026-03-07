import type { Equipo } from '../entities/index.js'

export interface EquipoRepositoryPort {
  findAll(): Promise<Equipo[]>
  findById(id: string): Promise<Equipo | null>
  create(data: Omit<Equipo, 'id'>): Promise<Equipo>
  update(id: string, data: Partial<Equipo>): Promise<Equipo | null>
  delete(id: string): Promise<boolean>
}
