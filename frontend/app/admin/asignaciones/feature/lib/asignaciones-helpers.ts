import { losasAMetros, type AccionLosa, type ProduccionDetalleAccion, type ProduccionDiaria, type Trabajador } from '@/lib/types'
import type { AccionResumen, AsignacionItem } from '../model/types'

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

export const createResumenAcciones = (): Record<AccionLosa, AccionResumen> => ({
  picar: { losas: 0, m2: 0, pago: 0 },
  escuadrar: { losas: 0, m2: 0, pago: 0 },
  devastar: { losas: 0, m2: 0, pago: 0 },
  resinar: { losas: 0, m2: 0, pago: 0 },
  pulir: { losas: 0, m2: 0, pago: 0 },
})

export const actionSortIndex = (accion: AccionLosa): number => actionOrder.indexOf(accion)

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

export const getTarifaPorTrabajador = (
  accion: AccionLosa,
  trabajadorId: string,
  tarifasGlobales: Record<AccionLosa, number>,
  trabajadoresPorId: Map<string, Trabajador>,
): number => {
  const trabajador = trabajadoresPorId.get(trabajadorId)
  return trabajador?.tarifasPersonalizadas?.[accion] ?? tarifasGlobales[accion]
}

export const buildAsignacionesFromProduccion = (
  registros: ProduccionDiaria[],
  tarifasGlobales: Record<AccionLosa, number>,
  trabajadoresPorId: Map<string, Trabajador>,
  codigosEquipoPorId: Map<string, string>,
): AsignacionItem[] => {
  const items: AsignacionItem[] = []

  registros.forEach((registro) => {
    const detalles = registro.detallesAcciones ?? []

    if (detalles.length > 0) {
      detalles.forEach((detalle) => {
        const trabajadoresDetalle = getDetalleTrabajadores(detalle)
        const integrantesEquipo = Math.max(trabajadoresDetalle.length, 1)
        const losasEquipo = detalle.cantidadLosas
        const codigoEquipo = resolveEquipoCodigo(
          detalle.equipoId,
          detalle.equipoNombre,
          codigosEquipoPorId,
        )
        const m2Equipo =
          detalle.metrosCuadrados > 0
            ? detalle.metrosCuadrados
            : losasAMetros(detalle.cantidadLosas, registro.dimension)
        const mermaLosas = Math.max(0, detalle.losasMermaTotal ?? 0)
        const losasPagablesEquipo = Math.max(0, detalle.cantidadLosas - mermaLosas)

        if (trabajadoresDetalle.length === 0) {
          const tarifaFallback = tarifasGlobales[detalle.accion]
          const pagoFallback = losasPagablesEquipo * tarifaFallback
          items.push({
            id: `${registro.id}-${detalle.id}-sin-asignar`,
            fecha: registro.fecha,
            trabajadorId: 'sin-asignar',
            trabajadorNombre: 'Sin personal',
            origenId: registro.origenId,
            origenNombre: registro.origenNombre,
            tipo: registro.tipo,
            dimension: registro.dimension,
            accion: detalle.accion,
            equipoId: detalle.equipoId,
            equipoNombre: codigoEquipo,
            integrantesEquipo,
            losasEquipo,
            m2Equipo,
            cantidadLosas: losasEquipo,
            totalM2: m2Equipo,
            losasPagables: losasPagablesEquipo,
            tarifaAplicada: tarifaFallback,
            pagoEstimado: pagoFallback,
          })
          return
        }

        const losasPorTrabajador = losasEquipo / integrantesEquipo
        const m2PorTrabajador = m2Equipo / integrantesEquipo
        const losasPagablesPorTrabajador = losasPagablesEquipo / integrantesEquipo

        trabajadoresDetalle.forEach((trabajador) => {
          const tarifa = getTarifaPorTrabajador(
            detalle.accion,
            trabajador.id,
            tarifasGlobales,
            trabajadoresPorId,
          )
          const pagoEstimado = losasPagablesPorTrabajador * tarifa

          items.push({
            id: `${registro.id}-${detalle.id}-${trabajador.id}`,
            fecha: registro.fecha,
            trabajadorId: trabajador.id,
            trabajadorNombre: trabajador.nombre,
            origenId: registro.origenId,
            origenNombre: registro.origenNombre,
            tipo: registro.tipo,
            dimension: registro.dimension,
            accion: detalle.accion,
            equipoId: detalle.equipoId,
            equipoNombre: codigoEquipo,
            integrantesEquipo,
            losasEquipo,
            m2Equipo,
            cantidadLosas: losasPorTrabajador,
            totalM2: m2PorTrabajador,
            losasPagables: losasPagablesPorTrabajador,
            tarifaAplicada: tarifa,
            pagoEstimado,
          })
        })
      })
      return
    }

    const legacyActions: Array<{ accion: AccionLosa; cantidad: number }> = [
      { accion: 'picar', cantidad: registro.cantidadPicar },
      { accion: 'escuadrar', cantidad: registro.cantidadEscuadrar },
      { accion: 'devastar', cantidad: registro.cantidadDevastar },
      { accion: 'resinar', cantidad: registro.cantidadResinar },
      { accion: 'pulir', cantidad: registro.cantidadPulir },
    ]

    legacyActions
      .filter((entry) => entry.cantidad > 0)
      .forEach((entry) => {
        const tarifa = tarifasGlobales[entry.accion]
        const totalM2 = losasAMetros(entry.cantidad, registro.dimension)

        items.push({
          id: `${registro.id}-${entry.accion}-legacy`,
          fecha: registro.fecha,
          trabajadorId: 'sin-asignar',
          trabajadorNombre: 'Sin detalle',
          origenId: registro.origenId,
          origenNombre: registro.origenNombre,
          tipo: registro.tipo,
          dimension: registro.dimension,
          accion: entry.accion,
          equipoId: 'sin-equipo',
          equipoNombre: 'SIN-EQUIPO',
          integrantesEquipo: 1,
          losasEquipo: entry.cantidad,
          m2Equipo: totalM2,
          cantidadLosas: entry.cantidad,
          totalM2,
          losasPagables: entry.cantidad,
          tarifaAplicada: tarifa,
          pagoEstimado: entry.cantidad * tarifa,
        })
      })
  })

  return items.sort((a, b) => {
    const dateDiff = b.fecha.localeCompare(a.fecha)
    if (dateDiff !== 0) return dateDiff

    const workerDiff = a.trabajadorNombre.localeCompare(b.trabajadorNombre)
    if (workerDiff !== 0) return workerDiff

    return actionSortIndex(a.accion) - actionSortIndex(b.accion)
  })
}

function resolveEquipoCodigo(
  equipoId: string,
  equipoNombre: string,
  codigosEquipoPorId: Map<string, string>,
): string {
  if (!equipoId || equipoId === 'EQUIPO-N/A' || equipoId === 'sin-equipo' || equipoId === 'legacy') {
    return 'SIN-EQUIPO'
  }

  const codigo = codigosEquipoPorId.get(equipoId.trim())
  if (codigo) return codigo

  const fallback = equipoNombre.trim()
  if (!fallback) return 'SIN-EQUIPO'
  return fallback
}

export const formatLosas = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })

export const formatMoney = (value: number): string =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
