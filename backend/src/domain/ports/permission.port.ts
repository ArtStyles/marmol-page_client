import type {
  AdminRole,
  PermissionDefinition,
  PermissionGroup,
  ResolvedPermissionAccess,
  UserPermissionAccess,
} from '../entities/index.js'

export interface PermissionGroupCreateInput {
  name: string
  description?: string
  permissionCodes: string[]
}

export interface PermissionGroupUpdateInput {
  name?: string
  description?: string
  permissionCodes?: string[]
}

export interface UserAccessUpdateInput {
  permissionGroupIds: string[]
  directPermissionCodes: string[]
}

export interface PermissionRepositoryPort {
  listDefinitions(): Promise<PermissionDefinition[]>
  listGroups(): Promise<PermissionGroup[]>
  createGroup(data: PermissionGroupCreateInput): Promise<PermissionGroup>
  updateGroup(id: string, data: PermissionGroupUpdateInput): Promise<PermissionGroup | null>
  deleteGroup(id: string): Promise<boolean>
  listUserAccess(): Promise<UserPermissionAccess[]>
  updateUserAccess(userId: string, data: UserAccessUpdateInput): Promise<UserPermissionAccess | null>
  resolveUserAccess(userId: string, role: AdminRole): Promise<ResolvedPermissionAccess>
}

