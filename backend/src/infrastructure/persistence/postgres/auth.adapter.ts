import type { AuthPort } from '../../../domain/ports/index.js'
import type { AdminUser } from '../../../domain/entities/index.js'
import { getPool } from './connection.js'

/**
 * Auth contra tabla admin_users.
 * password_hash en DB puede ser texto plano en desarrollo; en producción usar bcrypt.
 */
export class PostgresAuthAdapter implements AuthPort {
  async login(email: string, password: string): Promise<AdminUser | null> {
    const pool = getPool()
    const r = await pool.query(
      'SELECT id, name, email, role, password_hash FROM admin_users WHERE LOWER(email) = LOWER($1)',
      [email]
    )
    if (r.rows.length === 0) return null
    const row = r.rows[0]
    const storedHash = row.password_hash as string
    if (storedHash !== password) return null
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as AdminUser['role'],
    }
  }
}
