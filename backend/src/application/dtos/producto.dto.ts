import type { Producto } from '../../domain/entities/index.js'

export type CreateProductoDto = Omit<Producto, 'id'>
export type UpdateProductoDto = Partial<Omit<Producto, 'id'>>
export type ProductoResponseDto = Producto
