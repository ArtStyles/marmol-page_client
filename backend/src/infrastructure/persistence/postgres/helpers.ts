import type { Pool } from 'pg'

/**
 * Genera el siguiente ID para una tabla con prefijo (ej: BL001 -> BL002).
 * Si no hay filas, devuelve prefix + '001'.
 */
export async function nextId(pool: Pool, prefix: string, tableName: string): Promise<string> {
  const col = tableName === 'configuracion' ? 'id' : 'id'
  const r = await pool.query(
    `SELECT ${col} FROM ${tableName} WHERE ${col} LIKE $1 ORDER BY ${col} DESC LIMIT 1`,
    [`${prefix}%`]
  )
  if (r.rows.length === 0) {
    const defaultNum = prefix.endsWith('-') ? '001' : '001'
    return `${prefix}${defaultNum}`
  }
  const last = r.rows[0][col] as string
  const num = parseInt(last.replace(prefix, ''), 10) || 0
  const pad = prefix.endsWith('-') ? 3 : 3
  return `${prefix}${String(num + 1).padStart(pad, '0')}`
}
