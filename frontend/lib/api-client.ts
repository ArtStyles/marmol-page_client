import { ADMIN_STORAGE_KEY, ADMIN_TOKEN_STORAGE_KEY } from './admin-auth'
import { WORKSHOP_STORAGE_KEY } from './workshops'

const defaultApiBaseUrl = typeof window === 'undefined' ? 'http://localhost:4000/api' : '/api'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl).replace(
  /\/$/,
  '',
)
const DEFAULT_GET_CACHE_TTL_MS = 15_000

export const ADMIN_AUTH_EXPIRED_EVENT = 'marble-admin-auth-expired'
export const ADMIN_LOGOUT_EVENT = 'marble-admin-logout'

type AuthExpiredReason = 'expired' | 'invalid'

export type AuthExpiredDetail = {
  reason: AuthExpiredReason
}

let lastExpiredToken: string | null = null
const getResponseCache = new Map<string, { expiresAt: number; payload: unknown }>()
const inflightGetRequests = new Map<string, Promise<unknown>>()

function decodeBase64Url(value: string): string | null {
  if (typeof window === 'undefined') return null

  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return window.atob(padded)
  } catch {
    return null
  }
}

function readTokenExp(token: string): number | null {
  const [, payload] = token.split('.')
  if (!payload) return null

  const decodedPayload = decodeBase64Url(payload)
  if (!decodedPayload) return null

  try {
    const parsed = JSON.parse(decodedPayload) as { exp?: unknown }
    return typeof parsed.exp === 'number' ? parsed.exp : null
  } catch {
    return null
  }
}

function notifyAuthExpired(reason: AuthExpiredReason, token: string | null): void {
  if (typeof window === 'undefined') return
  if (token && lastExpiredToken === token) return

  lastExpiredToken = token
  window.dispatchEvent(
    new CustomEvent<AuthExpiredDetail>(ADMIN_AUTH_EXPIRED_EVENT, {
      detail: { reason },
    }),
  )
}

function resetAuthExpiredState(): void {
  lastExpiredToken = null
}

export function notifyAdminLogout(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT))
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, options: { status: number; code?: string; details?: unknown }) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }
}

export function isAccessTokenExpired(token: string, nowInMs: number = Date.now()): boolean {
  const exp = readTokenExp(token)
  if (!exp) return false
  return exp * 1000 <= nowInMs
}

export function clearStoredAdminSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ADMIN_STORAGE_KEY)
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(WORKSHOP_STORAGE_KEY)
  clearApiResponseCache()
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
  if (!token) return null

  if (isAccessTokenExpired(token)) {
    clearStoredAdminSession()
    notifyAuthExpired('expired', token)
    return null
  }

  return token
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return

  if (!token) {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
    clearApiResponseCache()
    return
  }

  resetAuthExpiredState()
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
  clearApiResponseCache()
}

export function getStoredWorkshopId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(WORKSHOP_STORAGE_KEY)
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  token?: string | null
  skipAuth?: boolean
  cacheTtlMs?: number
  skipCache?: boolean
}

export function clearApiResponseCache(): void {
  getResponseCache.clear()
  inflightGetRequests.clear()
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function getCacheKey(url: string, headers: Record<string, string>): string {
  const headerSignature = Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|')

  return `${url}|${headerSignature}`
}

function getCachedResponse<T>(cacheKey: string): { hit: false } | { hit: true; payload: T } {
  const cached = getResponseCache.get(cacheKey)
  if (!cached) return { hit: false }
  if (cached.expiresAt <= Date.now()) {
    getResponseCache.delete(cacheKey)
    return { hit: false }
  }

  return { hit: true, payload: cached.payload as T }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const normalizedPath = normalizePath(path)
  const requestUrl = `${API_BASE_URL}${normalizedPath}`
  const token = options.token ?? getStoredAccessToken()
  const workshopId = getStoredWorkshopId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }
  const isGetRequest = method === 'GET'
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS
  const shouldUseCache = isGetRequest && !options.skipCache && cacheTtlMs > 0

  if (!options.skipAuth && token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (!options.skipAuth && workshopId) {
    headers['x-workshop-id'] = workshopId
  }
  const cacheKey = shouldUseCache ? getCacheKey(requestUrl, headers) : null

  if (cacheKey) {
    const cached = getCachedResponse<T>(cacheKey)
    if (cached.hit) return cached.payload

    const inflight = inflightGetRequests.get(cacheKey)
    if (inflight) {
      return (await inflight) as T
    }
  }

  const requestPromise = (async () => {
    const response = await fetch(requestUrl, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: shouldUseCache ? 'default' : 'no-store',
    })

    const raw = await response.text()
    let payload: unknown = null

    if (raw) {
      try {
        payload = JSON.parse(raw)
      } catch {
        payload = raw
      }
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String((payload as { error?: unknown }).error ?? 'Request failed')
          : `Request failed with status ${response.status}`
      const code =
        typeof payload === 'object' && payload !== null && 'code' in payload
          ? String((payload as { code?: unknown }).code ?? '')
          : undefined
      const details =
        typeof payload === 'object' && payload !== null && 'details' in payload
          ? (payload as { details?: unknown }).details
          : undefined

      if (!options.skipAuth && response.status === 401) {
        const isAuthInvalidToken = code === 'AUTH_INVALID_TOKEN'
        const tokenExpired = Boolean(token && isAccessTokenExpired(token))
        if (isAuthInvalidToken || tokenExpired) {
          clearStoredAdminSession()
          notifyAuthExpired(tokenExpired ? 'expired' : 'invalid', token ?? null)
        }
      }

      throw new ApiError(message, { status: response.status, code, details })
    }

    if (!isGetRequest) {
      clearApiResponseCache()
    } else if (cacheKey) {
      getResponseCache.set(cacheKey, {
        expiresAt: Date.now() + cacheTtlMs,
        payload,
      })
    }

    return payload as T
  })()

  if (!cacheKey) {
    return requestPromise
  }

  inflightGetRequests.set(cacheKey, requestPromise as Promise<unknown>)
  try {
    return await requestPromise
  } finally {
    inflightGetRequests.delete(cacheKey)
  }
}
