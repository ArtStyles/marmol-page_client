import React from 'react'

export const DIMENSIONES_PISO = ['40x40', '60x40', '80x40'] as const
export const DIMENSIONES_PLANCHA = ['160x65', '160x60'] as const
export const MONO_HILO_DIMENSIONES_BASE: Dimension[] = ['160x65', '160x60', '80x40', '60x40', '40x40']
export const VENTA_FONDO_DESGASTE_EQUIPOS_RATE = 0.1
export const VENTA_FONDO_TRABAJADORES_RATE = 0.05

export type PisoDimension = (typeof DIMENSIONES_PISO)[number]
export type PlanchaDimension = string
export type Dimension = string
export type TipoProducto = 'Piso' | 'Plancha'
export const PLANCHA_DIMENSION: PlanchaDimension = DIMENSIONES_PLANCHA[0]
export const PLANCHA_DIMENSIONES: PlanchaDimension[] = [...DIMENSIONES_PLANCHA]

const DIMENSION_AREA_M2_FIJA: Record<string, number> = {
  '40x40': 1 / 6,
  '60x40': 1 / 4,
  '80x40': 1 / 3,
  '160x60': 0.96,
  '160x65': 1.04,
}

const DIMENSION_REGEX = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i

function formatDimensionNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

export const normalizeDimension = (dimension: string): Dimension => {
  const normalized = dimension.trim().toLowerCase().replace(/\s+/g, '')
  const match = normalized.match(DIMENSION_REGEX)
  if (!match) return normalized

  return `${formatDimensionNumber(Number(match[1]))}x${formatDimensionNumber(Number(match[2]))}`
}

export const parseDimension = (
  dimension: string,
): { largoCm: number; anchoCm: number } | null => {
  const normalized = normalizeDimension(dimension)
  const match = normalized.match(DIMENSION_REGEX)
  if (!match) return null

  const largoCm = Number(match[1])
  const anchoCm = Number(match[2])
  if (!Number.isFinite(largoCm) || !Number.isFinite(anchoCm) || largoCm <= 0 || anchoCm <= 0) {
    return null
  }

  return { largoCm, anchoCm }
}

export const isValidDimension = (dimension: unknown): dimension is Dimension =>
  typeof dimension === 'string' && parseDimension(dimension) !== null

export const isPisoDimension = (dimension: unknown): dimension is PisoDimension =>
  typeof dimension === 'string' &&
  DIMENSIONES_PISO.includes(normalizeDimension(dimension) as PisoDimension)

export const isPlanchaDimension = (dimension: unknown): dimension is PlanchaDimension =>
  isValidDimension(dimension) && !isPisoDimension(dimension)

export const resolveTipoProductoByDimension = (dimension: Dimension): TipoProducto =>
  isPlanchaDimension(dimension) ? 'Plancha' : 'Piso'

export const dimensionToAreaM2 = (dimension: Dimension): number => {
  const normalized = normalizeDimension(dimension)
  const fixedArea = DIMENSION_AREA_M2_FIJA[normalized]
  if (fixedArea != null) return fixedArea

  const parsed = parseDimension(normalized)
  if (!parsed) return 0

  return Number(((parsed.largoCm * parsed.anchoCm) / 10_000).toFixed(4))
}

export const buildEmptyMetrosPorDimension = (
  dimensions: Iterable<Dimension> = [...DIMENSIONES_PISO, ...DIMENSIONES_PLANCHA],
): Record<string, number> => {
  const totals: Record<string, number> = {}

  for (const dimension of dimensions) {
    const normalized = normalizeDimension(dimension)
    if (!normalized) continue
    if (totals[normalized] == null) {
      totals[normalized] = 0
    }
  }

  return totals
}
export type EstadoLosa = 'Crudo' | 'Pulido'
export type EstadoInventario = 'Picado' | 'Escuadrado' | 'Devastado' | 'Resinado' | 'Pulido'
export type UbicacionInventario = 'almacen' | 'proceso'
export type UbicacionMasaMonoHilo = 'almacen' | 'proceso' | 'consumida'
export type ProduccionWorkflowTipo = 'regular' | 'mono_hilo'
export type EstadoProduccionRegistro = 'activo' | 'anulado'
export type EstadoMonoHiloMasa = 'activa' | 'anulada'

export type RolTrabajador =
  | 'Administrador'
  | 'Gestor de Ventas'
  | 'Jefe de Almacen'
  | 'Jefe de Turno de Produccion'
  | 'Jefe de Turno de ProducciÃ³n'
  | 'Jefe de Turno de Producción'
  | 'Jefe de Turno de ProducciÃƒÂ³n'
  | 'Obrero'

export type RolConSalarioFijo = Exclude<RolTrabajador, 'Obrero'>

export type AccionLosa = 'picar' | 'escuadrar' | 'devastar' | 'resinar' | 'pulir'
export type TipoEquipo = 'Pulidora' | 'Cortadora' | 'Escuadradora'
export type EstadoAprobacion = 'pendiente' | 'aprobado' | 'rechazado'

export const TIPO_EQUIPO_POR_ACCION: Record<AccionLosa, TipoEquipo> = {
  picar: 'Cortadora',
  escuadrar: 'Escuadradora',
  devastar: 'Pulidora',
  resinar: 'Pulidora',
  pulir: 'Pulidora',
}

export const TARIFAS_ACCION_DEFAULT: Record<AccionLosa, number> = {
  picar: 400,
  escuadrar: 100,
  devastar: 250,
  resinar: 250,
  pulir: 250,
}

export const TARIFAS_ACCION = TARIFAS_ACCION_DEFAULT

export const SALARIOS_FIJOS_POR_ROL_DEFAULT: Record<RolConSalarioFijo, number> = {
  Administrador: 28000,
  'Gestor de Ventas': 18000,
  'Jefe de Almacen': 20000,
  'Jefe de Turno de Produccion': 22000,
  'Jefe de Turno de ProducciÃ³n': 22000,
  'Jefe de Turno de Producción': 22000,
  'Jefe de Turno de ProducciÃƒÂ³n': 22000,
}

export const PRECIOS_M2_DEFAULT: Record<Dimension, { crudo: number; pulido: number }> = {
  '40x40': { crudo: 120, pulido: 180 },
  '60x40': { crudo: 140, pulido: 200 },
  '80x40': { crudo: 160, pulido: 220 },
  '160x60': { crudo: 160, pulido: 220 },
  '160x65': { crudo: 160, pulido: 220 },
}

export interface ConfiguracionSistema {
  tarifasGlobales: Record<AccionLosa, number>
  salariosFijosPorRol: Record<RolConSalarioFijo, number>
  preciosM2: Record<string, { crudo: number; pulido: number }>
  monoHiloGrosorDiscoMm: number
  monoHiloEspesorLosaCm: number
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
  codigo?: string
  nombre: string
  tipo: 'Bloque' | 'Lote'
  dimensionBase: Dimension | null
  costo: number
  costoTransporte: number
  metrosComprados: number
  fechaIngreso: string
  proveedor: string
  canteraOrigen: string
  losasProducidas: number
  losasPerdidas: number
  metrosVendibles: number
  gananciaReal: number
  estado: 'activo' | 'agotado' | 'vendido'
  canEdit?: boolean
  canDelete?: boolean
  lockReason?: string
}

export type CreateBloqueInput = {
  tipo: BloqueOLote['tipo']
  dimensionBase?: BloqueOLote['dimensionBase']
  costo: number
  costoTransporte: number
  metrosComprados: number
  fechaIngreso: string
  proveedor: string
  canteraOrigen: string
}

export type UpdateBloqueInput = Partial<{
  dimensionBase: BloqueOLote['dimensionBase']
  costo: number
  costoTransporte: number
  metrosComprados: number
  fechaIngreso: string
  proveedor: string
  canteraOrigen: string
}>

export interface Producto {
  id: string
  nombre: string
  tipo: TipoProducto
  estado: EstadoInventario
  ubicacion: UbicacionInventario
  dimension: Dimension
  origenId: string
  origenNombre: string
  cantidadLosas: number
  metrosCuadrados: number
  precioM2: number
  imagen: string
}

export interface MonoHiloEstimadoDimension {
  losasEstimadas: number
  losasConsumidas: number
  mermaEstimadaM3: number
  mermaEstimadaPorcentaje: number
}

export type MonoHiloEstimados = Record<string, MonoHiloEstimadoDimension>

export interface MonoHiloMasa {
  id: string
  bloqueId: string
  bloqueCodigo: string
  bloqueNombre: string
  produccionId?: string
  creadoPorId?: string
  creadoPorNombre?: string
  codigo: string
  largoCm: number
  anchoCm: number
  profundidadCm: number
  margenCm: number
  grosorDiscoMm: number
  espesorLosaCm: number
  ubicacion: UbicacionMasaMonoHilo
  estado?: EstadoMonoHiloMasa
  observaciones: string
  fechaRegistro: string
  estimados: MonoHiloEstimados
  anulacionMotivo?: string
  anuladoPorId?: string
  anuladoPorNombre?: string
  anuladoFecha?: string
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
}

export function losasAMetros(losas: number, dimension: Dimension): number {
  return Number((Math.max(0, losas) * dimensionToAreaM2(dimension)).toFixed(2))
}

export interface TarifasTrabajador {
  picar: number
  escuadrar: number
  devastar: number
  resinar: number
  pulir: number
}

export interface Equipo {
  id: string
  tipo: TipoEquipo
  codigoInterno: string
  estado: 'activo' | 'mantenimiento' | 'inactivo'
  notas: string
}

export interface ProduccionDetalleAccion {
  id: string
  accion: AccionLosa
  masaId?: string
  masaCodigo?: string
  observacion?: string
  trabajadorId?: string
  trabajadorNombre?: string
  trabajadores?: Array<{
    id: string
    nombre: string
  }>
  equipoId: string
  equipoNombre: string
  cantidadLosas: number
  metrosCuadrados: number
  losasMermaTotal?: number
  metrosMermaTotal?: number
  losasReutilizables?: number
  metrosReutilizables?: number
  cantidadResina?: number
}

export interface ProduccionMonoHiloMasaDetalle {
  masaId: string
  masaCodigo: string
  largoCm: number
  anchoCm: number
  profundidadCm: number
}

export interface ProduccionMonoHiloDetalle {
  equipoId: string
  equipoNombre: string
  trabajadores: Array<{
    id: string
    nombre: string
  }>
  masas: ProduccionMonoHiloMasaDetalle[]
  observaciones?: string
}

export interface ProduccionDiaria {
  id: string
  fecha: string
  createdAt?: string
  creadoPorId?: string
  creadoPorNombre?: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  workflowTipo?: ProduccionWorkflowTipo
  estadoRegistro?: EstadoProduccionRegistro
  cantidadPicar: number
  cantidadEscuadrar: number
  cantidadDevastar: number
  cantidadResinar: number
  cantidadPulir: number
  totalLosas: number
  totalM2: number
  detallesAcciones?: ProduccionDetalleAccion[]
  monoHiloDetalle?: ProduccionMonoHiloDetalle
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
  anulacionMotivo?: string
  anuladoPorId?: string
  anuladoPorNombre?: string
  anuladoFecha?: string
}

export interface ProduccionTrabajador {
  id: string
  fecha: string
  produccionId?: string
  produccionDetalleId?: string
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

export interface Merma {
  id: string
  fecha: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadLosas: number
  metrosCuadrados: number
  motivo: 'Partida al picar' | 'Partida al pulir' | 'Defecto de material' | 'Recorte aprovechable' | 'Otro'
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
  cantidadUnidades?: number
  metrosCuadrados: number
  precioM2: number
  subtotal: number
}

export interface Venta {
  id: string
  createdAt?: string
  creadoPorId?: string
  creadoPorNombre?: string
  bloqueId?: string
  bloqueCodigo?: string
  productoId: string
  productoNombre: string
  detallesProductos?: VentaDetalleProducto[]
  cantidadM2: number
  metrosPorDimension: Record<string, number>
  precioM2: number
  descuento: number
  fondoDesgasteEquipos: number
  fondoTrabajadores: number
  fondoOperativo: number
  subtotal: number
  total: number
  clienteNombre: string
  clienteEmail: string
  clienteTelefono: string
  observaciones?: string
  responsableValidacionId?: string
  responsableValidacionNombre?: string
  fechaLiquidacion?: string
  fecha: string
  estado: 'pendiente' | 'completada' | 'cancelada' | 'pendiente_aprobacion_almacen'
  motivoMovimientoAlmacen?: string
  movimientoInventarioId?: string
}

export const GASTO_TIPOS = [
  'Materia prima',
  'Transporte',
  'Servicios',
  'Mantenimiento',
  'Nomina',
  'Operacion',
  'Imprevisto',
] as const

export const GASTO_TIPOS_MANUALES = ['Servicios', 'Mantenimiento', 'Operacion', 'Imprevisto'] as const

export const GASTO_FLUJOS = ['Produccion', 'Inventario', 'Ventas', 'Administracion', 'General'] as const

export type GastoTipo = (typeof GASTO_TIPOS)[number]
export type GastoManualTipo = (typeof GASTO_TIPOS_MANUALES)[number]
export type GastoFlujo = (typeof GASTO_FLUJOS)[number]
export type GastoOrigen = 'manual' | 'sistema'
export type GastoOrigenModulo = 'gastos' | 'bloques' | 'pagos'
export type GastoEstado = 'activo' | 'anulado'

export interface Gasto {
  id: string
  createdAt?: string
  fecha: string
  costo: number
  tipo: GastoTipo
  flujo: GastoFlujo
  descripcion: string
  encargado: string
  origen: GastoOrigen
  origenModulo: GastoOrigenModulo
  referenciaId?: string
  creadoPorId?: string
  creadoPorNombre?: string
  estado: GastoEstado
  anuladoPorId?: string
  anuladoPorNombre?: string
  anuladoFecha?: string
  motivoAnulacion?: string
}

export interface FinancialSeriesPoint {
  fecha: string
  total: number
}

export interface FinancialBreakdownItem {
  key: string
  label: string
  total: number
  count: number
}

export interface FinancialExpenseSummary {
  totalActivo: number
  totalMesActual: number
  promedioActivo: number
  cantidadActivos: number
  cantidadMesActual: number
  totalManualActivo: number
  totalSistemaActivo: number
  balanceContraIngresos: number
  ratioContraIngresos: number
  porTipo: FinancialBreakdownItem[]
  porFlujo: FinancialBreakdownItem[]
  porOrigen: FinancialBreakdownItem[]
  topEncargados: Array<{
    encargado: string
    total: number
  }>
}

export interface FinancialPayrollSummary {
  pagado: number
  pendiente: number
  bonos: number
  salariosFijosReferencia: number
}

export interface FinancialMaterialSummary {
  inventarioComprado: number
  transporteMateriaPrima: number
  costoBloqueAsignado: number
  costoMaterialM2: number
  costoMerma: number
  metrosReferenciaCosteo: number
}

export interface FinancialOperationsSummary {
  ingresosOperativos: number
  ingresosTotales: number
  descuentos: number
  fondosDesgasteEquipos: number
  fondosTrabajadores: number
  fondosOperativos: number
  totalMetrosVendidos: number
  produccionTotalM2: number
  totalMermasM2: number
  mermaRatio: number
  ratioVentaProduccion: number
}

export interface FinancialProfitabilitySummary {
  reservaFijosMantenimiento: number
  baseDespuesReserva: number
  manoObraObreros: number
  manoObraPagada: number
  manoObraPendiente: number
  gastoManualRegistrado: number
  gastoCorriente: number
  gastoAgua: number
  gastoOtros: number
  gastosServicios: number
  utilidadAntesServicios: number
  gananciaNeta: number
  reinversion: number
  pagoDirectivos: number
  margenOperativo: number
  margenNeto: number
  ticketPromedio: number
  ingresoPorM2: number
}

export interface FinancialSummary {
  periodoActual: string
  gastos: FinancialExpenseSummary
  nomina: FinancialPayrollSummary
  materiales: FinancialMaterialSummary
  operacion: FinancialOperationsSummary
  rentabilidad: FinancialProfitabilitySummary
  ventasRecientes: FinancialSeriesPoint[]
  alertas: string[]
  fechas: {
    ultimaVenta?: string
    ultimaProduccion?: string
  }
}

export type InventarioMovimientoTipo = 'entrada' | 'salida'
export type InventarioMovimientoOrigen = 'produccion' | 'venta' | 'merma' | 'proceso' | 'ajuste'

export interface InventarioMovimientoDetalle {
  id: string
  productoId?: string
  productoNombre: string
  tipo: TipoProducto
  estado?: EstadoInventario
  estadoDestino?: EstadoInventario
  ubicacionOrigen?: UbicacionInventario
  ubicacionDestino?: UbicacionInventario
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
  estado: EstadoAprobacion
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

export interface InventarioMovimientoPage {
  items: InventarioMovimiento[]
  nextCursor: string | null
  hasMore: boolean
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
  createdAt?: string
  creadoPorId?: string
  creadoPorNombre?: string
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

