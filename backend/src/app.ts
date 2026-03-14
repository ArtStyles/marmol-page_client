import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { isDomainError } from './application/errors/domain.error.js'
import { authTenantMiddleware } from './infrastructure/http/middlewares/auth-tenant.middleware.js'
import apiRoutes from './infrastructure/http/routes/api.routes.js'

function getAllowedOrigins(): string[] {
  return (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function createApp() {
  const app = express()
  const allowedOrigins = getAllowedOrigins()

  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true)
          return
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        callback(new Error(`CORS origin not allowed: ${origin}`))
      },
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(morgan('dev'))

  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'marble-backend',
      timestamp: new Date().toISOString(),
    })
  })

  app.use('/api', authTenantMiddleware, apiRoutes)

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (isDomainError(error)) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        details: error.details,
      })
    }

    console.error(error)
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  })

  return app
}
