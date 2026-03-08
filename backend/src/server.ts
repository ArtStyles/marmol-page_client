import 'dotenv/config'
import { createApp } from './app.js'
import {
  closePool,
  getDatabaseSummary,
  verifyPostgresConnection,
} from './infrastructure/persistence/postgres/connection.js'

const port = Number(process.env.PORT ?? 4000)

async function logDatabaseStartupStatus(): Promise<void> {
  const summary = getDatabaseSummary()

  if (!summary) {
    console.log('[db] DATABASE_URL no definida. Backend en modo in-memory.')
    return
  }

  console.log(
    `[db] Verificando conexion PostgreSQL -> host=${summary.host} port=${summary.port} db=${summary.database} user=${summary.user} password=${summary.hasPassword ? 'set' : 'empty'}`,
  )

  if (!summary.hasPassword) {
    console.warn(
      '[db] Aviso: DATABASE_URL no incluye password. Si PostgreSQL usa SCRAM, la conexion fallara.',
    )
  }

  const status = await verifyPostgresConnection()
  console.log(
    `[db] Conexion PostgreSQL exitosa -> db=${status.database} user=${status.user} server_time=${status.now}`,
  )
}

async function bootstrap(): Promise<void> {
  try {
    await logDatabaseStartupStatus()
  } catch (error) {
    console.error('[db] Error al conectar con PostgreSQL durante el arranque.')
    console.error(error)
    process.exit(1)
  }

  const app = createApp()
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`)
  })
}

void bootstrap()

process.on('SIGINT', async () => {
  await closePool()
  process.exit(0)
})
