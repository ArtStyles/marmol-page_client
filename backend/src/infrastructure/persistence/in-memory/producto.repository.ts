import type { ProductoRepositoryPort } from '../../../domain/ports/index.js'
import type { Producto } from '../../../domain/entities/index.js'
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
} from '../../../store/index.js'

export class InMemoryProductoRepository implements ProductoRepositoryPort {
  async findAll(): Promise<Producto[]> {
    return [...getProductos()]
  }

  async findById(id: string): Promise<Producto | null> {
    const item = getProductoById(id)
    return item ? { ...item } : null
  }

  async create(data: Omit<Producto, 'id'>): Promise<Producto> {
    return createProducto(data)
  }

  async update(id: string, data: Partial<Producto>): Promise<Producto | null> {
    return updateProducto(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return deleteProducto(id)
  }
}
