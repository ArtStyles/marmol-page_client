import type { WorkshopRepositoryPort } from '../../../domain/ports/index.js'
import type { WorkshopTenant } from '../../../domain/entities/index.js'
import type { WorkshopCreateInput } from '../../../domain/ports/index.js'
import {
  getWorkshops,
  getWorkshopById,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
} from '../../../store/index.js'

export class InMemoryWorkshopRepository implements WorkshopRepositoryPort {
  async findAll(): Promise<WorkshopTenant[]> {
    return getWorkshops()
  }

  async findById(id: string): Promise<WorkshopTenant | null> {
    const item = getWorkshopById(id)
    return item ?? null
  }

  async create(data: WorkshopCreateInput): Promise<WorkshopTenant> {
    return createWorkshop(data)
  }

  async update(id: string, data: Partial<WorkshopTenant>): Promise<WorkshopTenant | null> {
    return updateWorkshop(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteWorkshop(id)
  }
}
