import type { WorkshopTenant } from '../entities/index.js'

export interface WorkshopCreateInput {
  nombre: string
  ciudad: string
  direccion: string
  encargado: string
  telefono: string
  correo: string
}

export interface WorkshopRepositoryPort {
  findAll(): Promise<WorkshopTenant[]>
  findById(id: string): Promise<WorkshopTenant | null>
  create(data: WorkshopCreateInput): Promise<WorkshopTenant>
  update(id: string, data: Partial<WorkshopTenant>): Promise<WorkshopTenant | null>
  delete(id: string): Promise<boolean>
}
