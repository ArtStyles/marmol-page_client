import type { MermaRepositoryPort } from '../../../domain/ports/index.js'
import type { Merma } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToMerma(r: Record<string, unknown>): Merma {
  return {
    id: r.id as string,
    fecha: String(r.fecha).split('T')[0],
    origenId: r.origen_id as string,
    origenNombre: r.origen_nombre as string,
    tipo: r.tipo as Merma['tipo'],
    dimension: r.dimension as Merma['dimension'],
    cantidadLosas: Number(r.cantidad_losas),
    metrosCuadrados: Number(r.metros_cuadrados),
    motivo: r.motivo as Merma['motivo'],
    observaciones: (r.observaciones as string) ?? '',
  }
}

export class PostgresMermaRepository implements MermaRepositoryPort {
  async findAll(): Promise<Merma[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM mermas WHERE workshop_id = $1 ORDER BY fecha DESC, id', [
      workshopId,
    ])
    return r.rows.map(rowToMerma)
  }

  async findById(id: string): Promise<Merma | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM mermas WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    if (r.rows.length === 0) return null
    return rowToMerma(r.rows[0])
  }

  async create(data: Omit<Merma, 'id'>): Promise<Merma> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'M', 'mermas')
    await pool.query(
      `INSERT INTO mermas (id, workshop_id, fecha, origen_id, origen_nombre, tipo, dimension, cantidad_losas, metros_cuadrados, motivo, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        workshopId,
        data.fecha,
        data.origenId,
        data.origenNombre,
        data.tipo,
        data.dimension,
        data.cantidadLosas,
        data.metrosCuadrados,
        data.motivo,
        data.observaciones ?? '',
      ]
    )
    return this.findById(id) as Promise<Merma>
  }

  async update(id: string, data: Partial<Merma>): Promise<Merma | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE mermas SET fecha=$2, origen_id=$3, origen_nombre=$4, tipo=$5, dimension=$6, cantidad_losas=$7, metros_cuadrados=$8, motivo=$9, observaciones=$10 WHERE id=$1 AND workshop_id=$11`,
      [
        id,
        merged.fecha,
        merged.origenId,
        merged.origenNombre,
        merged.tipo,
        merged.dimension,
        merged.cantidadLosas,
        merged.metrosCuadrados,
        merged.motivo,
        merged.observaciones ?? '',
        workshopId,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('DELETE FROM mermas WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return (r.rowCount ?? 0) > 0
  }
}
