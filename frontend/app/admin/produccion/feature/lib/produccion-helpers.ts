import { losasAMetros, type AccionLosa, type ProduccionDetalleAccion, type ProduccionDiaria } from '@/lib/types'
import type {
  ActionFormState,
  ActionUsageDimensionForm,
  ActionUsageForm,
  DateEditPolicy,
  FormData,
  UpdateUsageDimensionNumericInputParams,
} from '../model/types'

export const actionOrder: AccionLosa[] = ['picar', 'escuadrar', 'devastar', 'resinar', 'pulir']

export const actionLabels: Record<AccionLosa, string> = {
  picar: 'Picar',
  escuadrar: 'Escuadrar',
  devastar: 'Devastar',
  resinar: 'Resinar',
  pulir: 'Pulir',
}

export const actionColors: Record<AccionLosa, string> = {
  picar: 'bg-blue-100 text-blue-800',
  escuadrar: 'bg-amber-100 text-amber-800',
  devastar: 'bg-violet-100 text-violet-800',
  resinar: 'bg-cyan-100 text-cyan-800',
  pulir: 'bg-green-100 text-green-800',
}

export const createUsageDimensionRow = (
  dimension: ActionUsageDimensionForm['dimension'],
): ActionUsageDimensionForm => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  dimension,
  cantidadLosas: 0,
  cantidadTouched: false,
  mermaTotalLosas: 0,
  mermaTotalTouched: false,
  reutilizableLosas: 0,
  reutilizableTouched: false,
  cantidadResina: 0,
  resinaTouched: false,
})

export const createUsageRow = (): ActionUsageForm => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  origenId: '',
  tipo: '',
  trabajadorIds: [],
  equipoId: '',
  dimensiones: [],
})

export const createActionState = (): ActionFormState => ({
  cantidadLosas: 0,
  cantidadTouched: false,
  usos: [createUsageRow()],
})

export const createInitialFormData = (): FormData => ({
  fecha: new Date().toISOString().split('T')[0],
  accionActiva: '',
  acciones: {
    picar: createActionState(),
    escuadrar: createActionState(),
    devastar: createActionState(),
    resinar: createActionState(),
    pulir: createActionState(),
  },
})

export const resolveDateEditPolicy = (
  registros: ProduccionDiaria[],
  fecha: string,
): DateEditPolicy => {
  const registrosFecha = registros.filter((registro) => registro.fecha === fecha)

  if (registrosFecha.length === 0) {
    return {
      hasRecords: false,
      canMutate: true,
      message: 'Fecha sin registros previos. Puedes registrar produccion.',
    }
  }

  const hasApiEditMetadata = registrosFecha.some(
    (registro) =>
      typeof registro.canEdit === 'boolean' ||
      (typeof registro.editableUntil === 'string' && registro.editableUntil.length > 0),
  )

  if (!hasApiEditMetadata) {
    return {
      hasRecords: true,
      canMutate: true,
      message:
        'Fecha ya registrada. Puedes registrar produccion adicional para esta misma fecha.',
    }
  }

  if (registrosFecha.some((registro) => registro.canEdit === true)) {
    return {
      hasRecords: true,
      canMutate: true,
      message: 'Fecha registrada y editable segun API.',
    }
  }

  const editTimestamps = registrosFecha
    .map((registro) => (registro.editableUntil ? Date.parse(registro.editableUntil) : Number.NaN))
    .filter((value) => Number.isFinite(value))
  const now = Date.now()
  const latestEditTimestamp = editTimestamps.length ? Math.max(...editTimestamps) : Number.NaN

  if (Number.isFinite(latestEditTimestamp) && now <= latestEditTimestamp) {
    return {
      hasRecords: true,
      canMutate: true,
      message: `Ventana de edicion activa hasta ${new Date(latestEditTimestamp).toLocaleString()}.`,
    }
  }

  return {
    hasRecords: true,
    canMutate: false,
    message: 'La ventana de edicion de 24h ya expiro para esta fecha.',
  }
}

export const buildNextProduccionId = (registros: ProduccionDiaria[]): string => {
  const maxIdNumber = registros.reduce((maxValue, registro) => {
    const numericId = Number(registro.id.replace(/\D/g, ''))
    if (!Number.isFinite(numericId)) return maxValue
    return Math.max(maxValue, numericId)
  }, 0)

  return `PG${String(maxIdNumber + 1).padStart(3, '0')}`
}

export const getLegacyAccionLosas = (registro: ProduccionDiaria, accion: AccionLosa): number => {
  if (accion === 'picar') return registro.cantidadPicar
  if (accion === 'escuadrar') return registro.cantidadEscuadrar
  if (accion === 'devastar') return registro.cantidadDevastar
  if (accion === 'resinar') return registro.cantidadResinar
  return registro.cantidadPulir
}

export const getAccionLosas = (registro: ProduccionDiaria, accion: AccionLosa): number => {
  const detalles = registro.detallesAcciones?.filter((detalle) => detalle.accion === accion) ?? []
  if (detalles.length > 0) {
    return detalles.reduce((sum, detalle) => sum + detalle.cantidadLosas, 0)
  }
  return getLegacyAccionLosas(registro, accion)
}

export const getAccionDetalles = (
  registro: ProduccionDiaria,
  accion: AccionLosa,
): ProduccionDetalleAccion[] => {
  const detalles = registro.detallesAcciones?.filter((detalle) => detalle.accion === accion) ?? []
  if (detalles.length > 0) {
    return detalles
  }

  const legacyLosas = getLegacyAccionLosas(registro, accion)
  if (legacyLosas <= 0) {
    return []
  }

  return [
    {
      id: `${registro.id}-${accion}`,
      accion,
      trabajadorId: 'legacy',
      trabajadorNombre: 'Sin detalle',
      trabajadores: [{ id: 'legacy', nombre: 'Sin detalle' }],
      equipoId: 'legacy',
      equipoNombre: 'Sin equipo',
      cantidadLosas: legacyLosas,
      metrosCuadrados: losasAMetros(legacyLosas, registro.dimension),
      losasMermaTotal: 0,
      metrosMermaTotal: 0,
      losasReutilizables: 0,
      metrosReutilizables: 0,
    },
  ]
}

export const getDetalleTrabajadores = (
  detalle: ProduccionDetalleAccion,
): Array<{ id: string; nombre: string }> => {
  if (detalle.trabajadores && detalle.trabajadores.length > 0) {
    return detalle.trabajadores
  }

  if (detalle.trabajadorId && detalle.trabajadorNombre) {
    return [{ id: detalle.trabajadorId, nombre: detalle.trabajadorNombre }]
  }

  return []
}

export const getDetalleTrabajadoresCount = (detalle: ProduccionDetalleAccion): number => {
  const count = getDetalleTrabajadores(detalle).length
  return count > 0 ? count : 1
}

export const getDetalleLosasPorTrabajador = (detalle: ProduccionDetalleAccion): number =>
  detalle.cantidadLosas / getDetalleTrabajadoresCount(detalle)

export const getDetalleMermaLosas = (detalle: ProduccionDetalleAccion): number =>
  detalle.accion === 'picar' ? 0 : (detalle.losasMermaTotal ?? 0)

export const getDetalleReutilizableLosas = (detalle: ProduccionDetalleAccion): number =>
  detalle.losasReutilizables ?? 0

export const updateUsageDimensionNumericInput = ({
  action,
  usageId,
  dimensionUsageId,
  rawValue,
  numericField,
  touchedField,
  updateUsageDimension,
}: UpdateUsageDimensionNumericInputParams): void => {
  const parsed = rawValue === '' ? 0 : Number(rawValue)
  updateUsageDimension(action, usageId, dimensionUsageId, {
    [touchedField]: rawValue !== '',
    [numericField]: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
  })
}
