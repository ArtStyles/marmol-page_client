/**
 * Ejecuta migraciones SQL incrementales contra la base configurada en DATABASE_URL.
 * Uso: pnpm run db:migrate
 */
import 'dotenv/config'
import pg from 'pg'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '../infrastructure/persistence/postgres/migrations')
const migrationsTable = 'schema_migrations'

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

function getTemplateValues(): Record<string, string> {
  return {
    SUPER_ADMIN_ID: process.env.SUPER_ADMIN_ID || 'SUP-001',
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'superadmin@marmol.local',
    SUPER_ADMIN_WORKSHOP_ID: process.env.SUPER_ADMIN_WORKSHOP_ID || 'TLR-001',
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'super123',
    SUPER_ADMIN_ROLE: process.env.SUPER_ADMIN_ROLE || 'Super Admin',
  }
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''")
}

function renderTemplate(sql: string, values: Record<string, string>): string {
  return sql.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      throw new Error(`Placeholder no soportado en migracion: ${key}`)
    }
    return escapeSqlLiteral(values[key])
  })
}

function listMigrationFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Falta DATABASE_URL en .env')
    process.exit(1)
  }

  if (!existsSync(migrationsDir)) {
    console.log('No existe directorio de migraciones, no hay cambios que aplicar.')
    return
  }

  const migrationFiles = listMigrationFiles(migrationsDir)
  if (migrationFiles.length === 0) {
    console.log('No hay migraciones SQL para ejecutar.')
    return
  }

  const templateValues = getTemplateValues()
  const pool = new pg.Pool(getPoolConfig(url))

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${migrationsTable} (
        name TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const appliedResult = await pool.query<{ name: string }>(`SELECT name FROM ${migrationsTable}`)
    const appliedMigrations = new Set(appliedResult.rows.map((row) => row.name))

    let appliedCount = 0

    for (const fileName of migrationFiles) {
      if (appliedMigrations.has(fileName)) continue

      const filePath = join(migrationsDir, fileName)
      const rawSql = readFileSync(filePath, 'utf-8')
      const migrationSql = renderTemplate(rawSql, templateValues)
      const client = await pool.connect()

      try {
        await client.query('BEGIN')
        await client.query(migrationSql)
        await client.query(`INSERT INTO ${migrationsTable} (name) VALUES ($1)`, [fileName])
        await client.query('COMMIT')
        appliedCount += 1
        console.log(`Migracion aplicada: ${fileName}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

    if (appliedCount === 0) {
      console.log('Migraciones al dia. No se aplicaron cambios.')
      return
    }

    console.log(`Migraciones aplicadas correctamente: ${appliedCount}`)
  } catch (error) {
    console.error('Error al ejecutar migraciones:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
