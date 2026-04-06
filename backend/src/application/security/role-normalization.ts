import type { AdminRole, RolTrabajador } from '../../domain/entities/index.js'

function normalizeRoleKey(input: string): string {
  return input
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function isProductionRoleKey(key: string): boolean {
  return key.startsWith('jefe de turno de producci')
}

export function parseAdminRole(input: string): AdminRole | null {
  const key = normalizeRoleKey(input)

  if (key === 'super admin') return 'Super Admin'
  if (key === 'administrador') return 'Administrador'
  if (key === 'contadora') return 'Contadora'
  if (key === 'gestor de ventas') return 'Gestor de Ventas'
  if (key === 'jefe de almacen') return 'Jefe de Almacen'
  if (key === 'obrero') return 'Obrero'
  if (isProductionRoleKey(key)) return 'Jefe de Turno de Produccion'

  return null
}

export function normalizeAdminRole(input: string, fallback: AdminRole = 'Obrero'): AdminRole {
  return parseAdminRole(input) ?? fallback
}

export function parseTrabajadorRole(input: string): RolTrabajador | null {
  const key = normalizeRoleKey(input)

  if (key === 'administrador') return 'Administrador'
  if (key === 'gestor de ventas') return 'Gestor de Ventas'
  if (key === 'jefe de almacen') return 'Jefe de Almacen'
  if (key === 'obrero') return 'Obrero'
  if (isProductionRoleKey(key)) return 'Jefe de Turno de Producci\u00F3n'

  return null
}

export function normalizeTrabajadorRole(
  input: string,
  fallback: RolTrabajador = 'Obrero',
): RolTrabajador {
  return parseTrabajadorRole(input) ?? fallback
}
