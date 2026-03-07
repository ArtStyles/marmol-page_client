import type {
  BloqueOLote,
  ConfiguracionSistema,
  Equipo,
  HistorialPago,
  Merma,
  ProduccionDiaria,
  ProduccionTrabajador,
  Producto,
  SystemLog,
  Trabajador,
  Venta,
  WorkshopTenant,
  AdminUser,
} from '../domain/entities/index.js'
import type { WorkshopCreateInput } from '../domain/ports/index.js'
import {
  configuracionInicial,
  bloquesYLotes,
  productos,
  trabajadores,
  equipos,
  produccionDiaria,
  produccionTrabajadores,
  mermas,
  ventas,
  historialPagos,
  logsSistema,
  workshops,
} from './seed.js'

// Mutable in-memory store (cloned from seed so we can reset)
const state = {
  configuracion: { ...configuracionInicial } as ConfiguracionSistema,
  bloques: [...bloquesYLotes],
  productos: [...productos],
  trabajadores: [...trabajadores],
  equipos: [...equipos],
  produccion: [...produccionDiaria],
  produccionTrabajadores: [...produccionTrabajadores],
  mermas: [...mermas],
  ventas: [...ventas],
  historialPagos: [...historialPagos],
  logs: [...logsSistema],
  workshops: [...workshops],
}

// --- Configuracion ---
export function getConfiguracion(): ConfiguracionSistema {
  return state.configuracion
}
export function setConfiguracion(value: ConfiguracionSistema): ConfiguracionSistema {
  state.configuracion = value
  return state.configuracion
}

// --- Bloques ---
export function getBloques(): BloqueOLote[] {
  return state.bloques
}
export function getBloqueById(id: string): BloqueOLote | undefined {
  return state.bloques.find((b) => b.id === id)
}
export function createBloque(data: Omit<BloqueOLote, 'id'>): BloqueOLote {
  const id = `BL${String(state.bloques.length + 1).padStart(3, '0')}`
  const item: BloqueOLote = { ...data, id }
  state.bloques.push(item)
  return item
}
export function updateBloque(id: string, data: Partial<BloqueOLote>): BloqueOLote | null {
  const i = state.bloques.findIndex((b) => b.id === id)
  if (i === -1) return null
  state.bloques[i] = { ...state.bloques[i], ...data }
  return state.bloques[i]
}
export function deleteBloque(id: string): boolean {
  const i = state.bloques.findIndex((b) => b.id === id)
  if (i === -1) return false
  state.bloques.splice(i, 1)
  return true
}

// --- Productos ---
export function getProductos(): Producto[] {
  return state.productos
}
export function getProductoById(id: string): Producto | undefined {
  return state.productos.find((p) => p.id === id)
}
export function createProducto(data: Omit<Producto, 'id'>): Producto {
  const id = `P${String(state.productos.length + 1).padStart(3, '0')}`
  const item: Producto = { ...data, id }
  state.productos.push(item)
  return item
}
export function updateProducto(id: string, data: Partial<Producto>): Producto | null {
  const i = state.productos.findIndex((p) => p.id === id)
  if (i === -1) return null
  state.productos[i] = { ...state.productos[i], ...data }
  return state.productos[i]
}
export function deleteProducto(id: string): boolean {
  const i = state.productos.findIndex((p) => p.id === id)
  if (i === -1) return false
  state.productos.splice(i, 1)
  return true
}

// --- Trabajadores ---
export function getTrabajadores(): Trabajador[] {
  return state.trabajadores
}
export function getTrabajadorById(id: string): Trabajador | undefined {
  return state.trabajadores.find((t) => t.id === id)
}
export function createTrabajador(data: Omit<Trabajador, 'id'>): Trabajador {
  const id = `T${String(state.trabajadores.length + 1).padStart(3, '0')}`
  const item: Trabajador = { ...data, id }
  state.trabajadores.push(item)
  return item
}
export function updateTrabajador(id: string, data: Partial<Trabajador>): Trabajador | null {
  const i = state.trabajadores.findIndex((t) => t.id === id)
  if (i === -1) return null
  state.trabajadores[i] = { ...state.trabajadores[i], ...data }
  return state.trabajadores[i]
}
export function deleteTrabajador(id: string): boolean {
  const i = state.trabajadores.findIndex((t) => t.id === id)
  if (i === -1) return false
  state.trabajadores.splice(i, 1)
  return true
}

// --- Equipos ---
export function getEquipos(): Equipo[] {
  return state.equipos
}
export function getEquipoById(id: string): Equipo | undefined {
  return state.equipos.find((e) => e.id === id)
}
export function createEquipo(data: Omit<Equipo, 'id'>): Equipo {
  const id = `EQ${String(state.equipos.length + 1).padStart(3, '0')}`
  const item: Equipo = { ...data, id }
  state.equipos.push(item)
  return item
}
export function updateEquipo(id: string, data: Partial<Equipo>): Equipo | null {
  const i = state.equipos.findIndex((e) => e.id === id)
  if (i === -1) return null
  state.equipos[i] = { ...state.equipos[i], ...data }
  return state.equipos[i]
}
export function deleteEquipo(id: string): boolean {
  const i = state.equipos.findIndex((e) => e.id === id)
  if (i === -1) return false
  state.equipos.splice(i, 1)
  return true
}

// --- Produccion (diaria) ---
export function getProduccion(): ProduccionDiaria[] {
  return state.produccion
}
export function getProduccionById(id: string): ProduccionDiaria | undefined {
  return state.produccion.find((p) => p.id === id)
}
export function createProduccion(data: Omit<ProduccionDiaria, 'id'>): ProduccionDiaria {
  const id = `PG${String(state.produccion.length + 1).padStart(3, '0')}`
  const item: ProduccionDiaria = { ...data, id }
  state.produccion.push(item)
  return item
}
export function updateProduccion(id: string, data: Partial<ProduccionDiaria>): ProduccionDiaria | null {
  const i = state.produccion.findIndex((p) => p.id === id)
  if (i === -1) return null
  state.produccion[i] = { ...state.produccion[i], ...data }
  return state.produccion[i]
}
export function deleteProduccion(id: string): boolean {
  const i = state.produccion.findIndex((p) => p.id === id)
  if (i === -1) return false
  state.produccion.splice(i, 1)
  return true
}

// --- Produccion Trabajadores ---
export function getProduccionTrabajadores(): ProduccionTrabajador[] {
  return state.produccionTrabajadores
}
export function getProduccionTrabajadorById(id: string): ProduccionTrabajador | undefined {
  return state.produccionTrabajadores.find((p) => p.id === id)
}
export function createProduccionTrabajador(data: Omit<ProduccionTrabajador, 'id'>): ProduccionTrabajador {
  const id = `PD${String(state.produccionTrabajadores.length + 1).padStart(3, '0')}`
  const item: ProduccionTrabajador = { ...data, id }
  state.produccionTrabajadores.push(item)
  return item
}
export function updateProduccionTrabajador(id: string, data: Partial<ProduccionTrabajador>): ProduccionTrabajador | null {
  const i = state.produccionTrabajadores.findIndex((p) => p.id === id)
  if (i === -1) return null
  state.produccionTrabajadores[i] = { ...state.produccionTrabajadores[i], ...data }
  return state.produccionTrabajadores[i]
}
export function deleteProduccionTrabajador(id: string): boolean {
  const i = state.produccionTrabajadores.findIndex((p) => p.id === id)
  if (i === -1) return false
  state.produccionTrabajadores.splice(i, 1)
  return true
}

// --- Mermas ---
export function getMermas(): Merma[] {
  return state.mermas
}
export function getMermaById(id: string): Merma | undefined {
  return state.mermas.find((m) => m.id === id)
}
export function createMerma(data: Omit<Merma, 'id'>): Merma {
  const id = `M${String(state.mermas.length + 1).padStart(3, '0')}`
  const item: Merma = { ...data, id }
  state.mermas.push(item)
  return item
}
export function updateMerma(id: string, data: Partial<Merma>): Merma | null {
  const i = state.mermas.findIndex((m) => m.id === id)
  if (i === -1) return null
  state.mermas[i] = { ...state.mermas[i], ...data }
  return state.mermas[i]
}
export function deleteMerma(id: string): boolean {
  const i = state.mermas.findIndex((m) => m.id === id)
  if (i === -1) return false
  state.mermas.splice(i, 1)
  return true
}

// --- Ventas ---
export function getVentas(): Venta[] {
  return state.ventas
}
export function getVentaById(id: string): Venta | undefined {
  return state.ventas.find((v) => v.id === id)
}
export function createVenta(data: Omit<Venta, 'id'>): Venta {
  const id = `V${String(state.ventas.length + 1).padStart(3, '0')}`
  const item: Venta = { ...data, id }
  state.ventas.push(item)
  return item
}
export function updateVenta(id: string, data: Partial<Venta>): Venta | null {
  const i = state.ventas.findIndex((v) => v.id === id)
  if (i === -1) return null
  state.ventas[i] = { ...state.ventas[i], ...data }
  return state.ventas[i]
}
export function deleteVenta(id: string): boolean {
  const i = state.ventas.findIndex((v) => v.id === id)
  if (i === -1) return false
  state.ventas.splice(i, 1)
  return true
}

// --- Historial Pagos ---
export function getHistorialPagos(): HistorialPago[] {
  return state.historialPagos
}
export function getHistorialPagoById(id: string): HistorialPago | undefined {
  return state.historialPagos.find((h) => h.id === id)
}
export function createHistorialPago(data: Omit<HistorialPago, 'id'>): HistorialPago {
  const id = `HP${String(state.historialPagos.length + 1).padStart(3, '0')}`
  const item: HistorialPago = { ...data, id }
  state.historialPagos.push(item)
  return item
}
export function updateHistorialPago(id: string, data: Partial<HistorialPago>): HistorialPago | null {
  const i = state.historialPagos.findIndex((h) => h.id === id)
  if (i === -1) return null
  state.historialPagos[i] = { ...state.historialPagos[i], ...data }
  return state.historialPagos[i]
}
export function deleteHistorialPago(id: string): boolean {
  const i = state.historialPagos.findIndex((h) => h.id === id)
  if (i === -1) return false
  state.historialPagos.splice(i, 1)
  return true
}

// --- Logs ---
export function getLogs(): SystemLog[] {
  return state.logs
}
export function createLog(data: Omit<SystemLog, 'id'>): SystemLog {
  const id = `LOG${String(state.logs.length + 1).padStart(3, '0')}`
  const item: SystemLog = { ...data, id }
  state.logs.push(item)
  return item
}

// --- Workshops ---
export function getWorkshops(): WorkshopTenant[] {
  return state.workshops
}
export function getWorkshopById(id: string): WorkshopTenant | undefined {
  return state.workshops.find((w) => w.id === id)
}
export function createWorkshop(input: WorkshopCreateInput): WorkshopTenant {
  const id = `TLR-${String(state.workshops.length + 1).padStart(3, '0')}`
  const today = new Date().toISOString().split('T')[0]
  const item: WorkshopTenant = {
    id,
    ...input,
    estado: 'en-implementacion',
    empleados: 0,
    capacidadM2Mes: 0,
    ventasMes: 0,
    produccionMesM2: 0,
    margenOperativo: 0,
    ordenesActivas: 0,
    ultimaActualizacion: today,
  }
  state.workshops.push(item)
  return item
}
export function updateWorkshop(id: string, data: Partial<WorkshopTenant>): WorkshopTenant | null {
  const i = state.workshops.findIndex((w) => w.id === id)
  if (i === -1) return null
  state.workshops[i] = { ...state.workshops[i], ...data }
  return state.workshops[i]
}
export function deleteWorkshop(id: string): boolean {
  const i = state.workshops.findIndex((w) => w.id === id)
  if (i === -1) return false
  state.workshops.splice(i, 1)
  return true
}

// --- Auth (mock users, no persistence)
const MOCK_ADMIN_USERS: Array<{ email: string; password: string; user: AdminUser }> = [
  { email: 'superadmin@marmol.local', password: 'super123', user: { id: 'SUP-001', name: 'Super Admin', email: 'superadmin@marmol.local', role: 'Super Admin' } },
  { email: 'admin@marmol.local', password: 'admin123', user: { id: 'ADM-001', name: 'Admin Principal', email: 'admin@marmol.local', role: 'Administrador' } },
  { email: 'contadora@marmol.local', password: 'conta123', user: { id: 'CONT-001', name: 'Contadora General', email: 'contadora@marmol.local', role: 'Contadora' } },
  { email: 'ventas@marmol.local', password: 'ventas123', user: { id: 'VEN-001', name: 'Gestor de Ventas', email: 'ventas@marmol.local', role: 'Gestor de Ventas' } },
  { email: 'produccion@marmol.local', password: 'prod123', user: { id: 'PROD-001', name: 'Jefe de Turno', email: 'produccion@marmol.local', role: 'Jefe de Turno de Produccion' } },
  { email: 'carlos.mendoza@taller.com', password: 'obrero123', user: { id: 'OBR-001', name: 'Carlos Mendoza', email: 'carlos.mendoza@taller.com', role: 'Obrero' } },
]

export function loginAdmin(email: string, password: string): AdminUser | null {
  const entry = MOCK_ADMIN_USERS.find(
    (e) => e.email.toLowerCase() === email.toLowerCase() && e.password === password
  )
  return entry ? entry.user : null
}
