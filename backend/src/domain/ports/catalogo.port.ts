import type { CatalogoItem } from '../entities/index.js'

export interface CatalogoRepositoryPort {
  findAll(): Promise<CatalogoItem[]>
  findById(id: string): Promise<CatalogoItem | null>
  create(data: Omit<CatalogoItem, 'id'>): Promise<CatalogoItem>
  update(id: string, data: Partial<CatalogoItem>): Promise<CatalogoItem | null>
  delete(id: string): Promise<boolean>
}
