import type { PermissionDefinition, PermissionGroup, UserPermissionAccess } from '../../domain/entities/index.js'

export type PermissionDefinitionDto = PermissionDefinition
export type PermissionGroupDto = PermissionGroup
export type UserPermissionAccessDto = UserPermissionAccess

export interface CreatePermissionGroupDto {
  name: string
  description?: string
  permissionCodes: string[]
}

export interface UpdatePermissionGroupDto {
  name?: string
  description?: string
  permissionCodes?: string[]
}

export interface UpdateUserAccessDto {
  permissionGroupIds: string[]
  directPermissionCodes: string[]
}

