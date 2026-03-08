import type { CatalogoItem } from '../../../domain/entities/index.js'
import type { CatalogoRepositoryPort } from '../../../domain/ports/index.js'
import {
  createCatalogoItem,
  deleteCatalogoItem,
  getCatalogoItemById,
  getCatalogoItems,
  updateCatalogoItem,
} from '../../../store/index.js'

export class InMemoryCatalogoRepository implements CatalogoRepositoryPort {
  async findAll(): Promise<CatalogoItem[]> {
    return getCatalogoItems()
  }

  async findById(id: string): Promise<CatalogoItem | null> {
    const item = getCatalogoItemById(id)
    return item ?? null
  }

  async create(data: Omit<CatalogoItem, 'id'>): Promise<CatalogoItem> {
    return createCatalogoItem(data)
  }

  async update(id: string, data: Partial<CatalogoItem>): Promise<CatalogoItem | null> {
    return updateCatalogoItem(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteCatalogoItem(id)
  }
}
