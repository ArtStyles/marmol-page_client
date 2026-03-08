import type { AdminRole } from '../domain/entities/index.js'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string
        email: string
        role: AdminRole
        workshopId: string
      }
    }
  }
}

export {}
