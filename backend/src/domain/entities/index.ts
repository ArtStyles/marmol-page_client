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
export type EstadoAprobacion = 'pendiente' | 'aprobado' | 'rechazado'

export type RolTrabajador =
  | 'Administrador'
  | 'Gestor de Ventas'
  | 'Jefe de Almacen'
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
  visible: boolean
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
  aprobacionTallerEstado?: EstadoAprobacion
  aprobacionTallerPorId?: string
  aprobacionTallerPorNombre?: string
  aprobacionTallerFecha?: string
  aprobacionTallerMotivoRechazo?: string
  aprobacionAlmacenEstado?: EstadoAprobacion
  aprobacionAlmacenPorId?: string
  aprobacionAlmacenPorNombre?: string
  aprobacionAlmacenFecha?: string
  aprobacionAlmacenMotivo?: string
  inventarioAplicado?: boolean
  movimientoInventarioIds?: string[]
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
  estadoInventario?: EstadoAprobacion
  movimientoInventarioId?: string
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
  estado: 'pendiente' | 'completada' | 'cancelada' | 'pendiente_aprobacion_almacen'
  motivoMovimientoAlmacen?: string
  movimientoInventarioId?: string
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

export type GastoTipo =
  | 'Materia prima'
  | 'Transporte'
  | 'Servicios'
  | 'Mantenimiento'
  | 'Nomina'
  | 'Operacion'
  | 'Imprevisto'

export type GastoFlujo = 'Produccion' | 'Inventario' | 'Ventas' | 'Administracion' | 'General'

export interface Gasto {
  id: string
  fecha: string
  costo: number
  tipo: GastoTipo
  flujo: GastoFlujo
  descripcion: string
  encargado: string
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
  | 'Jefe de Almacen'
  | 'Jefe de Turno de Produccion'
  | 'Jefe de Turno de Producción'
  | 'Obrero'

export interface PermissionDefinition {
  code: string
  module: string
  name: string
  description: string
}

export interface PermissionGroup {
  id: string
  name: string
  description: string
  permissionCodes: string[]
  isSystem: boolean
  systemKey?: string | null
  memberCount?: number
}

export interface UserPermissionAccess {
  userId: string
  name: string
  email: string
  role: AdminRole
  workshopId: string
  permissionGroupIds: string[]
  directPermissionCodes: string[]
  effectivePermissionCodes: string[]
}

export interface ResolvedPermissionAccess {
  permissionCodes: string[]
  permissionGroupIds: string[]
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  workshopId: string
  permissions?: string[]
  permissionGroups?: string[]
}

export type InventarioMovimientoTipo = 'entrada' | 'salida'
export type InventarioMovimientoOrigen = 'produccion' | 'venta' | 'merma' | 'proceso' | 'ajuste'
export type InventarioMovimientoEstado = EstadoAprobacion

export interface InventarioMovimientoDetalle {
  id: string
  productoId?: string
  productoNombre: string
  tipo: TipoProducto
  estado?: EstadoInventario
  dimension: Dimension
  origenId: string
  origenNombre: string
  cantidadLosas: number
  metrosCuadrados: number
}

export interface InventarioMovimiento {
  id: string
  fechaSolicitud: string
  fechaResolucion?: string
  tipo: InventarioMovimientoTipo
  origen: InventarioMovimientoOrigen
  estado: InventarioMovimientoEstado
  referenciaId?: string
  motivo: string
  observaciones?: string
  solicitadoPorId?: string
  solicitadoPorNombre?: string
  aprobadoPorId?: string
  aprobadoPorNombre?: string
  motivoRechazo?: string
  detalles: InventarioMovimientoDetalle[]
}
