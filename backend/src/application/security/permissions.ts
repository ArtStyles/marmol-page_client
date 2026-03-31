import type { AdminRole } from '../../domain/entities/index.js'

export interface PermissionDefinitionSeed {
  code: string
  module: string
  name: string
  description: string
}

export interface SystemPermissionGroupSeed {
  id: string
  systemKey: string
  name: string
  description: string
  permissionCodes: string[]
}

export const PERMISSION_DEFINITIONS: PermissionDefinitionSeed[] = [
  { code: 'dashboard:view', module: 'dashboard', name: 'Ver dashboard', description: 'Acceso al panel principal.' },
  { code: 'inventario:read', module: 'inventario', name: 'Ver inventario', description: 'Consultar inventario y productos.' },
  { code: 'inventario:write', module: 'inventario', name: 'Editar inventario', description: 'Crear, editar y eliminar productos de inventario.' },
  { code: 'inventario:approve', module: 'inventario', name: 'Aprobar movimientos de almacen', description: 'Aprobar o rechazar entradas y salidas de almacen.' },
  { code: 'produccion:read', module: 'produccion', name: 'Ver produccion', description: 'Consultar produccion diaria.' },
  { code: 'produccion:write', module: 'produccion', name: 'Editar produccion', description: 'Registrar y modificar produccion diaria.' },
  { code: 'produccion:approve_taller', module: 'produccion', name: 'Aprobar produccion de taller', description: 'Aprobar o rechazar registros de produccion diaria del taller.' },
  { code: 'equipos:read', module: 'equipos', name: 'Ver equipos', description: 'Consultar equipos operativos.' },
  { code: 'equipos:write', module: 'equipos', name: 'Editar equipos', description: 'Crear, editar y eliminar equipos.' },
  { code: 'asignaciones:read', module: 'asignaciones', name: 'Ver asignaciones', description: 'Consultar asignaciones de produccion.' },
  { code: 'asignaciones:write', module: 'asignaciones', name: 'Editar asignaciones', description: 'Crear y modificar asignaciones.' },
  { code: 'ventas:read', module: 'ventas', name: 'Ver ventas', description: 'Consultar ventas y estado comercial.' },
  { code: 'ventas:write', module: 'ventas', name: 'Editar ventas', description: 'Crear y modificar ventas.' },
  { code: 'finanzas:read', module: 'finanzas', name: 'Ver finanzas', description: 'Consultar KPIs y panel financiero.' },
  { code: 'gastos:read', module: 'gastos', name: 'Ver gastos', description: 'Consultar gastos operativos.' },
  { code: 'gastos:write', module: 'gastos', name: 'Editar gastos', description: 'Registrar y modificar gastos.' },
  { code: 'contabilidad:read', module: 'contabilidad', name: 'Ver contabilidad', description: 'Consultar reportes contables.' },
  { code: 'bloques:read', module: 'bloques', name: 'Ver materia prima', description: 'Consultar bloques y lotes.' },
  { code: 'bloques:write', module: 'bloques', name: 'Editar materia prima', description: 'Crear, editar y eliminar bloques/lotes.' },
  { code: 'mermas:read', module: 'mermas', name: 'Ver mermas', description: 'Consultar mermas.' },
  { code: 'mermas:write', module: 'mermas', name: 'Editar mermas', description: 'Registrar y modificar mermas.' },
  { code: 'catalogo:read', module: 'catalogo', name: 'Ver catalogo', description: 'Consultar catalogo comercial.' },
  { code: 'catalogo:write', module: 'catalogo', name: 'Editar catalogo', description: 'Crear, editar y eliminar items de catalogo.' },
  { code: 'historial:read', module: 'historial', name: 'Ver historial', description: 'Consultar historial y bitacora.' },
  { code: 'historial:write', module: 'historial', name: 'Editar historial', description: 'Registrar eventos de historial.' },
  { code: 'trabajadores:read', module: 'trabajadores', name: 'Ver trabajadores', description: 'Consultar trabajadores.' },
  { code: 'trabajadores:write', module: 'trabajadores', name: 'Editar trabajadores', description: 'Crear, editar y eliminar trabajadores.' },
  { code: 'pagos:read', module: 'pagos', name: 'Ver pagos', description: 'Consultar historial de pagos.' },
  { code: 'pagos:write', module: 'pagos', name: 'Editar pagos', description: 'Registrar y modificar pagos.' },
  { code: 'configuracion:read', module: 'configuracion', name: 'Ver configuracion', description: 'Consultar configuracion del sistema.' },
  { code: 'configuracion:write', module: 'configuracion', name: 'Editar configuracion', description: 'Actualizar configuracion del sistema.' },
  { code: 'workshops:read', module: 'workshops', name: 'Ver talleres', description: 'Consultar talleres.' },
  { code: 'workshops:write', module: 'workshops', name: 'Editar talleres', description: 'Crear, editar y eliminar talleres.' },
  { code: 'workshops:override_scope', module: 'workshops', name: 'Cambiar alcance de taller', description: 'Permite cambiar el taller activo en sesion.' },
  { code: 'permissions:read', module: 'permissions', name: 'Ver permisos', description: 'Consultar catalogo de permisos y grupos.' },
  { code: 'permissions:write', module: 'permissions', name: 'Editar permisos', description: 'Crear, editar y eliminar grupos de permisos.' },
  { code: 'users:access:read', module: 'permissions', name: 'Ver accesos de usuarios', description: 'Consultar permisos asignados por usuario.' },
  { code: 'users:access:write', module: 'permissions', name: 'Editar accesos de usuarios', description: 'Asignar grupos y permisos directos a usuarios.' },
  { code: 'obrero:panel:view', module: 'obrero', name: 'Ver panel obrero', description: 'Acceso al panel operativo de obrero.' },
]

export const ALL_PERMISSION_CODES = PERMISSION_DEFINITIONS.map((permission) => permission.code)

const uniqueCodes = new Set(ALL_PERMISSION_CODES)

function validCodes(codes: string[]): string[] {
  const unique = new Set<string>()
  for (const code of codes) {
    if (uniqueCodes.has(code)) {
      unique.add(code)
    }
  }
  return [...unique].sort((a, b) => a.localeCompare(b))
}

export const SYSTEM_PERMISSION_GROUPS: SystemPermissionGroupSeed[] = [
  {
    id: 'grp_super_admin',
    systemKey: 'role:super_admin',
    name: 'Super Admin',
    description: 'Acceso total a todos los modulos y alcance multi-taller.',
    permissionCodes: ALL_PERMISSION_CODES,
  },
  {
    id: 'grp_administrador',
    systemKey: 'role:administrador',
    name: 'Administrador',
    description: 'Gestion operativa completa y administracion de accesos.',
    permissionCodes: validCodes([
      'dashboard:view',
      'inventario:read',
      'inventario:write',
      'inventario:approve',
      'produccion:read',
      'produccion:write',
      'produccion:approve_taller',
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
    ]),
  },
  {
    id: 'grp_contadora',
    systemKey: 'role:contadora',
    name: 'Contadora',
    description: 'Acceso de consulta contable y financiera.',
    permissionCodes: validCodes([
      'dashboard:view',
      'contabilidad:read',
      'finanzas:read',
      'gastos:read',
      'pagos:read',
      'historial:read',
    ]),
  },
  {
    id: 'grp_ventas',
    systemKey: 'role:ventas',
    name: 'Gestor de Ventas',
    description: 'Operacion comercial y seguimiento de pagos.',
    permissionCodes: validCodes([
      'dashboard:view',
      'ventas:read',
      'ventas:write',
      'catalogo:read',
      'pagos:read',
      'historial:read',
      'inventario:read',
    ]),
  },
  {
    id: 'grp_almacen',
    systemKey: 'role:almacen',
    name: 'Jefe de Almacen',
    description: 'Control exclusivo de movimientos y aprobaciones de almacen.',
    permissionCodes: validCodes([
      'dashboard:view',
      'inventario:read',
      'inventario:write',
      'inventario:approve',
      'produccion:read',
      'ventas:read',
      'mermas:read',
      'historial:read',
    ]),
  },
  {
    id: 'grp_produccion',
    systemKey: 'role:produccion',
    name: 'Jefe de Turno de Produccion',
    description: 'Operacion de produccion, equipos, asignaciones y mermas.',
    permissionCodes: validCodes([
      'dashboard:view',
      'produccion:read',
      'produccion:write',
      'produccion:approve_taller',
      'equipos:read',
      'equipos:write',
      'asignaciones:read',
      'asignaciones:write',
      'mermas:read',
      'mermas:write',
      'bloques:read',
      'inventario:read',
      'historial:read',
    ]),
  },
  {
    id: 'grp_obrero',
    systemKey: 'role:obrero',
    name: 'Obrero',
    description: 'Acceso a su panel operativo y consulta de su produccion/pagos.',
    permissionCodes: validCodes([
      'obrero:panel:view',
      'asignaciones:read',
      'pagos:read',
      'trabajadores:read',
    ]),
  },
]

const ROLE_DEFAULT_GROUP_KEYS: Record<AdminRole, string> = {
  'Super Admin': 'role:super_admin',
  Administrador: 'role:administrador',
  Contadora: 'role:contadora',
  'Gestor de Ventas': 'role:ventas',
  'Jefe de Almacen': 'role:almacen',
  'Jefe de Turno de Produccion': 'role:produccion',
  'Jefe de Turno de Producción': 'role:produccion',
  Obrero: 'role:obrero',
}

const SYSTEM_GROUP_BY_KEY = new Map(
  SYSTEM_PERMISSION_GROUPS.map((group) => [group.systemKey, group]),
)

export function getDefaultSystemGroupKeyForRole(role: AdminRole): string {
  return ROLE_DEFAULT_GROUP_KEYS[role] ?? 'role:obrero'
}

export function getDefaultSystemGroupIdsByRole(role: AdminRole): string[] {
  const key = getDefaultSystemGroupKeyForRole(role)
  const group = SYSTEM_GROUP_BY_KEY.get(key)
  return group ? [group.id] : []
}

export function getDefaultPermissionCodesByRole(role: AdminRole): string[] {
  const key = getDefaultSystemGroupKeyForRole(role)
  const group = SYSTEM_GROUP_BY_KEY.get(key)
  if (!group) return []
  return [...group.permissionCodes]
}

export function normalizePermissionCodes(permissionCodes: string[]): string[] {
  return validCodes(permissionCodes)
}

export function hasPermission(permissionCodes: string[], permissionCode: string): boolean {
  return permissionCodes.includes(permissionCode)
}
