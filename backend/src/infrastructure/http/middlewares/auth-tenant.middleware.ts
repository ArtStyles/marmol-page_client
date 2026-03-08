import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../../../application/services/token.service.js'
import { runWithTenantContext } from '../../tenant/tenant-context.js'

const PUBLIC_PATHS = new Set(['/auth/login'])

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== 'bearer') return null
  return token
}

export function authTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.has(req.path)) {
    return next()
  }

  const token = extractBearerToken(req.headers.authorization)
  if (!token) {
    return res.status(401).json({
      error: 'Missing bearer token',
      code: 'AUTH_REQUIRED',
    })
  }

  const claims = verifyAccessToken(token)
  if (!claims) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'AUTH_INVALID_TOKEN',
    })
  }

  req.auth = {
    userId: claims.sub,
    email: claims.email,
    role: claims.role,
    workshopId: claims.workshopId,
  }

  return runWithTenantContext(
    {
      workshopId: claims.workshopId,
      userId: claims.sub,
      userEmail: claims.email,
      userRole: claims.role,
    },
    next,
  )
}
