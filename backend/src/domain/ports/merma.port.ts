import type { Merma } from '../entities/index.js'

export interface MermaRepositoryPort {
  findAll(): Promise<Merma[]>
  findById(id: string): Promise<Merma | null>
  create(data: Omit<Merma, 'id'>): Promise<Merma>
  update(id: string, data: Partial<Merma>): Promise<Merma | null>
  delete(id: string): Promise<boolean>
}
