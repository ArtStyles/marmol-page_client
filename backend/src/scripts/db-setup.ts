/**
 * Ejecuta el schema SQL contra la base de datos configurada en DATABASE_URL.
 * Uso: pnpm run db:setup
 */
import 'dotenv/config'
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const schemaPath = join(__dirname, '../infrastructure/persistence/postgres/schema.sql')

/** Pool config desde DATABASE_URL; password siempre string (pg/SCRAM lo exige). */
function getPoolConfig(url: string): pg.PoolConfig {
  try {
    const u = new URL(url)
    const password = u.password !== undefined && u.password !== null ? String(u.password) : ''
    return {
      host: u.hostname || 'localhost',
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname?.replace(/^\//, '') || 'marmol',
      user: u.username || undefined,
      password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  } catch {
    return { connectionString: url }
  }
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Falta DATABASE_URL en .env')
    process.exit(1)
  }

  const schema = readFileSync(schemaPath, 'utf-8')
  const config = getPoolConfig(url)
  const pool = new pg.Pool(config)

  try {
    await pool.query(schema)
    console.log('Schema aplicado correctamente en la base de datos.')
  } catch (err) {
    console.error('Error al aplicar el schema:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
