import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import apiRoutes from './infrastructure/http/routes/api.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
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

  app.use('/api', apiRoutes)

  return app
}
