import type { CatalogoItem } from '../../../domain/entities/index.js'
import type { CatalogoRepositoryPort } from '../../../domain/ports/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToCatalogoItem(r: Record<string, unknown>): CatalogoItem {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    tipo: r.tipo as CatalogoItem['tipo'],
    acabado: r.acabado as CatalogoItem['acabado'],
    dimension: r.dimension as CatalogoItem['dimension'],
    precioM2: Number(r.precio_m2),
    stockLosas: Number(r.stock_losas),
    destacado: Boolean(r.destacado),
    descripcion: r.descripcion as string,
    imagen: (r.imagen as string) ?? '',
    visible: Boolean(r.visible),
  }
}

export class PostgresCatalogoRepository implements CatalogoRepositoryPort {
  async findAll(): Promise<CatalogoItem[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM catalogo_items WHERE workshop_id = $1 ORDER BY id', [
      workshopId,
    ])
    return r.rows.map(rowToCatalogoItem)
  }

  async findById(id: string): Promise<CatalogoItem | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM catalogo_items WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )
    if (r.rows.length === 0) return null
    return rowToCatalogoItem(r.rows[0])
  }

  async create(data: Omit<CatalogoItem, 'id'>): Promise<CatalogoItem> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'C', 'catalogo_items')
    await pool.query(
      `INSERT INTO catalogo_items (id, workshop_id, nombre, tipo, acabado, dimension, precio_m2, stock_losas, destacado, descripcion, imagen, visible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        workshopId,
        data.nombre,
        data.tipo,
        data.acabado,
        data.dimension,
        data.precioM2,
        data.stockLosas,
        data.destacado,
        data.descripcion,
        data.imagen,
        data.visible,
      ],
    )
    return this.findById(id) as Promise<CatalogoItem>
  }

  async update(id: string, data: Partial<CatalogoItem>): Promise<CatalogoItem | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE catalogo_items SET nombre=$2, tipo=$3, acabado=$4, dimension=$5, precio_m2=$6, stock_losas=$7, destacado=$8, descripcion=$9, imagen=$10, visible=$11 WHERE id=$1 AND workshop_id=$12`,
      [
        id,
        merged.nombre,
        merged.tipo,
        merged.acabado,
        merged.dimension,
        merged.precioM2,
        merged.stockLosas,
        merged.destacado,
        merged.descripcion,
        merged.imagen,
        merged.visible,
        workshopId,
      ],
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('DELETE FROM catalogo_items WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return (r.rowCount ?? 0) > 0
  }
}
