import type { NextFunction, Request, Response } from 'express'

export function requirePermission(permissionCode: string) {
  return function permissionGuard(req: Request, res: Response, next: NextFunction) {
    const auth = req.auth
    if (!auth) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    if (!auth.permissions.includes(permissionCode)) {
      return res.status(403).json({
        error: `Missing permission: ${permissionCode}`,
        code: 'AUTH_FORBIDDEN',
      })
    }

    return next()
  }
}

