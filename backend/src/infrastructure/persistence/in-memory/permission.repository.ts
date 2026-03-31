import { randomBytes } from 'node:crypto'
import { DomainError } from '../../../application/errors/domain.error.js'
import {
  ALL_PERMISSION_CODES,
  PERMISSION_DEFINITIONS,
  SYSTEM_PERMISSION_GROUPS,
  getDefaultPermissionCodesByRole,
  getDefaultSystemGroupIdsByRole,
  normalizePermissionCodes,
} from '../../../application/security/permissions.js'
import type {
  AdminUser,
  PermissionDefinition,
  PermissionGroup,
  ResolvedPermissionAccess,
  UserPermissionAccess,
} from '../../../domain/entities/index.js'
import type {
  PermissionGroupCreateInput,
  PermissionGroupUpdateInput,
  PermissionRepositoryPort,
  UserAccessUpdateInput,
} from '../../../domain/ports/index.js'
import { getActiveWorkshopId } from '../../tenant/tenant-context.js'
import { getTrabajadores, listAdminUsers } from '../../../store/index.js'

type MutableGroup = PermissionGroup

const groups = new Map<string, MutableGroup>(
  SYSTEM_PERMISSION_GROUPS.map((group) => [
    group.id,
    {
      id: group.id,
      name: group.name,
      description: group.description,
      permissionCodes: [...group.permissionCodes],
      isSystem: true,
      systemKey: group.systemKey,
    },
  ]),
)

const userGroupAssignments = new Map<string, string[]>()
const userDirectPermissions = new Map<string, string[]>()

function nextCustomGroupId(): string {
  return `grp_custom_${randomBytes(6).toString('hex')}`
}

function isLockedSystemGroup(group: Pick<PermissionGroup, 'id' | 'systemKey'>): boolean {
  return group.id === 'grp_super_admin' || group.systemKey === 'role:super_admin'
}

function withSuperAdminFullAccess(role: AdminUser['role'], permissionCodes: string[]): string[] {
  if (role !== 'Super Admin') return permissionCodes
  return [...ALL_PERMISSION_CODES]
}

function normalizeGroupIds(input: string[]): string[] {
  const set = new Set<string>()
  for (const groupId of input) {
    if (groups.has(groupId)) set.add(groupId)
  }
  return [...set]
}

function normalizeAdminRoleFromTrabajadorRole(role: string): AdminUser['role'] {
  const normalized = role.trim()
  if (
    normalized === 'Jefe de Turno de Produccion' ||
    normalized === 'Jefe de Turno de Producción' ||
    normalized === 'Jefe de Turno de ProducciÃ³n'
  ) {
    return 'Jefe de Turno de Produccion'
  }
  if (normalized === 'Administrador') return 'Administrador'
  if (normalized === 'Contadora') return 'Contadora'
  if (normalized === 'Gestor de Ventas') return 'Gestor de Ventas'
  if (normalized === 'Jefe de Almacen') return 'Jefe de Almacen'
  if (normalized === 'Super Admin') return 'Super Admin'
  return 'Obrero'
}

function getUsers(): AdminUser[] {
  const adminUsers = listAdminUsers().map((user) => ({ ...user }))
  const workshopId = getActiveWorkshopId()
  const existingEmails = new Set(adminUsers.map((user) => user.email.toLowerCase()))

  const derivedWorkers = getTrabajadores()
    .filter((worker) => !existingEmails.has(worker.email.toLowerCase()))
    .map((worker) => ({
      id: `TRA-${worker.id}`,
      name: worker.nombre,
      email: worker.email,
      role: normalizeAdminRoleFromTrabajadorRole(worker.rol),
      workshopId,
    } satisfies AdminUser))

  return [...adminUsers, ...derivedWorkers]
}

function getScopedUsers(): AdminUser[] {
  const workshopId = getActiveWorkshopId()
  return getUsers().filter((user) => user.workshopId === workshopId)
}

function getUserById(userId: string): AdminUser | null {
  const user = getUsers().find((item) => item.id === userId)
  return user ?? null
}

function ensureUserExists(userId: string): AdminUser {
  const user = getUserById(userId)
  if (!user) {
    throw new DomainError('User not found', 404, 'USER_NOT_FOUND')
  }
  return user
}

function effectiveGroupIdsForUser(user: AdminUser): string[] {
  const assigned = userGroupAssignments.get(user.id) ?? []
  if (assigned.length > 0) {
    return normalizeGroupIds(assigned)
  }
  return getDefaultSystemGroupIdsByRole(user.role)
}

function directPermissionsForUser(userId: string): string[] {
  return normalizePermissionCodes(userDirectPermissions.get(userId) ?? [])
}

function effectivePermissionsForUser(user: AdminUser): string[] {
  const groupPermissions = effectiveGroupIdsForUser(user).flatMap((groupId) => {
    const group = groups.get(groupId)
    return group ? group.permissionCodes : []
  })
  const fallbackPermissions =
    groupPermissions.length > 0 ? [] : getDefaultPermissionCodesByRole(user.role)
  return withSuperAdminFullAccess(user.role, normalizePermissionCodes([
    ...groupPermissions,
    ...fallbackPermissions,
    ...directPermissionsForUser(user.id),
  ]))
}

function toUserAccess(user: AdminUser): UserPermissionAccess {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    workshopId: user.workshopId,
    permissionGroupIds: effectiveGroupIdsForUser(user),
    directPermissionCodes: directPermissionsForUser(user.id),
    effectivePermissionCodes: effectivePermissionsForUser(user),
  }
}

function validateUniqueGroupName(name: string, existingId?: string): void {
  const normalized = name.trim().toLowerCase()
  const duplicate = [...groups.values()].find(
    (group) => group.id !== existingId && group.name.trim().toLowerCase() === normalized,
  )
  if (duplicate) {
    throw new DomainError('Group name already exists', 409, 'PERMISSION_GROUP_DUPLICATE')
  }
}

export class InMemoryPermissionRepository implements PermissionRepositoryPort {
  async listDefinitions(): Promise<PermissionDefinition[]> {
    return PERMISSION_DEFINITIONS.map((item) => ({ ...item }))
  }

  async listGroups(): Promise<PermissionGroup[]> {
    const users = getScopedUsers()
    const withMemberCount = [...groups.values()].map((group) => {
      const memberCount = users.reduce((acc, user) => {
        const userGroups = effectiveGroupIdsForUser(user)
        return userGroups.includes(group.id) ? acc + 1 : acc
      }, 0)
      return {
        ...group,
        permissionCodes: [...group.permissionCodes].sort((a, b) => a.localeCompare(b)),
        memberCount,
      }
    })

    return withMemberCount.sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  async createGroup(data: PermissionGroupCreateInput): Promise<PermissionGroup> {
    const name = data.name.trim()
    if (!name) {
      throw new DomainError('Group name is required', 400, 'PERMISSION_GROUP_INVALID')
    }
    validateUniqueGroupName(name)
    const permissionCodes = normalizePermissionCodes(data.permissionCodes)
    if (permissionCodes.length === 0) {
      throw new DomainError(
        'At least one valid permission is required',
        400,
        'PERMISSION_GROUP_EMPTY',
      )
    }

    const group: MutableGroup = {
      id: nextCustomGroupId(),
      name,
      description: (data.description ?? '').trim(),
      permissionCodes,
      isSystem: false,
      systemKey: null,
    }
    groups.set(group.id, group)
    return { ...group, permissionCodes: [...group.permissionCodes] }
  }

  async updateGroup(id: string, data: PermissionGroupUpdateInput): Promise<PermissionGroup | null> {
    const current = groups.get(id)
    if (!current) return null
    if (isLockedSystemGroup(current)) {
      throw new DomainError(
        'Super admin group cannot be modified',
        403,
        'PERMISSION_GROUP_SYSTEM_LOCKED',
      )
    }

    if (typeof data.name === 'string') {
      const nextName = data.name.trim()
      if (!nextName) {
        throw new DomainError('Group name is required', 400, 'PERMISSION_GROUP_INVALID')
      }
      validateUniqueGroupName(nextName, current.id)
      current.name = nextName
    }
    if (typeof data.description === 'string') {
      current.description = data.description.trim()
    }
    if (Array.isArray(data.permissionCodes)) {
      const permissionCodes = normalizePermissionCodes(data.permissionCodes)
      if (permissionCodes.length === 0) {
        throw new DomainError(
          'At least one valid permission is required',
          400,
          'PERMISSION_GROUP_EMPTY',
        )
      }
      current.permissionCodes = permissionCodes
    }

    groups.set(current.id, current)
    return {
      ...current,
      permissionCodes: [...current.permissionCodes],
    }
  }

  async deleteGroup(id: string): Promise<boolean> {
    const current = groups.get(id)
    if (!current) return false
    if (isLockedSystemGroup(current)) {
      throw new DomainError(
        'Super admin group cannot be deleted',
        403,
        'PERMISSION_GROUP_SYSTEM_LOCKED',
      )
    }
    groups.delete(id)

    for (const [userId, groupIds] of userGroupAssignments.entries()) {
      const next = groupIds.filter((groupId) => groupId !== id)
      if (next.length === 0) {
        userGroupAssignments.delete(userId)
      } else {
        userGroupAssignments.set(userId, next)
      }
    }
    return true
  }

  async listUserAccess(): Promise<UserPermissionAccess[]> {
    return getScopedUsers()
      .map((user) => toUserAccess(user))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async updateUserAccess(
    userId: string,
    data: UserAccessUpdateInput,
  ): Promise<UserPermissionAccess | null> {
    const user = getUserById(userId)
    if (!user) return null
    if (user.workshopId !== getActiveWorkshopId()) return null
    ensureUserExists(userId)
    if (user.role === 'Super Admin') {
      throw new DomainError(
        'Super admin access is managed by system and cannot be edited.',
        403,
        'SUPER_ADMIN_ACCESS_LOCKED',
      )
    }

    const groupIds = normalizeGroupIds(data.permissionGroupIds)
    const directPermissionCodes = normalizePermissionCodes(data.directPermissionCodes)

    userGroupAssignments.set(userId, groupIds)
    userDirectPermissions.set(userId, directPermissionCodes)

    return toUserAccess(user)
  }

  async resolveUserAccess(userId: string, role: AdminUser['role']): Promise<ResolvedPermissionAccess> {
    const user = getUserById(userId) ?? {
      id: userId,
      name: '',
      email: '',
      role,
      workshopId: '',
    }

    const permissionGroupIds = effectiveGroupIdsForUser(user)
    const permissionCodes = effectivePermissionsForUser(user)

    return { permissionCodes, permissionGroupIds }
  }
}
