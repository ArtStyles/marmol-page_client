import type { ProduccionDiaria, ProduccionTrabajador } from '../entities/index.js'

export interface ProduccionRepositoryPort {
  findAll(): Promise<ProduccionDiaria[]>
  findById(id: string): Promise<ProduccionDiaria | null>
  create(data: Omit<ProduccionDiaria, 'id'>): Promise<ProduccionDiaria>
  update(id: string, data: Partial<ProduccionDiaria>): Promise<ProduccionDiaria | null>
  delete(id: string): Promise<boolean>
}

export interface ProduccionTrabajadorRepositoryPort {
  findAll(): Promise<ProduccionTrabajador[]>
  findById(id: string): Promise<ProduccionTrabajador | null>
  create(data: Omit<ProduccionTrabajador, 'id'>): Promise<ProduccionTrabajador>
  update(id: string, data: Partial<ProduccionTrabajador>): Promise<ProduccionTrabajador | null>
  delete(id: string): Promise<boolean>
}
