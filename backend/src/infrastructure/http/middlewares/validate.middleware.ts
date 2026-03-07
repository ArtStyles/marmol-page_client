import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

/**
 * Middleware que valida el body con un esquema Zod y devuelve 400 con detalles si falla.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (result.success) {
      req.body = result.data
      return next()
    }
    const error = result.error as ZodError
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    })
  }
}
