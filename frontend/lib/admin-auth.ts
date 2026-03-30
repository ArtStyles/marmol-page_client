import { normalizeAdminPath } from '@/lib/admin-routes'

export type AdminRole =
  | 'Super Admin'
  | 'Administrador'
  | 'Contadora'
  | 'Gestor de Ventas'
  | 'Jefe de Turno de Produccion'
  | 'Jefe de Turno de Producción'
  | 'Obrero'

export type PermissionCode = string

export type AdminUser = {
  id: string
  name: string
  email: string
  role: AdminRole
  workshopId: string
  permissions?: PermissionCode[]
  permissionGroups?: string[]
}

export type AdminAccess = {
  role: AdminRole
  label: string
  home: string
  routes: string[]
  permissions: PermissionCode[]
  canManageWorkers: boolean
  canManagePermissions: boolean
  canOverrideWorkshopScope: boolean
}

export const ADMIN_STORAGE_KEY = 'marble-admin-user'
export const ADMIN_TOKEN_STORAGE_KEY = 'marble-admin-token'

export const MOCK_ADMIN_USERS: Array<{
  email: string
  password: string
  user: AdminUser
}> = [
  {
    email: 'superadmin@marmol.local',
    password: 'super123',
    user: {
      id: 'SUP-001',
      name: 'Super Admin',
      email: 'superadmin@marmol.local',
      role: 'Super Admin',
      workshopId: 'TLR-001',
    },
  },
  {
    email: 'admin@marmol.local',
    password: 'admin123',
    user: {
      id: 'ADM-001',
      name: 'Admin Principal',
      email: 'admin@marmol.local',
      role: 'Administrador',
      workshopId: 'TLR-001',
    },
  },
  {
    email: 'contadora@marmol.local',
    password: 'conta123',
    user: {
      id: 'CONT-001',
      name: 'Contadora General',
      email: 'contadora@marmol.local',
      role: 'Contadora',
      workshopId: 'TLR-001',
    },
  },
  {
    email: 'ventas@marmol.local',
    password: 'ventas123',
    user: {
      id: 'VEN-001',
      name: 'Gestor de Ventas',
      email: 'ventas@marmol.local',
      role: 'Gestor de Ventas',
      workshopId: 'TLR-001',
    },
  },
  {
    email: 'produccion@marmol.local',
    password: 'prod123',
    user: {
      id: 'PROD-001',
      name: 'Jefe de Turno',
      email: 'produccion@marmol.local',
      role: 'Jefe de Turno de Produccion',
      workshopId: 'TLR-001',
    },
  },
  {
    email: 'carlos.mendoza@taller.com',
    password: 'obrero123',
    user: {
      id: 'OBR-001',
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@taller.com',
      role: 'Obrero',
      workshopId: 'TLR-001',
    },
  },
  {
    email: 'admin.gdl@marmol.local',
    password: 'admingdl123',
    user: {
      id: 'ADM-002',
      name: 'Admin Guadalajara',
      email: 'admin.gdl@marmol.local',
      role: 'Administrador',
      workshopId: 'TLR-002',
    },
  },
  {
    email: 'admin.mty@marmol.local',
    password: 'adminmty123',
    user: {
      id: 'ADM-003',
      name: 'Admin Monterrey',
      email: 'admin.mty@marmol.local',
      role: 'Administrador',
      workshopId: 'TLR-003',
    },
  },
]

const ROLE_PERMISSION_FALLBACK: Record<AdminRole, PermissionCode[]> = {
  'Super Admin': [
    'dashboard:view',
    'inventario:read',
    'inventario:write',
    'produccion:read',
    'produccion:write',
    'equipos:read',
    'equipos:write',
    'asignaciones:read',
    'asignaciones:write',
    'ventas:read',
    'ventas:write',
    'finanzas:read',
    'gastos:read',
    'gastos:write',
    'contabilidad:read',
    'bloques:read',
    'bloques:write',
    'mermas:read',
    'mermas:write',
    'catalogo:read',
    'catalogo:write',
    'historial:read',
    'historial:write',
    'trabajadores:read',
    'trabajadores:write',
    'pagos:read',
    'pagos:write',
    'configuracion:read',
    'configuracion:write',
    'workshops:read',
    'workshops:write',
    'workshops:override_scope',
    'permissions:read',
    'permissions:write',
    'users:access:read',
    'users:access:write',
    'obrero:panel:view',
  ],
  Administrador: [
    'dashboard:view',
    'inventario:read',
    'inventario:write',
    'produccion:read',
    'produccion:write',
    'equipos:read',
    'equipos:write',
    'asignaciones:read',
    'asignaciones:write',
    'ventas:read',
    'ventas:write',
    'finanzas:read',
    'gastos:read',
    'gastos:write',
    'contabilidad:read',
    'bloques:read',
    'bloques:write',
    'mermas:read',
    'mermas:write',
    'catalogo:read',
    'catalogo:write',
    'historial:read',
    'historial:write',
    'trabajadores:read',
    'trabajadores:write',
    'pagos:read',
    'pagos:write',
    'configuracion:read',
    'configuracion:write',
    'workshops:read',
    'permissions:read',
    'permissions:write',
    'users:access:read',
    'users:access:write',
  ],
  Contadora: [
    'dashboard:view',
    'contabilidad:read',
    'finanzas:read',
    'gastos:read',
    'pagos:read',
    'historial:read',
  ],
  'Gestor de Ventas': [
    'dashboard:view',
    'ventas:read',
    'ventas:write',
    'catalogo:read',
    'pagos:read',
    'historial:read',
    'inventario:read',
  ],
  'Jefe de Turno de Produccion': [
    'dashboard:view',
    'produccion:read',
    'produccion:write',
    'equipos:read',
    'equipos:write',
    'asignaciones:read',
    'asignaciones:write',
    'mermas:read',
    'mermas:write',
    'bloques:read',
    'inventario:read',
    'historial:read',
  ],
  'Jefe de Turno de Producción': [
    'dashboard:view',
    'produccion:read',
    'produccion:write',
    'equipos:read',
    'equipos:write',
    'asignaciones:read',
    'asignaciones:write',
    'mermas:read',
    'mermas:write',
    'bloques:read',
    'inventario:read',
    'historial:read',
  ],
  Obrero: ['obrero:panel:view', 'asignaciones:read', 'pagos:read', 'trabajadores:read'],
}

const ADMIN_ROUTE_RULES: Array<{ route: string; anyOf: PermissionCode[] }> = [
  { route: '/admin', anyOf: ['dashboard:view'] },
  { route: '/admin/inventario', anyOf: ['inventario:read'] },
  { route: '/admin/produccion', anyOf: ['produccion:read'] },
  { route: '/admin/equipos', anyOf: ['equipos:read'] },
  { route: '/admin/asignaciones', anyOf: ['asignaciones:read'] },
  { route: '/admin/ventas', anyOf: ['ventas:read'] },
  { route: '/admin/finanzas', anyOf: ['finanzas:read'] },
  { route: '/admin/gastos', anyOf: ['gastos:read'] },
  { route: '/admin/contabilidad', anyOf: ['contabilidad:read'] },
  { route: '/admin/bloques', anyOf: ['bloques:read'] },
  { route: '/admin/mermas', anyOf: ['mermas:read'] },
  { route: '/admin/trabajadores', anyOf: ['trabajadores:read'] },
  { route: '/admin/pagos', anyOf: ['pagos:read'] },
  { route: '/admin/catalogo', anyOf: ['catalogo:read'] },
  { route: '/admin/historial', anyOf: ['historial:read'] },
  { route: '/admin/configuracion', anyOf: ['configuracion:read'] },
  { route: '/admin/permisos', anyOf: ['users:access:read'] },
  { route: '/admin/obrero', anyOf: ['obrero:panel:view'] },
]

const HOME_ROUTE_PRIORITY = ADMIN_ROUTE_RULES.map((rule) => rule.route)

function normalizePermissions(permissionCodes: PermissionCode[]): PermissionCode[] {
  return [...new Set(permissionCodes.map((item) => item.trim()).filter(Boolean))]
}

export function getPermissionsForRole(role: AdminRole): PermissionCode[] {
  return ROLE_PERMISSION_FALLBACK[role] ?? []
}

export function getPermissionsForUser(user: AdminUser): PermissionCode[] {
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return normalizePermissions(user.permissions)
  }
  return getPermissionsForRole(user.role)
}

export function hasPermission(user: AdminUser | null | undefined, permissionCode: PermissionCode): boolean {
  if (!user) return false
  return getPermissionsForUser(user).includes(permissionCode)
}

export function hasAnyPermission(
  user: AdminUser | null | undefined,
  permissionCodes: PermissionCode[],
): boolean {
  if (!user) return false
  const permissions = getPermissionsForUser(user)
  return permissionCodes.some((permissionCode) => permissions.includes(permissionCode))
}

function routesForPermissions(permissionCodes: PermissionCode[]): string[] {
  return ADMIN_ROUTE_RULES.filter((rule) =>
    rule.anyOf.some((requiredPermission) => permissionCodes.includes(requiredPermission)),
  ).map((rule) => rule.route)
}

function homeForRoutes(routes: string[]): string {
  for (const route of HOME_ROUTE_PRIORITY) {
    if (routes.includes(route)) return route
  }
  return '/admin'
}

export function getAccessForUser(user: AdminUser): AdminAccess {
  const permissions = getPermissionsForUser(user)
  const routes = routesForPermissions(permissions)

  return {
    role: user.role,
    label: user.role,
    home: homeForRoutes(routes),
    routes,
    permissions,
    canManageWorkers: permissions.includes('trabajadores:write'),
    canManagePermissions: permissions.includes('permissions:write'),
    canOverrideWorkshopScope: permissions.includes('workshops:override_scope'),
  }
}

export function getAccessForRole(role: AdminRole): AdminAccess {
  const permissions = getPermissionsForRole(role)
  const routes = routesForPermissions(permissions)

  return {
    role,
    label: role,
    home: homeForRoutes(routes),
    routes,
    permissions,
    canManageWorkers: permissions.includes('trabajadores:write'),
    canManagePermissions: permissions.includes('permissions:write'),
    canOverrideWorkshopScope: permissions.includes('workshops:override_scope'),
  }
}

export function isPathAllowed(pathname: string, access: AdminAccess): boolean {
  const normalizedPathname = normalizeAdminPath(pathname)

  return access.routes.some((route) => {
    const normalizedRoute = normalizeAdminPath(route)
    if (normalizedRoute === '/admin') {
      return normalizedPathname === '/admin'
    }

    return (
      normalizedPathname === normalizedRoute ||
      normalizedPathname.startsWith(`${normalizedRoute}/`)
    )
  })
}

export function getUserByCredentials(email: string, password: string): AdminUser | null {
  const match = MOCK_ADMIN_USERS.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password,
  )
  return match ? match.user : null
}
