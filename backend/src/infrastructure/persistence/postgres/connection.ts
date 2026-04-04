import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null
const REQUIRED_TABLES = [
  'configuracion',
  'bloques',
  'productos',
  'catalogo_items',
  'trabajadores',
  'equipos',
  'produccion',
  'produccion_trabajadores',
  'mermas',
  'ventas',
  'gastos',
  'historial_pagos',
  'system_logs',
  'inventario_movimientos',
  'workshops',
  'admin_users',
] as const

const REQUIRED_COLUMNS = [
  { table: 'productos', column: 'ubicacion' },
  { table: 'produccion', column: 'cantidad_resinar' },
] as const

export interface DatabaseSummary {
  host: string
  port: number
  database: string
  user: string
  hasPassword: boolean
}

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

function summaryFromUrl(url: string): DatabaseSummary | null {
  try {
    const u = new URL(url)
    return {
      host: u.hostname || 'localhost',
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname?.replace(/^\//, '') || 'marmol',
      user: u.username || '(default)',
      hasPassword: u.password.length > 0,
    }
  } catch {
    return null
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

export function getDatabaseSummary(): DatabaseSummary | null {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return summaryFromUrl(url)
}

export async function verifyPostgresConnection(): Promise<{
  now: string
  database: string
  user: string
}> {
  const pool = getPool()
  const r = await pool.query<{ now: string; database: string; user: string }>(
    'SELECT NOW()::text AS now, current_database() AS database, current_user AS user',
  )
  return r.rows[0]
}

export async function verifyPostgresSchema(): Promise<{
  ok: boolean
  missingTables: string[]
  missingColumns: string[]
}> {
  const pool = getPool()
  const required = [...REQUIRED_TABLES]
  const r = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       AND table_name = ANY($1::text[])`,
    [required],
  )

  const existing = new Set(r.rows.map((row) => row.table_name))
  const missingTables = required.filter((tableName) => !existing.has(tableName))

  const requiredColumns = REQUIRED_COLUMNS.map((item) => [item.table, item.column] as const)
  const columnResult = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND (table_name, column_name) IN (
         SELECT pair.table_name, pair.column_name
         FROM UNNEST($1::text[], $2::text[]) AS pair(table_name, column_name)
       )`,
    [
      requiredColumns.map(([table]) => table),
      requiredColumns.map(([, column]) => column),
    ],
  )
  const existingColumns = new Set(columnResult.rows.map((row) => `${row.table_name}.${row.column_name}`))
  const missingColumns = requiredColumns
    .map(([table, column]) => `${table}.${column}`)
    .filter((key) => !existingColumns.has(key))

  return {
    ok: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
  }
}

