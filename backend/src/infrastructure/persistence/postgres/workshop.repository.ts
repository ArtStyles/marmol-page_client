import type { WorkshopRepositoryPort } from '../../../domain/ports/index.js'
import type { WorkshopTenant } from '../../../domain/entities/index.js'
import type { WorkshopCreateInput } from '../../../domain/ports/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'

function rowToWorkshop(r: Record<string, unknown>): WorkshopTenant {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    ciudad: r.ciudad as string,
    direccion: (r.direccion as string) ?? '',
    encargado: r.encargado as string,
    telefono: (r.telefono as string) ?? '',
    correo: r.correo as string,
    estado: r.estado as WorkshopTenant['estado'],
    empleados: Number(r.empleados),
    capacidadM2Mes: Number(r.capacidad_m2_mes),
    ventasMes: Number(r.ventas_mes),
    produccionMesM2: Number(r.produccion_mes_m2),
    margenOperativo: Number(r.margen_operativo),
    ordenesActivas: Number(r.ordenes_activas),
    ultimaActualizacion: r.ultima_actualizacion as string,
  }
}

export class PostgresWorkshopRepository implements WorkshopRepositoryPort {
  async findAll(): Promise<WorkshopTenant[]> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM workshops ORDER BY id')
    return r.rows.map(rowToWorkshop)
  }

  async findById(id: string): Promise<WorkshopTenant | null> {
    const pool = getPool()
    const r = await pool.query('SELECT * FROM workshops WHERE id = $1', [id])
    if (r.rows.length === 0) return null
    return rowToWorkshop(r.rows[0])
  }

  async create(data: WorkshopCreateInput): Promise<WorkshopTenant> {
    const pool = getPool()
    const id = await nextId(pool, 'TLR-', 'workshops')
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
