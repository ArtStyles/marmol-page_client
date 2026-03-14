import { ADMIN_TOKEN_STORAGE_KEY } from './admin-auth'
import { WORKSHOP_STORAGE_KEY } from './workshops'

const defaultApiBaseUrl = typeof window === 'undefined' ? 'http://localhost:4000/api' : '/api'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl).replace(
  /\/$/,
  '',
)

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

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (!token) {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
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
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const token = options.token ?? getStoredAccessToken()
  const workshopId = getStoredWorkshopId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (!options.skipAuth && token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (!options.skipAuth && workshopId) {
    headers['x-workshop-id'] = workshopId
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
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
    throw new ApiError(message, { status: response.status, code, details })
  }

  return payload as T
}
