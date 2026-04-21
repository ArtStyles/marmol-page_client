import type { HistorialPagoRepositoryPort } from '../../../domain/ports/index.js'
import type { HistorialPago } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId, toDateOnly, toTimestampIso } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToHistorialPago(r: Record<string, unknown>): HistorialPago {
  return {
    id: r.id as string,
    createdAt: toTimestampIso(r.created_at),
    creadoPorId: (r.creado_por_id as string | null) ?? undefined,
    creadoPorNombre: (r.creado_por_nombre as string | null) ?? undefined,
    trabajadorId: r.trabajador_id as string,
    trabajadorNombre: r.trabajador_nombre as string,
    fecha: toDateOnly(r.fecha),
    produccionIds: (r.produccion_ids as string[]) ?? [],
    montoAcciones: Number(r.monto_acciones),
    montoBonos: Number(r.monto_bonos),
    bonoExtra: Number(r.bono_extra),
    motivoBonoExtra: (r.motivo_bono_extra as string) ?? '',
    totalPagado: Number(r.total_pagado),
    observaciones: (r.observaciones as string) ?? '',
  }
}

export class PostgresHistorialPagoRepository implements HistorialPagoRepositoryPort {
  async findAll(): Promise<HistorialPago[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM historial_pagos WHERE workshop_id = $1 ORDER BY fecha DESC, id',
      [workshopId],
    )
    return r.rows.map(rowToHistorialPago)
  }

  async findById(id: string): Promise<HistorialPago | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM historial_pagos WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )
    if (r.rows.length === 0) return null
    return rowToHistorialPago(r.rows[0])
  }

  async create(data: Omit<HistorialPago, 'id'>): Promise<HistorialPago> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'HP', 'historial_pagos')
    await pool.query(
      `INSERT INTO historial_pagos (id, workshop_id, trabajador_id, trabajador_nombre, fecha, produccion_ids, monto_acciones, monto_bonos, bono_extra, motivo_bono_extra, total_pagado, observaciones, creado_por_id, creado_por_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id,
        workshopId,
        data.trabajadorId,
        data.trabajadorNombre,
        data.fecha,
        JSON.stringify(data.produccionIds),
        data.montoAcciones,
        data.montoBonos,
        data.bonoExtra,
        data.motivoBonoExtra ?? '',
        data.totalPagado,
        data.observaciones ?? '',
        data.creadoPorId ?? null,
        data.creadoPorNombre ?? null,
      ]
    )
    return this.findById(id) as Promise<HistorialPago>
  }

  async update(id: string, data: Partial<HistorialPago>): Promise<HistorialPago | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    await pool.query(
      `UPDATE historial_pagos SET trabajador_id=$2, trabajador_nombre=$3, fecha=$4, produccion_ids=$5, monto_acciones=$6, monto_bonos=$7, bono_extra=$8, motivo_bono_extra=$9, total_pagado=$10, observaciones=$11, creado_por_id=$12, creado_por_nombre=$13 WHERE id=$1 AND workshop_id=$14`,
      [
        id,
        merged.trabajadorId,
        merged.trabajadorNombre,
        merged.fecha,
        JSON.stringify(merged.produccionIds),
        merged.montoAcciones,
        merged.montoBonos,
        merged.bonoExtra,
        merged.motivoBonoExtra ?? '',
        merged.totalPagado,
        merged.observaciones ?? '',
        merged.creadoPorId ?? null,
        merged.creadoPorNombre ?? null,
        workshopId,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'DELETE FROM historial_pagos WHERE id = $1 AND workshop_id = $2',
      [id, workshopId],
    )
    return (r.rowCount ?? 0) > 0
  }
}
