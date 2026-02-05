import React from "react"

// ==========================================
// TIPOS DEL SISTEMA DE TALLER DE MÁRMOL
// ==========================================

// Dimensiones fijas permitidas
export type Dimension = '40x40' | '60x40' | '80x40'

// Tipos de producto
export type TipoProducto = 'Piso' | 'Plancha'

// Estados de la losa
export type EstadoLosa = 'Crudo' | 'Pulido'

// Roles del sistema (panel y personal operativo)
export type RolTrabajador =
  | 'Administrador'
  | 'Gestor de Ventas'
  | 'Jefe de Turno de Producción'
  | 'Obrero'

// Acciones sobre losas
export type AccionLosa = 'picar' | 'pulir' | 'escuadrar'

// Tarifas de pago por acción (por losa) - VALORES POR DEFECTO
export const TARIFAS_ACCION_DEFAULT: Record<AccionLosa, number> = {
  picar: 400,
  pulir: 250,
  escuadrar: 100
}

export const TARIFAS_ACCION = TARIFAS_ACCION_DEFAULT

// Precios por m² según dimensión - VALORES POR DEFECTO
export const PRECIOS_M2_DEFAULT: Record<Dimension, { crudo: number; pulido: number }> = {
  '40x40': { crudo: 120, pulido: 180 },
  '60x40': { crudo: 140, pulido: 200 },
  '80x40': { crudo: 160, pulido: 220 }
}

// Configuración del sistema
export interface ConfiguracionSistema {
  // Tarifas globales por defecto
  tarifasGlobales: Record<AccionLosa, number>
  // Precios por m² según dimensión y estado
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
  estado: EstadoLosa
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

// Conversión de losas a m2
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

// Registro de producción diaria
export interface ProduccionDiaria {
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

// Registro de mermas (EN METROS CUADRADOS)
export interface Merma {
  id: string
  fecha: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  metrosCuadrados: number // Merma directa en m²
  motivo: 'Partida al picar' | 'Partida al pulir' | 'Defecto de material' | 'Recorte aprovechable' | 'Otro'
  observaciones: string
}

// Venta (en metros cuadrados)
export interface Venta {
  id: string
  productoId: string
  productoNombre: string
  cantidadM2: number
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
  // Estadísticas
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
  produccionIds: string[] // IDs de producción incluidos
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

// Tipos auxiliares para navegación y UI
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
