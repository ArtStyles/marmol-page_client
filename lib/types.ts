import React from "react"

// ==========================================
// TIPOS DEL SISTEMA DE TALLER DE MÃRMOL
// ==========================================

// Dimensiones fijas permitidas
export type Dimension = '40x40' | '60x40' | '80x40'

// Tipos de producto
export type TipoProducto = 'Piso' | 'Plancha'

// Estados de acabado (catÃ¡logo/comercial)
export type EstadoLosa = 'Crudo' | 'Pulido'
// Estados operativos de inventario
export type EstadoInventario = 'Picado' | 'Pulido' | 'Escuadrado'

// Roles del sistema (panel y personal operativo)
export type RolTrabajador =
  | 'Administrador'
  | 'Gestor de Ventas'
  | 'Jefe de Turno de ProducciÃ³n'
  | 'Obrero'

export type RolConSalarioFijo = Exclude<RolTrabajador, 'Obrero'>

// Acciones sobre losas
export type AccionLosa = 'picar' | 'pulir' | 'escuadrar'

export type TipoEquipo = 'Pulidora' | 'Cortadora' | 'Escuadradora'

export const TIPO_EQUIPO_POR_ACCION: Record<AccionLosa, TipoEquipo> = {
  picar: 'Cortadora',
  pulir: 'Pulidora',
  escuadrar: 'Escuadradora',
}

// Tarifas de pago por acciÃ³n (por losa) - VALORES POR DEFECTO
export const TARIFAS_ACCION_DEFAULT: Record<AccionLosa, number> = {
  picar: 400,
  pulir: 250,
  escuadrar: 100
}

export const TARIFAS_ACCION = TARIFAS_ACCION_DEFAULT

// Salarios fijos mensuales por rol (excepto obrero)
export const SALARIOS_FIJOS_POR_ROL_DEFAULT: Record<RolConSalarioFijo, number> = {
  'Administrador': 28000,
  'Gestor de Ventas': 18000,
  'Jefe de Turno de ProducciÃ³n': 22000
}

// Precios por mÂ² segÃºn dimensiÃ³n - VALORES POR DEFECTO
export const PRECIOS_M2_DEFAULT: Record<Dimension, { crudo: number; pulido: number }> = {
  '40x40': { crudo: 120, pulido: 180 },
  '60x40': { crudo: 140, pulido: 200 },
  '80x40': { crudo: 160, pulido: 220 }
}

// ConfiguraciÃ³n del sistema
export interface ConfiguracionSistema {
  // Tarifas globales por defecto
  tarifasGlobales: Record<AccionLosa, number>
  // Salarios fijos por rol (excepto obrero)
  salariosFijosPorRol: Record<RolConSalarioFijo, number>
  // Precios por mÂ² segÃºn dimensiÃ³n y estado
  preciosM2: Record<Dimension, { crudo: number; pulido: number }>
  // Info empresa
  nombreEmpresa: string
  email: string
  telefono: string
  direccion: string
  // Notificaciones
  notificacionesEmail: boolean
  alertasStockBajo: boolean
  reportesVentas: boolean
}

// Bloque o Lote de origen
export interface BloqueOLote {
  id: string
  nombre: string
  tipo: 'Bloque' | 'Lote'
  costo: number
  metrosComprados: number
  fechaIngreso: string
  proveedor: string
  losasProducidas: number
  losasPerdidas: number
  metrosVendibles: number
  gananciaReal: number
  estado: 'activo' | 'agotado'
}

// Producto/Losa en inventario
export interface Producto {
  id: string
  nombre: string
  tipo: TipoProducto
  estado: EstadoInventario
  dimension: Dimension
  origenId: string
  origenNombre: string
  cantidadLosas: number
  metrosCuadrados: number
  precioM2: number
  imagen: string
}

// Producto visible en el catalogo del landing
export interface CatalogoItem {
  id: string
  nombre: string
  tipo: TipoProducto
  acabado: EstadoLosa
  dimension: Dimension
  precioM2: number
  stockLosas: number
  destacado: boolean
  descripcion: string
  imagen: string
}

// ConversiÃ³n de losas a m2
export function losasAMetros(losas: number, dimension: Dimension): number {
  const dimensiones: Record<Dimension, number> = {
    '40x40': 0.16,
    '60x40': 0.24,
    '80x40': 0.32
  }
  return losas * dimensiones[dimension]
}

// Tarifas personalizadas por trabajador
export interface TarifasTrabajador {
  picar: number
  pulir: number
  escuadrar: number
}

export interface Equipo {
  id: string
  nombre: string
  tipo: TipoEquipo
  codigoInterno: string
  estado: 'activo' | 'mantenimiento' | 'inactivo'
  notas: string
}

export interface ProduccionDetalleAccion {
  id: string
  accion: AccionLosa
  trabajadorId: string
  trabajadorNombre: string
  equipoId: string
  equipoNombre: string
  cantidadLosas: number
  metrosCuadrados: number
  // Losas partidas en la accion:
  // - merma total: perdida definitiva
  // - reutilizables: partidas pero reaprovechables para inventario
  losasMermaTotal?: number
  metrosMermaTotal?: number
  losasReutilizables?: number
  metrosReutilizables?: number
}

// Registro de producciÃ³n diaria
export interface ProduccionDiaria {
  id: string
  fecha: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadPicar: number
  cantidadPulir: number
  cantidadEscuadrar: number
  totalLosas: number
  totalM2: number
  detallesAcciones?: ProduccionDetalleAccion[]
  // Metadata de control de edicion (provista por API)
  canEdit?: boolean
  editableUntil?: string
}

export interface ProduccionTrabajador {
  id: string
  fecha: string
  trabajadorId: string
  trabajadorNombre: string
  accion: AccionLosa
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadLosas: number
  pagoPorLosa: number // Tarifa usada (puede ser personalizada)
  pagoTotal: number
  bono: number
  pagoFinal: number
  pagado: boolean // Si ya fue incluido en un pago
}

// Registro de mermas (captura en losas + conversiÃ³n a mÂ²)
export interface Merma {
  id: string
  fecha: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadLosas: number // Registro en losas enteras
  metrosCuadrados: number // ConversiÃ³n automÃ¡tica segÃºn dimensiÃ³n
  motivo: 'Partida al picar' | 'Partida al pulir' | 'Defecto de material' | 'Recorte aprovechable' | 'Otro'
  observaciones: string
}

// Venta (en metros cuadrados)
export interface Venta {
  id: string
  productoId: string
  productoNombre: string
  cantidadM2: number
  metrosPorDimension: Record<Dimension, number>
  precioM2: number
  descuento: number
  fondoOperativo: number
  subtotal: number
  total: number
  clienteNombre: string
  clienteEmail: string
  clienteTelefono: string
  fecha: string
  estado: 'pendiente' | 'completada' | 'cancelada'
}

// Trabajador con tarifas personalizadas
export interface Trabajador {
  id: string
  nombre: string
  email: string
  telefono: string
  rol: RolTrabajador
  fechaIngreso: string
  estado: 'activo' | 'inactivo'
  // Credenciales (solo si tiene acceso al sistema)
  usuario?: string
  contrasena?: string
  // Tarifas personalizadas (si son diferentes a las globales)
  tarifasPersonalizadas: TarifasTrabajador | null
  // EstadÃ­sticas
  losasProducidas: number
  pagosTotales: number
  bonosTotales: number
  // Acumulados pendientes de pago
  acumuladoPendiente: number
}

// Registro de pago realizado a trabajador
export interface HistorialPago {
  id: string
  trabajadorId: string
  trabajadorNombre: string
  fecha: string
  produccionIds: string[] // IDs de producciÃ³n incluidos
  montoAcciones: number
  montoBonos: number
  bonoExtra: number // Bono adicional en el momento del pago
  motivoBonoExtra: string
  totalPagado: number
  observaciones: string
}

// Log del sistema
export interface SystemLog {
  id: string
  fecha: string
  usuario: string
  accion: string
  modulo: string
  descripcion: string
  nivel: 'info' | 'alerta' | 'error'
}

// Tipos auxiliares para navegaciÃ³n y UI
export interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface StatCardType {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}



