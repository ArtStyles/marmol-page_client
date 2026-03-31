import { randomBytes } from 'node:crypto'
import { DomainError } from '../../../application/errors/domain.error.js'
import {
  ALL_PERMISSION_CODES,
  PERMISSION_DEFINITIONS,
  getDefaultPermissionCodesByRole,
  getDefaultSystemGroupKeyForRole,
  normalizePermissionCodes,
} from '../../../application/security/permissions.js'
import type {
  AdminRole,
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
import { getPool } from './connection.js'

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

function asBoolean(value: unknown): boolean {
  return Boolean(value)
}

function asNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nextCustomGroupId(): string {
  return `grp_custom_${randomBytes(6).toString('hex')}`
}

function isLockedSystemGroup(group: Pick<PermissionGroup, 'id' | 'systemKey'>): boolean {
  return group.id === 'grp_super_admin' || group.systemKey === 'role:super_admin'
}

function withSuperAdminFullAccess(role: AdminRole, permissionCodes: string[]): string[] {
  if (role !== 'Super Admin') return permissionCodes
  return [...ALL_PERMISSION_CODES]
}

function normalizeAdminRoleFromTrabajadorRole(role: string): AdminRole {
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

function mapPermissionGroup(row: Record<string, unknown>): PermissionGroup {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    permissionCodes: asStringArray(row.permission_codes).sort((a, b) => a.localeCompare(b)),
    isSystem: asBoolean(row.is_system),
    systemKey: (row.system_key as string | null | undefined) ?? null,
    memberCount: asNumber(row.member_count),
  }
}

function mapPermissionDefinition(row: Record<string, unknown>): PermissionDefinition {
  return {
    code: row.code as string,
    module: row.module as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
  }
}

const GROUP_SELECT = `
  SELECT
    g.id,
    g.name,
    g.description,
    g.is_system,
    g.system_key,
    COALESCE(array_agg(DISTINCT gp.permission_code) FILTER (WHERE gp.permission_code IS NOT NULL), '{}') AS permission_codes,
    COUNT(DISTINCT ug.user_id)::int AS member_count
  FROM admin_permission_groups g
  LEFT JOIN admin_permission_group_permissions gp ON gp.group_id = g.id
  LEFT JOIN admin_user_permission_groups ug ON ug.group_id = g.id
`

export class PostgresPermissionRepository implements PermissionRepositoryPort {
  private async ensureWorkshopAdminUsers(workshopId: string): Promise<void> {
    const pool = getPool()
    await pool.query(
      `INSERT INTO admin_users (id, name, email, workshop_id, password_hash, role)
       SELECT
         'TRA-' || t.id,
         t.nombre,
         LOWER(t.email),
         t.workshop_id,
         COALESCE(NULLIF(t.contrasena, ''), md5(t.email || ':' || NOW()::text)),
         CASE
           WHEN t.rol IN ('Jefe de Turno de Produccion', 'Jefe de Turno de Producción', 'Jefe de Turno de ProducciÃ³n') THEN 'Jefe de Turno de Produccion'
           WHEN t.rol IN ('Administrador', 'Contadora', 'Gestor de Ventas', 'Jefe de Almacen', 'Super Admin', 'Obrero') THEN t.rol
           ELSE 'Obrero'
         END
       FROM trabajadores t
       WHERE t.workshop_id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM admin_users u
           WHERE LOWER(u.email) = LOWER(t.email)
         )
       ON CONFLICT (id) DO NOTHING`,
      [workshopId],
    )
  }

  async listDefinitions(): Promise<PermissionDefinition[]> {
    const pool = getPool()
    const result = await pool.query(
      `SELECT code, module, name, description
       FROM admin_permission_definitions
       ORDER BY module, code`,
    )

    if (result.rows.length === 0) {
      return PERMISSION_DEFINITIONS.map((item) => ({ ...item }))
    }

    return result.rows.map((row) => mapPermissionDefinition(row as Record<string, unknown>))
  }

  async listGroups(): Promise<PermissionGroup[]> {
    const pool = getPool()
    const result = await pool.query(
      `${GROUP_SELECT}
       GROUP BY g.id
       ORDER BY g.is_system DESC, g.name ASC`,
    )
    return result.rows.map((row) => mapPermissionGroup(row as Record<string, unknown>))
  }

  private async findGroupById(id: string): Promise<PermissionGroup | null> {
    const pool = getPool()
    const result = await pool.query(
      `${GROUP_SELECT}
       WHERE g.id = $1
       GROUP BY g.id`,
      [id],
    )
    const row = result.rows[0]
    return row ? mapPermissionGroup(row as Record<string, unknown>) : null
  }

  private async assertUniqueGroupName(name: string, excludeId?: string): Promise<void> {
    const pool = getPool()
    const params: unknown[] = [name]
    const filter = excludeId
      ? (() => {
          params.push(excludeId)
          return 'AND id <> $2'
        })()
      : ''
    const duplicate = await pool.query(
      `SELECT 1 FROM admin_permission_groups
       WHERE LOWER(name) = LOWER($1)
       ${filter}
       LIMIT 1`,
      params,
    )
    if (duplicate.rows.length > 0) {
      throw new DomainError('Group name already exists', 409, 'PERMISSION_GROUP_DUPLICATE')
    }
  }

  async createGroup(data: PermissionGroupCreateInput): Promise<PermissionGroup> {
    const name = data.name.trim()
    if (!name) {
      throw new DomainError('Group name is required', 400, 'PERMISSION_GROUP_INVALID')
    }
    const permissionCodes = normalizePermissionCodes(data.permissionCodes)
    if (permissionCodes.length === 0) {
      throw new DomainError(
        'At least one valid permission is required',
        400,
        'PERMISSION_GROUP_EMPTY',
      )
    }

    await this.assertUniqueGroupName(name)

    const pool = getPool()
    const client = await pool.connect()
    const id = nextCustomGroupId()

    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO admin_permission_groups (id, name, description, is_system, system_key)
         VALUES ($1, $2, $3, false, NULL)`,
        [id, name, (data.description ?? '').trim()],
      )
      await client.query(
        `INSERT INTO admin_permission_group_permissions (group_id, permission_code)
         SELECT $1, code
         FROM unnest($2::text[]) AS code`,
        [id, permissionCodes],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    const created = await this.findGroupById(id)
    if (!created) {
      throw new DomainError('Group was not created', 500, 'PERMISSION_GROUP_CREATE_FAILED')
    }
    return created
  }

  async updateGroup(id: string, data: PermissionGroupUpdateInput): Promise<PermissionGroup | null> {
    const current = await this.findGroupById(id)
    if (!current) return null
    if (isLockedSystemGroup(current)) {
      throw new DomainError(
        'Super admin group cannot be modified',
        403,
        'PERMISSION_GROUP_SYSTEM_LOCKED',
      )
    }

    const nextName = typeof data.name === 'string' ? data.name.trim() : current.name
    if (!nextName) {
      throw new DomainError('Group name is required', 400, 'PERMISSION_GROUP_INVALID')
    }

    if (nextName.toLowerCase() !== current.name.toLowerCase()) {
      await this.assertUniqueGroupName(nextName, id)
    }

    const nextDescription =
      typeof data.description === 'string' ? data.description.trim() : current.description
    const nextPermissions =
      data.permissionCodes !== undefined
        ? normalizePermissionCodes(data.permissionCodes)
        : current.permissionCodes

    if (nextPermissions.length === 0) {
      throw new DomainError(
        'At least one valid permission is required',
        400,
        'PERMISSION_GROUP_EMPTY',
      )
    }

    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE admin_permission_groups
         SET name = $2,
             description = $3
         WHERE id = $1`,
        [id, nextName, nextDescription],
      )

      await client.query(
        `DELETE FROM admin_permission_group_permissions
         WHERE group_id = $1`,
        [id],
      )
      await client.query(
        `INSERT INTO admin_permission_group_permissions (group_id, permission_code)
         SELECT $1, code
         FROM unnest($2::text[]) AS code`,
        [id, nextPermissions],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    return this.findGroupById(id)
  }

  async deleteGroup(id: string): Promise<boolean> {
    const current = await this.findGroupById(id)
    if (!current) return false
    if (isLockedSystemGroup(current)) {
      throw new DomainError(
        'Super admin group cannot be deleted',
        403,
        'PERMISSION_GROUP_SYSTEM_LOCKED',
      )
    }

    const pool = getPool()
    const result = await pool.query('DELETE FROM admin_permission_groups WHERE id = $1', [id])
    return (result.rowCount ?? 0) > 0
  }

  async listUserAccess(): Promise<UserPermissionAccess[]> {
    const pool = getPool()
    const workshopId = getActiveWorkshopId()
    await this.ensureWorkshopAdminUsers(workshopId)
    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.name,
         u.email,
         u.role,
         u.workshop_id,
         COALESCE(array_agg(DISTINCT ug.group_id) FILTER (WHERE ug.group_id IS NOT NULL), '{}') AS assigned_group_ids,
         COALESCE(array_agg(DISTINCT up.permission_code) FILTER (WHERE up.permission_code IS NOT NULL), '{}') AS direct_permission_codes
       FROM admin_users u
       LEFT JOIN admin_user_permission_groups ug ON ug.user_id = u.id
       LEFT JOIN admin_user_permissions up ON up.user_id = u.id
       WHERE u.workshop_id = $1
       GROUP BY u.id
       ORDER BY u.name ASC`,
      [workshopId],
    )

    const users = result.rows.map((row) => ({
      userId: row.user_id as string,
      name: row.name as string,
      email: row.email as string,
      role: normalizeAdminRoleFromTrabajadorRole(row.role as string),
      workshopId: row.workshop_id as string,
      assignedGroupIds: asStringArray(row.assigned_group_ids),
      directPermissionCodes: normalizePermissionCodes(asStringArray(row.direct_permission_codes)),
    }))

    const enriched = await Promise.all(
      users.map(async (user) => {
        const resolved = await this.resolveUserAccess(user.userId, user.role)
        return {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          workshopId: user.workshopId,
          permissionGroupIds: resolved.permissionGroupIds,
          directPermissionCodes: user.directPermissionCodes,
          effectivePermissionCodes: resolved.permissionCodes,
        } satisfies UserPermissionAccess
      }),
    )

    return enriched
  }

  async updateUserAccess(
    userId: string,
    data: UserAccessUpdateInput,
  ): Promise<UserPermissionAccess | null> {
    const pool = getPool()
    const workshopId = getActiveWorkshopId()
    await this.ensureWorkshopAdminUsers(workshopId)
    const userResult = await pool.query(
      `SELECT id, name, email, role, workshop_id
       FROM admin_users
       WHERE id = $1
         AND workshop_id = $2
       LIMIT 1`,
      [userId, workshopId],
    )
    if (userResult.rows.length === 0) return null
    const role = normalizeAdminRoleFromTrabajadorRole(userResult.rows[0].role as string)
    if (role === 'Super Admin') {
      throw new DomainError(
        'Super admin access is managed by system and cannot be edited.',
        403,
        'SUPER_ADMIN_ACCESS_LOCKED',
      )
    }

    const normalizedGroups = [...new Set(data.permissionGroupIds)]
    if (normalizedGroups.length > 0) {
      const validGroups = await pool.query(
        `SELECT id FROM admin_permission_groups
         WHERE id = ANY($1::text[])`,
        [normalizedGroups],
      )
      const validIds = new Set(validGroups.rows.map((row) => row.id as string))
      const invalid = normalizedGroups.filter((idItem) => !validIds.has(idItem))
      if (invalid.length > 0) {
        throw new DomainError(
          'One or more permission groups are invalid',
          400,
          'PERMISSION_GROUP_INVALID_REFERENCE',
          { invalidGroupIds: invalid },
        )
      }
    }

    const directPermissionCodes = normalizePermissionCodes(data.directPermissionCodes)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM admin_user_permission_groups WHERE user_id = $1', [userId])
      if (normalizedGroups.length > 0) {
        await client.query(
          `INSERT INTO admin_user_permission_groups (user_id, group_id)
           SELECT $1, gid
           FROM unnest($2::text[]) AS gid`,
          [userId, normalizedGroups],
        )
      }

      await client.query('DELETE FROM admin_user_permissions WHERE user_id = $1', [userId])
      if (directPermissionCodes.length > 0) {
        await client.query(
          `INSERT INTO admin_user_permissions (user_id, permission_code)
           SELECT $1, code
           FROM unnest($2::text[]) AS code`,
          [userId, directPermissionCodes],
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    const resolved = await this.resolveUserAccess(userId, role)

    return {
      userId,
      name: userResult.rows[0].name as string,
      email: userResult.rows[0].email as string,
      role,
      workshopId: userResult.rows[0].workshop_id as string,
      permissionGroupIds: resolved.permissionGroupIds,
      directPermissionCodes,
      effectivePermissionCodes: resolved.permissionCodes,
    }
  }

  async resolveUserAccess(userId: string, role: AdminRole): Promise<ResolvedPermissionAccess> {
    const pool = getPool()
    const assignedGroupsResult = await pool.query(
      `SELECT group_id
       FROM admin_user_permission_groups
       WHERE user_id = $1`,
      [userId],
    )
    const assignedGroupIds = asStringArray(assignedGroupsResult.rows.map((row) => row.group_id))
    let effectiveGroupIds = assignedGroupIds

    if (effectiveGroupIds.length === 0) {
      const systemKey = getDefaultSystemGroupKeyForRole(role)
      const fallbackGroup = await pool.query(
        `SELECT id
         FROM admin_permission_groups
         WHERE system_key = $1
         LIMIT 1`,
        [systemKey],
      )
      effectiveGroupIds = asStringArray(fallbackGroup.rows.map((row) => row.id))
    }

    const directPermissionsResult = await pool.query(
      `SELECT permission_code
       FROM admin_user_permissions
       WHERE user_id = $1`,
      [userId],
    )
    const directPermissions = normalizePermissionCodes(
      asStringArray(directPermissionsResult.rows.map((row) => row.permission_code)),
    )

    let groupPermissions: string[] = []
    if (effectiveGroupIds.length > 0) {
      const groupPermissionsResult = await pool.query(
        `SELECT DISTINCT permission_code
         FROM admin_permission_group_permissions
         WHERE group_id = ANY($1::text[])
         ORDER BY permission_code`,
        [effectiveGroupIds],
      )
      groupPermissions = asStringArray(groupPermissionsResult.rows.map((row) => row.permission_code))
    }

    const fallbackPermissions =
      groupPermissions.length === 0 && effectiveGroupIds.length === 0
        ? getDefaultPermissionCodesByRole(role)
        : []

    const permissionCodes = withSuperAdminFullAccess(role, normalizePermissionCodes([
      ...groupPermissions,
      ...fallbackPermissions,
      ...directPermissions,
    ]))

    return {
      permissionCodes,
      permissionGroupIds: [...new Set(effectiveGroupIds)],
    }
  }
}
