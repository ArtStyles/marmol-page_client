export type AdminRole =
  | 'Administrador'
  | 'Gestor de Ventas'
  | 'Jefe de Turno de Produccion'

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
]

const ROLE_ACCESS: Record<AdminRole, AdminAccess> = {
  Administrador: {
    role: 'Administrador',
    label: 'Administrador',
    home: '/admin',
    routes: [
      '/admin',
      '/admin/inventario',
      '/admin/bloques',
      '/admin/catalogo',
      '/admin/trabajadores',
      '/admin/configuracion',
    ],
    canManageWorkers: true,
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
    routes: ['/admin/produccion', '/admin/mermas'],
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
