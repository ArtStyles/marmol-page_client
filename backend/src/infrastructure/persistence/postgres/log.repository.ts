import type { LogRepositoryPort } from '../../../domain/ports/index.js'
import type { SystemLog } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'
import { nextId } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToLog(r: Record<string, unknown>): SystemLog {
  return {
    id: r.id as string,
    fecha: r.fecha as string,
    usuario: r.usuario as string,
    accion: r.accion as string,
    modulo: r.modulo as string,
    descripcion: r.descripcion as string,
    nivel: r.nivel as SystemLog['nivel'],
  }
}

export class PostgresLogRepository implements LogRepositoryPort {
  async findAll(): Promise<SystemLog[]> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM system_logs WHERE workshop_id = $1 ORDER BY fecha DESC, id',
      [workshopId],
    )
    return r.rows.map(rowToLog)
  }

  async create(data: Omit<SystemLog, 'id'>): Promise<SystemLog> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const id = await nextId(pool, 'LOG', 'system_logs')
    await pool.query(
      `INSERT INTO system_logs (id, workshop_id, fecha, usuario, accion, modulo, descripcion, nivel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        workshopId,
        data.fecha,
        data.usuario,
        data.accion,
        data.modulo,
        data.descripcion,
        data.nivel,
      ]
    )
    const r2 = await pool.query('SELECT * FROM system_logs WHERE id = $1 AND workshop_id = $2', [
      id,
      workshopId,
    ])
    return rowToLog(r2.rows[0])
  }
}
