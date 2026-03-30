import type { NextFunction, Request, Response } from 'express'
import {
  getDefaultPermissionCodesByRole,
  getDefaultSystemGroupIdsByRole,
  hasPermission,
} from '../../../application/security/permissions.js'
import { verifyAccessToken } from '../../../application/services/token.service.js'
import { runWithTenantContext } from '../../tenant/tenant-context.js'

const PUBLIC_PATHS = new Set(['/auth/login'])

function isPublicRequest(req: Request): boolean {
  if (PUBLIC_PATHS.has(req.path)) return true

  if (req.method === 'GET' && (req.path === '/catalogo' || req.path.startsWith('/catalogo/'))) {
    return true
  }

  return false
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== 'bearer') return null
  return token
}

function extractWorkshopHeader(req: Request): string | null {
  const raw = req.headers['x-workshop-id']
  if (Array.isArray(raw)) {
    const first = raw[0]?.trim()
    return first ? first : null
  }
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  return value ? value : null
}

export function authTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isPublicRequest(req)) {
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

  const requestedWorkshopId = extractWorkshopHeader(req)
  let workshopId = claims.workshopId
  const permissions =
    claims.permissions.length > 0
      ? claims.permissions
      : getDefaultPermissionCodesByRole(claims.role)
  const permissionGroups =
    claims.permissionGroups.length > 0
      ? claims.permissionGroups
      : getDefaultSystemGroupIdsByRole(claims.role)

  if (requestedWorkshopId) {
    if (hasPermission(permissions, 'workshops:override_scope')) {
      workshopId = requestedWorkshopId
    } else if (requestedWorkshopId !== claims.workshopId) {
      return res.status(403).json({
        error: 'Workshop override not allowed for this role',
        code: 'WORKSHOP_FORBIDDEN',
      })
    }
  }

  req.auth = {
    userId: claims.sub,
    email: claims.email,
    role: claims.role,
    workshopId,
    permissions,
    permissionGroups,
  }

  return runWithTenantContext(
    {
      workshopId,
      userId: claims.sub,
      userEmail: claims.email,
      userRole: claims.role,
    },
    next,
  )
}
