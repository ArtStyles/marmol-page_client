import type { Gasto } from '../../../domain/entities/index.js'
import type { GastoRepositoryPort } from '../../../domain/ports/index.js'
import { getPool } from './connection.js'
import { nextId, toDateOnly } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToGasto(r: Record<string, unknown>): Gasto {
  return {
    id: r.id as string,
    fecha: toDateOnly(r.fecha),
    costo: Number(r.costo),
    tipo: r.tipo as Gasto['tipo'],
    flujo: r.flujo as Gasto['flujo'],
    descripcion: r.descripcion as string,
    encargado: r.encargado as string,
  }
}

export class PostgresGastoRepository implements GastoRepositoryPort {
  async findAll(): Promise<Gasto[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM gastos WHERE workshop_id = $1 ORDER BY fecha DESC, id', [
      workshopId,
    ])
    return r.rows.map(rowToGasto)
  }

  async findById(id: string): Promise<Gasto | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('SELECT * FROM gastos WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    if (r.rows.length === 0) return null
    return rowToGasto(r.rows[0])
  }

  async create(data: Omit<Gasto, 'id'>): Promise<Gasto> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'G', 'gastos')
    await pool.query(
      `INSERT INTO gastos (id, workshop_id, fecha, costo, tipo, flujo, descripcion, encargado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        workshopId,
        data.fecha,
        data.costo,
        data.tipo,
        data.flujo,
        data.descripcion,
        data.encargado,
      ],
    )
    return this.findById(id) as Promise<Gasto>
  }

  async update(id: string, data: Partial<Gasto>): Promise<Gasto | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE gastos SET fecha=$2, costo=$3, tipo=$4, flujo=$5, descripcion=$6, encargado=$7 WHERE id=$1 AND workshop_id=$8`,
      [
        id,
        merged.fecha,
        merged.costo,
        merged.tipo,
        merged.flujo,
        merged.descripcion,
        merged.encargado,
        workshopId,
      ],
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query('DELETE FROM gastos WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return (r.rowCount ?? 0) > 0
  }
}
