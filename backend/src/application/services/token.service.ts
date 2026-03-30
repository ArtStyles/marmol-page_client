import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AdminRole } from '../../domain/entities/index.js'

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60 * 60 * 12)
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET ?? 'dev-only-change-this-secret'

export interface AccessTokenClaims {
  sub: string
  email: string
  role: AdminRole
  workshopId: string
  permissions: string[]
  permissionGroups: string[]
  iat: number
  exp: number
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signMessage(message: string): string {
  return createHmac('sha256', TOKEN_SECRET).update(message).digest('base64url')
}

export function issueAccessToken(input: {
  userId: string
  email: string
  role: AdminRole
  workshopId: string
  permissions: string[]
  permissionGroups: string[]
}): { token: string; expiresIn: number } {
  const nowInSeconds = Math.floor(Date.now() / 1000)
  const claims: AccessTokenClaims = {
    sub: input.userId,
    email: input.email,
    role: input.role,
    workshopId: input.workshopId,
    permissions: input.permissions,
    permissionGroups: input.permissionGroups,
    iat: nowInSeconds,
    exp: nowInSeconds + ACCESS_TOKEN_TTL_SECONDS,
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64UrlEncode(JSON.stringify(claims))
  const message = `${header}.${payload}`
  const signature = signMessage(message)

  return {
    token: `${message}.${signature}`,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  }
}

export function verifyAccessToken(token: string): AccessTokenClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, receivedSignature] = parts
  const message = `${header}.${payload}`
  const expectedSignature = signMessage(message)

  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(receivedSignature)
  if (expectedBuffer.length !== receivedBuffer.length) return null
  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) return null

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as AccessTokenClaims
    if (!parsed.sub || !parsed.email || !parsed.role || !parsed.workshopId) return null
    if (!Array.isArray(parsed.permissions) || !Array.isArray(parsed.permissionGroups)) return null
    if (!parsed.permissions.every((item) => typeof item === 'string')) return null
    if (!parsed.permissionGroups.every((item) => typeof item === 'string')) return null
    if (typeof parsed.exp !== 'number' || typeof parsed.iat !== 'number') return null
    const nowInSeconds = Math.floor(Date.now() / 1000)
    if (parsed.exp <= nowInSeconds) return null
    return parsed
  } catch {
    return null
  }
}
