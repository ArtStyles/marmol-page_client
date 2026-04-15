import type { MonoHiloMasa } from '../entities/index.js'

export interface MonoHiloMasaRepositoryPort {
  findAll(): Promise<MonoHiloMasa[]>
  findById(id: string): Promise<MonoHiloMasa | null>
  create(data: Omit<MonoHiloMasa, 'id'>): Promise<MonoHiloMasa>
  update(id: string, data: Partial<MonoHiloMasa>): Promise<MonoHiloMasa | null>
  delete(id: string): Promise<boolean>
}
