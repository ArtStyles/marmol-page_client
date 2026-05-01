import type { Gasto } from '../../../domain/entities/index.js'
import type { GastoRepositoryPort } from '../../../domain/ports/index.js'
import { getPool } from './connection.js'
import { nextId, toDateOnly, toTimestampIso } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToGasto(r: Record<string, unknown>): Gasto {
  return {
    id: r.id as string,
    createdAt: toTimestampIso(r.created_at),
    fecha: toDateOnly(r.fecha),
    costo: Number(r.costo),
    tipo: r.tipo as Gasto['tipo'],
    flujo: r.flujo as Gasto['flujo'],
    descripcion: r.descripcion as string,
    encargado: r.encargado as string,
    origen: ((r.origen as Gasto['origen'] | null) ?? 'manual') as Gasto['origen'],
    origenModulo: ((r.origen_modulo as Gasto['origenModulo'] | null) ?? 'gastos') as Gasto['origenModulo'],
    referenciaId: (r.referencia_id as string | null) ?? undefined,
    creadoPorId: (r.creado_por_id as string | null) ?? undefined,
    creadoPorNombre: (r.creado_por_nombre as string | null) ?? undefined,
    estado: ((r.estado as Gasto['estado'] | null) ?? 'activo') as Gasto['estado'],
    anuladoPorId: (r.anulado_por_id as string | null) ?? undefined,
    anuladoPorNombre: (r.anulado_por_nombre as string | null) ?? undefined,
    anuladoFecha: toTimestampIso(r.anulado_fecha),
    motivoAnulacion: (r.motivo_anulacion as string | null) ?? undefined,
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
      `INSERT INTO gastos (
         id,
         workshop_id,
         fecha,
         costo,
         tipo,
         flujo,
         descripcion,
         encargado,
         origen,
         origen_modulo,
         referencia_id,
         creado_por_id,
         creado_por_nombre,
         estado,
         anulado_por_id,
         anulado_por_nombre,
         anulado_fecha,
         motivo_anulacion
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        id,
        workshopId,
        data.fecha,
        data.costo,
        data.tipo,
        data.flujo,
        data.descripcion,
        data.encargado,
        data.origen,
        data.origenModulo,
        data.referenciaId ?? null,
        data.creadoPorId ?? null,
        data.creadoPorNombre ?? null,
        data.estado,
        data.anuladoPorId ?? null,
        data.anuladoPorNombre ?? null,
        data.anuladoFecha ?? null,
        data.motivoAnulacion ?? null,
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
      `UPDATE gastos
       SET fecha=$2,
           costo=$3,
           tipo=$4,
           flujo=$5,
           descripcion=$6,
           encargado=$7,
           origen=$8,
           origen_modulo=$9,
           referencia_id=$10,
           creado_por_id=$11,
           creado_por_nombre=$12,
           estado=$13,
           anulado_por_id=$14,
           anulado_por_nombre=$15,
           anulado_fecha=$16,
           motivo_anulacion=$17
       WHERE id=$1 AND workshop_id=$18`,
      [
        id,
        merged.fecha,
        merged.costo,
        merged.tipo,
        merged.flujo,
        merged.descripcion,
        merged.encargado,
        merged.origen,
        merged.origenModulo,
        merged.referenciaId ?? null,
        merged.creadoPorId ?? null,
        merged.creadoPorNombre ?? null,
        merged.estado,
        merged.anuladoPorId ?? null,
        merged.anuladoPorNombre ?? null,
        merged.anuladoFecha ?? null,
        merged.motivoAnulacion ?? null,
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
