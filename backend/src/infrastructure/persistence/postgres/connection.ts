import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

/** Asegura password como string (pg lo exige; sin pass usar ''). */
function poolConfigFromUrl(url: string): pg.PoolConfig {
  try {
    const u = new URL(url)
    return {
      host: u.hostname || 'localhost',
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname?.replace(/^\//, '') || 'marmol',
      user: u.username || undefined,
      password: u.password ?? '',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  } catch {
    return { connectionString: url }
  }
}

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is required for PostgreSQL')
    pool = new Pool(poolConfigFromUrl(url))
  }
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
