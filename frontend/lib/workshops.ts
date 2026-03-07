export type WorkshopStatus = 'activo' | 'en-implementacion' | 'pausado'

export type WorkshopTenant = {
  id: string
  nombre: string
  ciudad: string
  direccion: string
  encargado: string
  telefono: string
  correo: string
  estado: WorkshopStatus
  empleados: number
  capacidadM2Mes: number
  ventasMes: number
  produccionMesM2: number
  margenOperativo: number
  ordenesActivas: number
  ultimaActualizacion: string
}

export type WorkshopCreateInput = {
  nombre: string
  ciudad: string
  direccion: string
  encargado: string
  telefono: string
  correo: string
}

export const WORKSHOP_STORAGE_KEY = 'marble-admin-workshop'

export const WORKSHOP_ASSIGNMENTS: Record<string, string> = {
  'ADM-001': 'TLR-001',
  'VEN-001': 'TLR-001',
  'PROD-001': 'TLR-001',
  'CONT-001': 'TLR-002',
}

export const MOCK_WORKSHOPS: WorkshopTenant[] = [
  {
    id: 'TLR-001',
    nombre: 'Taller Central CDMX',
    ciudad: 'Ciudad de Mexico',
    direccion: 'Av. Principal 123, Col. Centro',
    encargado: 'Fernando Ruiz',
    telefono: '+52 555 456 7890',
    correo: 'cdmx@marmol.local',
    estado: 'activo',
    empleados: 18,
    capacidadM2Mes: 1600,
    ventasMes: 245000,
    produccionMesM2: 1280,
    margenOperativo: 0.26,
    ordenesActivas: 14,
    ultimaActualizacion: '2026-02-05',
  },
  {
    id: 'TLR-002',
    nombre: 'Taller Guadalajara',
    ciudad: 'Guadalajara',
    direccion: 'Carr. Chapala 980, Zona Industrial',
    encargado: 'Lucia Herrera',
    telefono: '+52 333 210 9988',
    correo: 'gdl@marmol.local',
    estado: 'activo',
    empleados: 12,
    capacidadM2Mes: 1100,
    ventasMes: 162000,
    produccionMesM2: 940,
    margenOperativo: 0.22,
    ordenesActivas: 9,
    ultimaActualizacion: '2026-02-04',
  },
  {
    id: 'TLR-003',
    nombre: 'Taller Monterrey',
    ciudad: 'Monterrey',
    direccion: 'Av. Lazaro Cardenas 1340, Sur',
    encargado: 'Marco Salinas',
    telefono: '+52 818 555 3020',
    correo: 'mty@marmol.local',
    estado: 'en-implementacion',
    empleados: 9,
    capacidadM2Mes: 780,
    ventasMes: 98000,
    produccionMesM2: 520,
    margenOperativo: 0.18,
    ordenesActivas: 6,
    ultimaActualizacion: '2026-02-02',
  },
]

export function createMockWorkshop(input: WorkshopCreateInput, sequence: number): WorkshopTenant {
  const today = new Date().toISOString().split('T')[0]
  return {
    id: `TLR-${String(sequence).padStart(3, '0')}`,
    nombre: input.nombre,
    ciudad: input.ciudad,
    direccion: input.direccion,
    encargado: input.encargado,
    telefono: input.telefono,
    correo: input.correo,
    estado: 'en-implementacion',
    empleados: 0,
    capacidadM2Mes: 0,
    ventasMes: 0,
    produccionMesM2: 0,
    margenOperativo: 0,
    ordenesActivas: 0,
    ultimaActualizacion: today,
  }
}

export function getAssignedWorkshopId(
  userId: string,
  workshops: WorkshopTenant[],
): string | null {
  const assigned = WORKSHOP_ASSIGNMENTS[userId]
  if (assigned && workshops.some((workshop) => workshop.id === assigned)) {
    return assigned
  }
  return workshops[0]?.id ?? null
}
