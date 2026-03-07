/**
 * Domain entities – núcleo del negocio, sin dependencias de frameworks.
 * Re-exporta desde tipos centrales para mantener una única fuente de verdad.
 */

export type Dimension = '40x40' | '60x40' | '80x40'
export type TipoProducto = 'Piso' | 'Plancha'
export type EstadoLosa = 'Crudo' | 'Pulido'
export type EstadoInventario = 'Picado' | 'Pulido' | 'Escuadrado'
export type AccionLosa = 'picar' | 'pulir' | 'escuadrar'
export type TipoEquipo = 'Pulidora' | 'Cortadora' | 'Escuadradora'

export type RolTrabajador =
  | 'Administrador'
  | 'Gestor de Ventas'
  | 'Jefe de Turno de Producción'
  | 'Obrero'

export type RolConSalarioFijo = Exclude<RolTrabajador, 'Obrero'>

export interface ConfiguracionSistema {
  tarifasGlobales: Record<AccionLosa, number>
  salariosFijosPorRol: Record<RolConSalarioFijo, number>
  preciosM2: Record<Dimension, { crudo: number; pulido: number }>
  nombreEmpresa: string
  email: string
  telefono: string
  direccion: string
  notificacionesEmail: boolean
  alertasStockBajo: boolean
  reportesVentas: boolean
}

export interface BloqueOLote {
  id: string
  nombre: string
  tipo: 'Bloque' | 'Lote'
  dimensionBase: Dimension
  costo: number
  costoTransporte: number
  metrosComprados: number
  fechaIngreso: string
  proveedor: string
  losasProducidas: number
  losasPerdidas: number
  metrosVendibles: number
  gananciaReal: number
  estado: 'activo' | 'agotado'
}

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
  trabajadorId?: string
  trabajadorNombre?: string
  trabajadores?: Array<{ id: string; nombre: string }>
  equipoId: string
  equipoNombre: string
  cantidadLosas: number
  metrosCuadrados: number
  losasMermaTotal?: number
  metrosMermaTotal?: number
  losasReutilizables?: number
  metrosReutilizables?: number
}

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
  pagoPorLosa: number
  pagoTotal: number
  bono: number
  pagoFinal: number
  pagado: boolean
}

export type MotivoMerma =
  | 'Partida al picar'
  | 'Partida al pulir'
  | 'Defecto de material'
  | 'Recorte aprovechable'
  | 'Otro'

export interface Merma {
  id: string
  fecha: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadLosas: number
  metrosCuadrados: number
  motivo: MotivoMerma
  observaciones: string
}

export interface VentaDetalleProducto {
  productoId: string
  productoNombre: string
  origenId: string
  origenNombre: string
  dimension: Dimension
  estado: EstadoInventario
  metrosCuadrados: number
  precioM2: number
  subtotal: number
}

export interface Venta {
  id: string
  productoId: string
  productoNombre: string
  detallesProductos?: VentaDetalleProducto[]
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

export interface Trabajador {
  id: string
  nombre: string
  email: string
  telefono: string
  rol: RolTrabajador
  fechaIngreso: string
  estado: 'activo' | 'inactivo'
  usuario?: string
  contrasena?: string
  tarifasPersonalizadas: TarifasTrabajador | null
  losasProducidas: number
  pagosTotales: number
  bonosTotales: number
  acumuladoPendiente: number
}

export interface HistorialPago {
  id: string
  trabajadorId: string
  trabajadorNombre: string
  fecha: string
  produccionIds: string[]
  montoAcciones: number
  montoBonos: number
  bonoExtra: number
  motivoBonoExtra: string
  totalPagado: number
  observaciones: string
}

export interface SystemLog {
  id: string
  fecha: string
  usuario: string
  accion: string
  modulo: string
  descripcion: string
  nivel: 'info' | 'alerta' | 'error'
}

export type WorkshopStatus = 'activo' | 'en-implementacion' | 'pausado'

export interface WorkshopTenant {
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

export type AdminRole =
  | 'Super Admin'
  | 'Administrador'
  | 'Contadora'
  | 'Gestor de Ventas'
  | 'Jefe de Turno de Produccion'
  | 'Jefe de Turno de Producción'
  | 'Obrero'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
}
