import { z } from 'zod'

const dimensionSchema = z.enum(['40x40', '60x40', '80x40'])
const tipoProductoSchema = z.enum(['Piso', 'Plancha'])
const estadoCatalogoSchema = z.enum(['Crudo', 'Pulido'])
const estadoInventarioSchema = z.enum(['Picado', 'Escuadrado', 'Devastado', 'Resinado', 'Pulido'])
const ubicacionInventarioSchema = z.enum(['almacen', 'proceso'])
const tipoEquipoSchema = z.enum(['Pulidora', 'Cortadora', 'Escuadradora'])
const accionLosaSchema = z.enum(['picar', 'escuadrar', 'devastar', 'resinar', 'pulir'])
const rolTrabajadorSchema = z.enum([
  'Administrador',
  'Gestor de Ventas',
  'Jefe de Almacen',
  'Jefe de Turno de ProducciÃ³n',
  'Obrero',
])
const motivoMermaSchema = z.enum([
  'Partida al picar',
  'Partida al pulir',
  'Defecto de material',
  'Recorte aprovechable',
  'Otro',
])
const gastoTipoSchema = z.enum([
  'Materia prima',
  'Transporte',
  'Servicios',
  'Mantenimiento',
  'Nomina',
  'Operacion',
  'Imprevisto',
])
const gastoFlujoSchema = z.enum(['Produccion', 'Inventario', 'Ventas', 'Administracion', 'General'])

const tarifasTrabajadorSchema = z.object({
  picar: z.number(),
  escuadrar: z.number(),
  devastar: z.number().default(0),
  resinar: z.number().default(0),
  pulir: z.number(),
})

export const createBloqueSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['Bloque', 'Lote']),
  dimensionBase: dimensionSchema,
  costo: z.number(),
  costoTransporte: z.number(),
  metrosComprados: z.number(),
  fechaIngreso: z.string(),
  proveedor: z.string(),
  losasProducidas: z.number(),
  losasPerdidas: z.number(),
  metrosVendibles: z.number(),
  gananciaReal: z.number(),
  estado: z.enum(['activo', 'agotado']),
})

export const updateBloqueSchema = createBloqueSchema.partial()

export const createProductoSchema = z.object({
  nombre: z.string().min(1),
  tipo: tipoProductoSchema,
  estado: estadoInventarioSchema,
  ubicacion: ubicacionInventarioSchema.optional(),
  dimension: dimensionSchema,
  origenId: z.string(),
  origenNombre: z.string(),
  cantidadLosas: z.number(),
  metrosCuadrados: z.number(),
  precioM2: z.number(),
  imagen: z.string(),
})

export const updateProductoSchema = createProductoSchema.partial()

export const createCatalogoItemSchema = z.object({
  nombre: z.string().min(1),
  tipo: tipoProductoSchema,
  acabado: estadoCatalogoSchema,
  dimension: dimensionSchema,
  precioM2: z.number().nonnegative(),
  stockLosas: z.number().int().nonnegative(),
  destacado: z.boolean(),
  descripcion: z.string(),
  imagen: z.string(),
  visible: z.boolean().optional(),
})

export const updateCatalogoItemSchema = createCatalogoItemSchema.partial()

export const createTrabajadorSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  telefono: z.string(),
  rol: rolTrabajadorSchema,
  fechaIngreso: z.string(),
  estado: z.enum(['activo', 'inactivo']),
  usuario: z.string().optional(),
  contrasena: z.string().optional(),
  tarifasPersonalizadas: tarifasTrabajadorSchema.nullable(),
  losasProducidas: z.number(),
  pagosTotales: z.number(),
  bonosTotales: z.number(),
  acumuladoPendiente: z.number(),
})

export const updateTrabajadorSchema = createTrabajadorSchema.partial()

export const createEquipoSchema = z.object({
  nombre: z.string().min(1),
  tipo: tipoEquipoSchema,
  codigoInterno: z.string(),
  estado: z.enum(['activo', 'mantenimiento', 'inactivo']),
  notas: z.string(),
})

export const updateEquipoSchema = createEquipoSchema.partial()

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  workshopId: z.string().min(1).optional(),
})

export const createWorkshopSchema = z.object({
  nombre: z.string().min(1),
  ciudad: z.string().min(1),
  direccion: z.string(),
  encargado: z.string(),
  telefono: z.string(),
  correo: z.string().email(),
})

export const updateWorkshopSchema = z.object({
  nombre: z.string().min(1).optional(),
  ciudad: z.string().optional(),
  direccion: z.string().optional(),
  encargado: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().email().optional(),
  estado: z.enum(['activo', 'en-implementacion', 'pausado']).optional(),
  empleados: z.number().optional(),
  capacidadM2Mes: z.number().optional(),
  ventasMes: z.number().optional(),
  produccionMesM2: z.number().optional(),
  margenOperativo: z.number().optional(),
  ordenesActivas: z.number().optional(),
  ultimaActualizacion: z.string().optional(),
})

const permissionCodeSchema = z.string().min(3)

export const createPermissionGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionCodes: z.array(permissionCodeSchema).min(1),
})

export const updatePermissionGroupSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    permissionCodes: z.array(permissionCodeSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.permissionCodes !== undefined,
    {
      message: 'At least one field must be provided',
    },
  )

export const updateUserAccessSchema = z.object({
  permissionGroupIds: z.array(z.string().min(1)).default([]),
  directPermissionCodes: z.array(permissionCodeSchema).default([]),
})

export const createMermaSchema = z.object({
  fecha: z.string(),
  origenId: z.string(),
  origenNombre: z.string(),
  tipo: tipoProductoSchema,
  dimension: dimensionSchema,
  cantidadLosas: z.number(),
  metrosCuadrados: z.number(),
  motivo: motivoMermaSchema,
  observaciones: z.string(),
})

export const updateMermaSchema = createMermaSchema.partial()

export const createVentaSchema = z.object({
  productoId: z.string(),
  productoNombre: z.string(),
  detallesProductos: z
    .array(
      z.object({
        productoId: z.string(),
        productoNombre: z.string(),
        origenId: z.string(),
        origenNombre: z.string(),
        dimension: dimensionSchema,
        estado: estadoInventarioSchema,
        metrosCuadrados: z.number().positive(),
        precioM2: z.number().nonnegative(),
        subtotal: z.number().nonnegative(),
      }),
    )
    .optional(),
  cantidadM2: z.number(),
  metrosPorDimension: z.object({
    '40x40': z.number(),
    '60x40': z.number(),
    '80x40': z.number(),
  }),
  precioM2: z.number(),
  descuento: z.number(),
  fondoOperativo: z.number(),
  subtotal: z.number(),
  total: z.number(),
  clienteNombre: z.string(),
  clienteEmail: z.string().email(),
  clienteTelefono: z.string(),
  fecha: z.string(),
  estado: z.enum(['pendiente', 'completada', 'cancelada', 'pendiente_aprobacion_almacen']),
  motivoMovimientoAlmacen: z.string().min(5),
})

export const updateVentaSchema = createVentaSchema.partial()

export const createGastoSchema = z.object({
  fecha: z.string(),
  costo: z.number().positive(),
  tipo: gastoTipoSchema,
  flujo: gastoFlujoSchema,
  descripcion: z.string().min(6),
  encargado: z.string().min(1),
})

export const updateGastoSchema = createGastoSchema.partial()

export const createLogSchema = z.object({
  fecha: z.string(),
  usuario: z.string(),
  accion: z.string(),
  modulo: z.string(),
  descripcion: z.string(),
  nivel: z.enum(['info', 'alerta', 'error']),
})

export const updateConfiguracionSchema = z.object({
  tarifasGlobales: z.record(accionLosaSchema, z.number()).optional(),
  salariosFijosPorRol: z.record(z.string(), z.number()).optional(),
  preciosM2: z.record(dimensionSchema, z.object({ crudo: z.number(), pulido: z.number() })).optional(),
  nombreEmpresa: z.string().optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  notificacionesEmail: z.boolean().optional(),
  alertasStockBajo: z.boolean().optional(),
  reportesVentas: z.boolean().optional(),
})

// ----- ProducciÃ³n diaria -----
const produccionDetalleAccionSchema = z.object({
  accion: accionLosaSchema,
  trabajadorId: z.string().optional(),
  trabajadorNombre: z.string().optional(),
  trabajadores: z
    .array(
      z.object({
        id: z.string(),
        nombre: z.string(),
      }),
    )
    .optional(),
  equipoId: z.string(),
  equipoNombre: z.string(),
  cantidadLosas: z.number(),
  metrosCuadrados: z.number(),
  losasMermaTotal: z.number().optional(),
  metrosMermaTotal: z.number().optional(),
  losasReutilizables: z.number().optional(),
  metrosReutilizables: z.number().optional(),
  cantidadResina: z.number().optional(),
})

export const createProduccionSchema = z.object({
  fecha: z.string(),
  origenId: z.string(),
  origenNombre: z.string(),
  tipo: tipoProductoSchema,
  dimension: dimensionSchema,
  cantidadPicar: z.number(),
  cantidadEscuadrar: z.number(),
  cantidadDevastar: z.number(),
  cantidadResinar: z.number(),
  cantidadPulir: z.number(),
  totalLosas: z.number(),
  totalM2: z.number(),
  detallesAcciones: z.array(produccionDetalleAccionSchema).optional(),
})

export const approveProduccionTallerSchema = z
  .object({
    aprobado: z.boolean(),
    motivoRechazo: z.string().min(5).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.aprobado && !value.motivoRechazo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe indicar un motivo al rechazar el registro de taller.',
        path: ['motivoRechazo'],
      })
    }
  })

export const approveProduccionAlmacenSchema = z.object({
  motivo: z.string().min(5),
})

export const updateProduccionSchema = createProduccionSchema
  .extend({
    canEdit: z.boolean().optional(),
    editableUntil: z.string().optional(),
  })
  .partial()

// ----- ProducciÃ³n por trabajador -----
export const createProduccionTrabajadorSchema = z.object({
  fecha: z.string(),
  trabajadorId: z.string(),
  trabajadorNombre: z.string(),
  accion: accionLosaSchema,
  origenId: z.string(),
  origenNombre: z.string(),
  tipo: tipoProductoSchema,
  dimension: dimensionSchema,
  cantidadLosas: z.number(),
  pagoPorLosa: z.number(),
  pagoTotal: z.number(),
  bono: z.number(),
  pagoFinal: z.number(),
  pagado: z.boolean(),
})

export const updateProduccionTrabajadorSchema = createProduccionTrabajadorSchema.partial()

export const approveInventarioMovimientoSchema = z.object({
  observaciones: z.string().optional(),
})

export const rejectInventarioMovimientoSchema = z.object({
  motivoRechazo: z.string().min(5),
})

export const createSalidaProcesoInventarioSchema = z.object({
  accionObjetivo: z.enum(['escuadrar', 'devastar', 'resinar', 'pulir']),
  productoId: z.string().min(1),
  cantidadLosas: z.number().int().positive(),
  motivo: z.string().min(5),
})

export const createRetornoProcesoInventarioSchema = z.object({
  productoId: z.string().min(1),
  cantidadLosas: z.number().int().positive(),
  motivo: z.string().min(5),
})

// ----- Historial de pagos -----
export const createHistorialPagoSchema = z.object({
  trabajadorId: z.string(),
  trabajadorNombre: z.string(),
  fecha: z.string(),
  produccionIds: z.array(z.string()),
  montoAcciones: z.number(),
  montoBonos: z.number(),
  bonoExtra: z.number(),
  motivoBonoExtra: z.string(),
  totalPagado: z.number(),
  observaciones: z.string(),
})

export const updateHistorialPagoSchema = createHistorialPagoSchema.partial()

export type CreateBloqueInput = z.infer<typeof createBloqueSchema>
export type UpdateBloqueInput = z.infer<typeof updateBloqueSchema>
export type LoginInput = z.infer<typeof loginSchema>

