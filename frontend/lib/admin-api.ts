import type { AdminUser } from './admin-auth'
import type { WorkshopCreateInput, WorkshopTenant } from './workshops'
import { apiRequest } from './api-client'

export type LoginRequest = {
  email: string
  password: string
  workshopId?: string
}

export type LoginResponse = {
  user: AdminUser
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export type PermissionDefinition = {
  code: string
  module: string
  name: string
  description: string
}

export type PermissionGroup = {
  id: string
  name: string
  description: string
  permissionCodes: string[]
  isSystem: boolean
  systemKey?: string | null
  memberCount?: number
}

export type UserPermissionAccess = {
  userId: string
  name: string
  email: string
  role: AdminUser['role']
  workshopId: string
  permissionGroupIds: string[]
  directPermissionCodes: string[]
  effectivePermissionCodes: string[]
}

export const loginAdmin = (input: LoginRequest): Promise<LoginResponse> =>
  apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuth: true,
  })

export const getWorkshops = (): Promise<WorkshopTenant[]> =>
  apiRequest<WorkshopTenant[]>('/workshops')

export const createWorkshop = (input: WorkshopCreateInput): Promise<WorkshopTenant> =>
  apiRequest<WorkshopTenant>('/workshops', {
    method: 'POST',
    body: input,
  })

export const updateWorkshop = (
  workshopId: string,
  patch: Partial<WorkshopTenant>,
): Promise<WorkshopTenant | null> =>
  apiRequest<WorkshopTenant>(`/workshops/${workshopId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteWorkshop = async (workshopId: string): Promise<boolean> => {
  await apiRequest<void>(`/workshops/${workshopId}`, {
    method: 'DELETE',
  })
  return true
}

export const getPermissionDefinitions = (): Promise<PermissionDefinition[]> =>
  apiRequest<PermissionDefinition[]>('/permissions/definitions')

export const getPermissionGroups = (): Promise<PermissionGroup[]> =>
  apiRequest<PermissionGroup[]>('/permissions/groups')

export const createPermissionGroup = (input: {
  name: string
  description?: string
  permissionCodes: string[]
}): Promise<PermissionGroup> =>
  apiRequest<PermissionGroup>('/permissions/groups', {
    method: 'POST',
    body: input,
  })

export const updatePermissionGroup = (
  groupId: string,
  patch: {
    name?: string
    description?: string
    permissionCodes?: string[]
  },
): Promise<PermissionGroup | null> =>
  apiRequest<PermissionGroup>(`/permissions/groups/${groupId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deletePermissionGroup = async (groupId: string): Promise<boolean> => {
  await apiRequest<void>(`/permissions/groups/${groupId}`, {
    method: 'DELETE',
  })
  return true
}

export const getUsersAccess = (): Promise<UserPermissionAccess[]> =>
  apiRequest<UserPermissionAccess[]>('/permissions/users')

export const updateUserAccess = (
  userId: string,
  input: {
    permissionGroupIds: string[]
    directPermissionCodes: string[]
  },
): Promise<UserPermissionAccess> =>
  apiRequest<UserPermissionAccess>(`/permissions/users/${userId}/access`, {
    method: 'PATCH',
    body: input,
  })
