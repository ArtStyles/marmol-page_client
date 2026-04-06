import type { AuthPort } from '../../../domain/ports/index.js'
import type { AdminUser } from '../../../domain/entities/index.js'
import { normalizeAdminRole } from '../../../application/security/role-normalization.js'
import { getPool } from './connection.js'

/**
 * Auth contra tabla admin_users.
 * password_hash en DB puede ser texto plano en desarrollo; en produccion usar bcrypt.
 */
export class PostgresAuthAdapter implements AuthPort {
  private async loginFromTrabajadores(
    identifier: string,
    password: string,
    workshopId?: string,
  ): Promise<AdminUser | null> {
    const pool = getPool()
    const result = await pool.query(
      `SELECT id, nombre, email, rol, workshop_id, contrasena
       FROM trabajadores
       WHERE estado = 'activo'
         AND contrasena IS NOT NULL
         AND contrasena <> ''
         AND (
           LOWER(email) = LOWER($1)
           OR (usuario IS NOT NULL AND LOWER(usuario) = LOWER($1))
         )
         AND ($2::text IS NULL OR workshop_id = $2)
       LIMIT 1`,
      [identifier, workshopId ?? null],
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    if ((row.contrasena as string) !== password) return null

    return {
      id: `TRA-${row.id as string}`,
      name: row.nombre as string,
      email: row.email as string,
      role: normalizeAdminRole(row.rol as string),
      workshopId: row.workshop_id as string,
    }
  }

  async login(email: string, password: string, workshopId?: string): Promise<AdminUser | null> {
    const pool = getPool()
    const r = await pool.query(
      'SELECT id, name, email, role, workshop_id, password_hash FROM admin_users WHERE LOWER(email) = LOWER($1)',
      [email],
    )

    if (r.rows.length > 0) {
      const row = r.rows[0]
      const storedHash = row.password_hash as string
      if (workshopId && (row.workshop_id as string) !== workshopId) return null
      if (storedHash === password) {
        return {
          id: row.id as string,
          name: row.name as string,
          email: row.email as string,
          role: normalizeAdminRole(row.role as string),
          workshopId: row.workshop_id as string,
        }
      }

      if ((row.id as string).startsWith('TRA-')) {
        return this.loginFromTrabajadores(email, password, workshopId)
      }

      return null
    }

    return this.loginFromTrabajadores(email, password, workshopId)
  }
}
