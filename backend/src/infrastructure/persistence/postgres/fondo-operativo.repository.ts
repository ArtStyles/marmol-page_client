import type { FondoOperativo } from '../../../domain/entities/index.js'
import type { FondoOperativoRepositoryPort } from '../../../domain/ports/index.js'
import { getPool } from './connection.js'
import { toTimestampIso } from './helpers.js'
import { getCurrentWorkshopId } from './tenant.js'

function rowToFondo(r: Record<string, unknown>): FondoOperativo {
  return {
    id: r.id as string,
    periodo: r.periodo as string,
    fondoInicial: Number(r.fondo_inicial),
    creadoPorId: (r.creado_por_id as string | null) ?? undefined,
    creadoPorNombre: (r.creado_por_nombre as string | null) ?? undefined,
    createdAt: toTimestampIso(r.created_at),
  }
}

export class PostgresFondoOperativoRepository implements FondoOperativoRepositoryPort {
  async findByPeriodo(periodo: string): Promise<FondoOperativo | null> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      'SELECT * FROM fondo_operativo WHERE workshop_id = $1 AND periodo = $2',
      [workshopId, periodo],
    )
    if (r.rows.length === 0) return null
    return rowToFondo(r.rows[0])
  }

  async upsert(data: Omit<FondoOperativo, 'id'>): Promise<FondoOperativo> {
    const pool = getPool()
    const workshopId = getCurrentWorkshopId()
    const r = await pool.query(
      `INSERT INTO fondo_operativo (id, workshop_id, periodo, fondo_inicial, creado_por_id, creado_por_nombre, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (workshop_id, periodo)
       DO UPDATE SET fondo_inicial = EXCLUDED.fondo_inicial,
                     creado_por_id = EXCLUDED.creado_por_id,
                     creado_por_nombre = EXCLUDED.creado_por_nombre,
                     created_at = NOW()
       RETURNING *`,
      [workshopId, data.periodo, data.fondoInicial, data.creadoPorId ?? null, data.creadoPorNombre ?? null],
    )
    return rowToFondo(r.rows[0])
  }
}
