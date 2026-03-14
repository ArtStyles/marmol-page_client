import type { WorkshopRepositoryPort } from '../../../domain/ports/index.js'
import type { WorkshopTenant } from '../../../domain/entities/index.js'
import type { WorkshopCreateInput } from '../../../domain/ports/index.js'
import { randomBytes } from 'node:crypto'
import { getPool } from './connection.js'

function asNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function rowToWorkshop(r: Record<string, unknown>): WorkshopTenant {
  const ventasMesReal = asNumber(r.ventas_mes_real)
  const gastosMesReal = asNumber(r.gastos_mes_real)
  const hasVentasMes = Boolean(r.has_ventas_mes)
  const margenOperativoReal =
    ventasMesReal > 0 ? Number(((ventasMesReal - gastosMesReal) / ventasMesReal).toFixed(4)) : 0

  return {
    id: r.id as string,
    nombre: r.nombre as string,
    ciudad: r.ciudad as string,
    direccion: (r.direccion as string) ?? '',
    encargado: r.encargado as string,
    telefono: (r.telefono as string) ?? '',
    correo: r.correo as string,
    estado: r.estado as WorkshopTenant['estado'],
    empleados: asNumber(r.empleados_real),
    capacidadM2Mes: asNumber(r.capacidad_m2_mes),
    ventasMes: asNumber(r.ventas_mes_real),
    produccionMesM2: asNumber(r.produccion_mes_m2_real),
    margenOperativo: hasVentasMes ? margenOperativoReal : 0,
    ordenesActivas: asNumber(r.ordenes_activas_real),
    ultimaActualizacion:
      (r.ultima_actualizacion_real as string | null | undefined) ??
      (r.ultima_actualizacion as string),
  }
}

function generateWorkshopId(): string {
  return `wks_${randomBytes(16).toString('hex')}`
}

async function generateUniqueWorkshopId(): Promise<string> {
  const pool = getPool()

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateWorkshopId()
    const exists = await pool.query('SELECT 1 FROM workshops WHERE id = $1 LIMIT 1', [candidate])
    if (exists.rows.length === 0) return candidate
  }

  throw new Error('Unable to generate unique workshop id')
}

export class PostgresWorkshopRepository implements WorkshopRepositoryPort {
  private async findWithRealtimeMetrics(id?: string): Promise<WorkshopTenant[]> {
    const pool = getPool()
    const params: unknown[] = []
    const whereClause =
      id != null
        ? (() => {
            params.push(id)
            return 'WHERE w.id = $1'
          })()
        : ''

    const query = `
      WITH empleados AS (
        SELECT workshop_id, COUNT(*)::int AS empleados_real
        FROM trabajadores
        GROUP BY workshop_id
      ),
      produccion_mes AS (
        SELECT workshop_id, COALESCE(SUM(total_m2), 0)::numeric AS produccion_mes_m2_real
        FROM produccion
        WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY workshop_id
      ),
      ventas_mes AS (
        SELECT
          workshop_id,
          COALESCE(SUM(total), 0)::numeric AS ventas_mes_real,
          COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS ordenes_activas_real,
          true AS has_ventas_mes
        FROM ventas
        WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY workshop_id
      ),
      gastos_mes AS (
        SELECT
          workshop_id,
          COALESCE(SUM(costo), 0)::numeric AS gastos_mes_real
        FROM gastos
        WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY workshop_id
      ),
      actividad AS (
        SELECT workshop_id, MAX(fecha)::text AS ultima_actualizacion_real
        FROM (
          SELECT workshop_id, fecha FROM ventas
          UNION ALL
          SELECT workshop_id, fecha FROM produccion
          UNION ALL
          SELECT workshop_id, fecha FROM mermas
          UNION ALL
          SELECT workshop_id, fecha FROM gastos
          UNION ALL
          SELECT workshop_id, fecha FROM historial_pagos
        ) activity_rows
        GROUP BY workshop_id
      )
      SELECT
        w.*,
        e.empleados_real,
        p.produccion_mes_m2_real,
        v.ventas_mes_real,
        g.gastos_mes_real,
        v.ordenes_activas_real,
        (v.has_ventas_mes IS TRUE) AS has_ventas_mes,
        a.ultima_actualizacion_real
      FROM workshops w
      LEFT JOIN empleados e ON e.workshop_id = w.id
      LEFT JOIN produccion_mes p ON p.workshop_id = w.id
      LEFT JOIN ventas_mes v ON v.workshop_id = w.id
      LEFT JOIN gastos_mes g ON g.workshop_id = w.id
      LEFT JOIN actividad a ON a.workshop_id = w.id
      ${whereClause}
      ORDER BY w.id
    `

    const result = await pool.query(query, params)
    return result.rows.map((row) => rowToWorkshop(row as Record<string, unknown>))
  }

  async findAll(): Promise<WorkshopTenant[]> {
    return this.findWithRealtimeMetrics()
  }

  async findById(id: string): Promise<WorkshopTenant | null> {
    const rows = await this.findWithRealtimeMetrics(id)
    return rows[0] ?? null
  }

  async create(data: WorkshopCreateInput): Promise<WorkshopTenant> {
    const pool = getPool()
    const id = await generateUniqueWorkshopId()
    const today = new Date().toISOString().split('T')[0]
    await pool.query(
      `INSERT INTO workshops (id, nombre, ciudad, direccion, encargado, telefono, correo, estado, empleados, capacidad_m2_mes, ventas_mes, produccion_mes_m2, margen_operativo, ordenes_activas, ultima_actualizacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'en-implementacion',0,0,0,0,0,0,$8)`,
      [
        id,
        data.nombre,
        data.ciudad,
        data.direccion,
        data.encargado,
        data.telefono,
        data.correo,
        today,
      ]
    )
    return this.findById(id) as Promise<WorkshopTenant>
  }

  async update(id: string, data: Partial<WorkshopTenant>): Promise<WorkshopTenant | null> {
    const current = await this.findById(id)
    if (!current) return null
    const merged = { ...current, ...data }
    const pool = getPool()
    await pool.query(
      `UPDATE workshops SET nombre=$2, ciudad=$3, direccion=$4, encargado=$5, telefono=$6, correo=$7, estado=$8, empleados=$9, capacidad_m2_mes=$10, ventas_mes=$11, produccion_mes_m2=$12, margen_operativo=$13, ordenes_activas=$14, ultima_actualizacion=$15 WHERE id=$1`,
      [
        id,
        merged.nombre,
        merged.ciudad,
        merged.direccion,
        merged.encargado,
        merged.telefono,
        merged.correo,
        merged.estado,
        merged.empleados,
        merged.capacidadM2Mes,
        merged.ventasMes,
        merged.produccionMesM2,
        merged.margenOperativo,
        merged.ordenesActivas,
        merged.ultimaActualizacion,
      ]
    )
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool()
    const r = await pool.query('DELETE FROM workshops WHERE id = $1', [id])
    return (r.rowCount ?? 0) > 0
  }
}
