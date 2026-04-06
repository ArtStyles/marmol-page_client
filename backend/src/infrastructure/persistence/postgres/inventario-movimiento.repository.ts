import type {
  InventarioMovimientoPageQuery,
  InventarioMovimientoPageResult,
  InventarioMovimientoRepositoryPort,
} from '../../../domain/ports/index.js'
import type { InventarioMovimiento } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId, toTimestampIso } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToInventarioMovimiento(r: Record<string, unknown>): InventarioMovimiento {
  return {
    id: r.id as string,
    fechaSolicitud: toTimestampIso(r.fecha_solicitud) ?? new Date().toISOString(),
    fechaResolucion: toTimestampIso(r.fecha_resolucion),
    tipo: r.tipo as InventarioMovimiento['tipo'],
    origen: r.origen as InventarioMovimiento['origen'],
    estado: r.estado as InventarioMovimiento['estado'],
    referenciaId: (r.referencia_id as string | null) ?? undefined,
    motivo: r.motivo as string,
    observaciones: (r.observaciones as string | null) ?? undefined,
    solicitadoPorId: (r.solicitado_por_id as string | null) ?? undefined,
    solicitadoPorNombre: (r.solicitado_por_nombre as string | null) ?? undefined,
    aprobadoPorId: (r.aprobado_por_id as string | null) ?? undefined,
    aprobadoPorNombre: (r.aprobado_por_nombre as string | null) ?? undefined,
    motivoRechazo: (r.motivo_rechazo as string | null) ?? undefined,
    detalles: (r.detalles as InventarioMovimiento['detalles']) ?? [],
  }
}

export class PostgresInventarioMovimientoRepository implements InventarioMovimientoRepositoryPort {
  async findAll(): Promise<InventarioMovimiento[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM inventario_movimientos WHERE workshop_id = $1 ORDER BY fecha_solicitud DESC, id DESC',
      [workshopId],
    )
    return r.rows.map(rowToInventarioMovimiento)
  }

  async findPage(query: InventarioMovimientoPageQuery): Promise<InventarioMovimientoPageResult> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const values: unknown[] = [workshopId]
    const where: string[] = ['workshop_id = $1']

    if (query.estado) {
      values.push(query.estado)
      where.push(`estado = $${values.length}`)
    }

    if (query.cursor) {
      values.push(query.cursor.fechaSolicitud)
      values.push(query.cursor.id)
      where.push(`(fecha_solicitud, id) < ($${values.length - 1}::timestamptz, $${values.length})`)
    }

    values.push(query.limit + 1)

    const sql = `
      SELECT *
      FROM inventario_movimientos
      WHERE ${where.join(' AND ')}
      ORDER BY fecha_solicitud DESC, id DESC
      LIMIT $${values.length}
    `

    const r = await pool.query(sql, values)
    const mapped = r.rows.map(rowToInventarioMovimiento)
    const hasMore = mapped.length > query.limit
    const items = hasMore ? mapped.slice(0, query.limit) : mapped
    const lastItem = hasMore ? items[items.length - 1] : null

    return {
      items,
      hasMore,
      nextCursor: lastItem
        ? {
            fechaSolicitud: lastItem.fechaSolicitud,
            id: lastItem.id,
          }
        : null,
    }
  }

  async findById(id: string): Promise<InventarioMovimiento | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM inventario_movimientos WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )
    if (r.rows.length === 0) return null
    return rowToInventarioMovimiento(r.rows[0])
  }

  async create(data: Omit<InventarioMovimiento, 'id'>): Promise<InventarioMovimiento> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'IM', 'inventario_movimientos')
    await pool.query(
      `INSERT INTO inventario_movimientos (
        id, workshop_id, fecha_solicitud, fecha_resolucion, tipo, origen, estado, referencia_id, motivo,
        observaciones, solicitado_por_id, solicitado_por_nombre, aprobado_por_id, aprobado_por_nombre,
        motivo_rechazo, detalles
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id,
        workshopId,
        data.fechaSolicitud,
        data.fechaResolucion ?? null,
        data.tipo,
        data.origen,
        data.estado,
        data.referenciaId ?? null,
        data.motivo,
        data.observaciones ?? '',
        data.solicitadoPorId ?? null,
        data.solicitadoPorNombre ?? null,
        data.aprobadoPorId ?? null,
        data.aprobadoPorNombre ?? null,
        data.motivoRechazo ?? null,
        JSON.stringify(data.detalles ?? []),
      ],
    )
    return this.findById(id) as Promise<InventarioMovimiento>
  }

  async update(id: string, data: Partial<InventarioMovimiento>): Promise<InventarioMovimiento | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE inventario_movimientos SET
        fecha_solicitud=$2, fecha_resolucion=$3, tipo=$4, origen=$5, estado=$6, referencia_id=$7, motivo=$8,
        observaciones=$9, solicitado_por_id=$10, solicitado_por_nombre=$11, aprobado_por_id=$12, aprobado_por_nombre=$13,
        motivo_rechazo=$14, detalles=$15
      WHERE id=$1 AND workshop_id=$16`,
      [
        id,
        merged.fechaSolicitud,
        merged.fechaResolucion ?? null,
        merged.tipo,
        merged.origen,
        merged.estado,
        merged.referenciaId ?? null,
        merged.motivo,
        merged.observaciones ?? '',
        merged.solicitadoPorId ?? null,
        merged.solicitadoPorNombre ?? null,
        merged.aprobadoPorId ?? null,
        merged.aprobadoPorNombre ?? null,
        merged.motivoRechazo ?? null,
        JSON.stringify(merged.detalles ?? []),
        workshopId,
      ],
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'DELETE FROM inventario_movimientos WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )
    return (r.rowCount ?? 0) > 0
  }
}
