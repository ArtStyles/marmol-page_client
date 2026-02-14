export type AdminRole =
  | 'Super Admin'
  | 'Administrador'
  | 'Contadora'
  | 'Gestor de Ventas'
  | 'Jefe de Turno de Produccion'
  | 'Jefe de Turno de ProducciÃ³n'
  | 'Obrero'

export type AdminUser = {
  id: string
  name: string
  email: string
  role: AdminRole
}

export type AdminAccess = {
  role: AdminRole
  label: string
  home: string
  routes: string[]
  canManageWorkers: boolean
}

export const ADMIN_STORAGE_KEY = 'marble-admin-user'

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
    },
  },
]

const ROLE_ACCESS: Record<AdminRole, AdminAccess> = {
  'Super Admin': {
    role: 'Super Admin',
    label: 'Super Admin',
    home: '/admin',
    routes: [
      '/admin',
      '/admin/inventario',
      '/admin/produccion',
      '/admin/equipos',
      '/admin/asignaciones',
      '/admin/ventas',
      '/admin/finanzas',
      '/admin/contabilidad',
      '/admin/bloques',
      '/admin/mermas',
      '/admin/catalogo',
      '/admin/historial',
      '/admin/trabajadores',
      '/admin/pagos',
      '/admin/configuracion',
    ],
    canManageWorkers: true,
  },
  Administrador: {
    role: 'Administrador',
    label: 'Administrador',
    home: '/admin',
    routes: [
      '/admin',
      '/admin/inventario',
      '/admin/produccion',
      '/admin/equipos',
      '/admin/asignaciones',
      '/admin/ventas',
      '/admin/contabilidad',
      '/admin/bloques',
      '/admin/mermas',
      '/admin/catalogo',
      '/admin/trabajadores',
      '/admin/pagos',
      '/admin/configuracion',
    ],
    canManageWorkers: true,
  },
  Contadora: {
    role: 'Contadora',
    label: 'Contabilidad',
    home: '/admin/contabilidad',
    routes: ['/admin/contabilidad'],
    canManageWorkers: false,
  },
  'Gestor de Ventas': {
    role: 'Gestor de Ventas',
    label: 'Ventas',
    home: '/admin/ventas',
    routes: ['/admin/ventas', '/admin/pagos'],
    canManageWorkers: false,
  },
  'Jefe de Turno de Produccion': {
    role: 'Jefe de Turno de Produccion',
    label: 'Produccion',
    home: '/admin/produccion',
    routes: ['/admin/produccion', '/admin/equipos', '/admin/asignaciones', '/admin/mermas'],
    canManageWorkers: false,
  },
  'Jefe de Turno de ProducciÃ³n': {
    role: 'Jefe de Turno de ProducciÃ³n',
    label: 'Produccion',
    home: '/admin/produccion',
    routes: ['/admin/produccion', '/admin/equipos', '/admin/asignaciones', '/admin/mermas'],
    canManageWorkers: false,
  },
  Obrero: {
    role: 'Obrero',
    label: 'Obrero',
    home: '/admin/obrero',
    routes: ['/admin/obrero'],
    canManageWorkers: false,
  },
}

export function getAccessForRole(role: AdminRole): AdminAccess {
  return ROLE_ACCESS[role]
}

export function isPathAllowed(pathname: string, access: AdminAccess): boolean {
  return access.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function getUserByCredentials(email: string, password: string): AdminUser | null {
  const match = MOCK_ADMIN_USERS.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password,
  )
  return match ? match.user : null
}
