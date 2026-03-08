import type { ProductoRepositoryPort } from '../../../domain/ports/index.js'
import type { Producto } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToProducto(r: Record<string, unknown>): Producto {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    tipo: r.tipo as Producto['tipo'],
    estado: r.estado as Producto['estado'],
    dimension: r.dimension as Producto['dimension'],
    origenId: r.origen_id as string,
    origenNombre: r.origen_nombre as string,
    cantidadLosas: Number(r.cantidad_losas),
    metrosCuadrados: Number(r.metros_cuadrados),
    precioM2: Number(r.precio_m2),
    imagen: (r.imagen as string) || '',
  }
}

export class PostgresProductoRepository implements ProductoRepositoryPort {
  async findAll(): Promise<Producto[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM productos WHERE workshop_id = $1 ORDER BY id', [workshopId])
    return r.rows.map(rowToProducto)
  }

  async findById(id: string): Promise<Producto | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM productos WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    if (r.rows.length === 0) return null
    return rowToProducto(r.rows[0])
  }

  async create(data: Omit<Producto, 'id'>): Promise<Producto> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'P', 'productos')
    await pool.query(
      `INSERT INTO productos (id, workshop_id, nombre, tipo, estado, dimension, origen_id, origen_nombre, cantidad_losas, metros_cuadrados, precio_m2, imagen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        workshopId,
        data.nombre,
        data.tipo,
        data.estado,
        data.dimension,
        data.origenId,
        data.origenNombre,
        data.cantidadLosas,
        data.metrosCuadrados,
        data.precioM2,
        data.imagen ?? '',
      ]
    )
    return this.findById(id) as Promise<Producto>
  }

  async update(id: string, data: Partial<Producto>): Promise<Producto | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE productos SET nombre=$2, tipo=$3, estado=$4, dimension=$5, origen_id=$6, origen_nombre=$7, cantidad_losas=$8, metros_cuadrados=$9, precio_m2=$10, imagen=$11 WHERE id=$1 AND workshop_id=$12`,
      [
        id,
        merged.nombre,
        merged.tipo,
        merged.estado,
        merged.dimension,
        merged.origenId,
        merged.origenNombre,
        merged.cantidadLosas,
        merged.metrosCuadrados,
        merged.precioM2,
        merged.imagen ?? '',
        workshopId,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('DELETE FROM productos WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return (r.rowCount ?? 0) > 0
  }
}
