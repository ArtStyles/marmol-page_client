import { AsyncLocalStorage } from 'node:async_hooks'
import type { AdminRole } from '../../domain/entities/index.js'

export interface TenantRequestContext {
  workshopId: string
  userId?: string
  userEmail?: string
  userRole?: AdminRole
}

const DEFAULT_WORKSHOP_ID = process.env.DEFAULT_WORKSHOP_ID ?? 'TLR-001'
const storage = new AsyncLocalStorage<TenantRequestContext>()

export function runWithTenantContext<T>(context: TenantRequestContext, callback: () => T): T {
  return storage.run(context, callback)
}

export function getTenantContext(): TenantRequestContext | undefined {
  return storage.getStore()
}

export function getActiveWorkshopId(): string {
  return storage.getStore()?.workshopId ?? DEFAULT_WORKSHOP_ID
}
