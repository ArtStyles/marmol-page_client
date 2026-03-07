import type { Producto } from '../entities/index.js'

export interface ProductoRepositoryPort {
  findAll(): Promise<Producto[]>
  findById(id: string): Promise<Producto | null>
  create(data: Omit<Producto, 'id'>): Promise<Producto>
  update(id: string, data: Partial<Producto>): Promise<Producto | null>
  delete(id: string): Promise<boolean>
}
