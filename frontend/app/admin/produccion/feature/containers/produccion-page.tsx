'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import {
  createRetornoProcesoInventario,
  createRetornoProcesoMasaInventario,
} from '@/lib/resources-api'
import { Search } from 'lucide-react'
import {
  getMonoHiloLosasDisponibles,
  getMonoHiloTotalLosasDisponibles,
  losasAMetros,
  type MonoHiloMasa,
  type ProduccionDetalleAccion,
  type ProduccionDiaria,
  type Producto,
} from '@/lib/types'
import { useProduccionPageState } from '../hooks/use-produccion-page-state'
import { ProduccionCreateDialog } from '../components/create-dialog/produccion-create-dialog'
import { ProduccionRightPanel } from '../components/produccion-right-panel'
import { ProduccionRegistrosList } from '../components/produccion-registros-list'
import {
  canDeleteProduccionEntrada,
  canEditProduccionEntrada,
  getDetalleTrabajadores,
} from '../lib/produccion-helpers'

const estadoSiguienteProceso: Partial<Record<Producto['estado'], Producto['estado']>> = {
  Picado: 'Escuadrado',
  Escuadrado: 'Devastado',
  Devastado: 'Resinado',
  Resinado: 'Pulido',
}

function resolveEstadoRetornoObjetivo(estadoActual: Producto['estado']): Producto['estado'] {
  return estadoSiguienteProceso[estadoActual] ?? estadoActual
}

function getMonoHiloRetornoDisponibleTotal(masa: MonoHiloMasa): number {
  return getMonoHiloTotalLosasDisponibles(masa)
}

function buildMonoHiloRetornoResumen(masa: MonoHiloMasa): string {
  return Object.entries(masa.estimados)
    .map(([dimension, estimado]) => ({
      dimension,
      disponibles: getMonoHiloLosasDisponibles(masa, dimension),
      estimadas: estimado.losasEstimadas,
    }))
    .filter((item) => item.estimadas > 0 || item.disponibles > 0)
    .map((item) => `${item.dimension}: ${item.disponibles}`)
    .join(' | ')
}

type RetornoProcesoTipo = 'producto' | 'masa'


export default function ProduccionPage() {
  const {
    addUsage,
    cancelMonoHiloProduccionRegistro,
    dependenciesError,
    deleteProduccionRegistro,
    dateEditPolicy,
    dateFilter,
    equiposActivos,
    entryActionError,
    entryDeleteLoadingById,
    entryUpdateLoadingById,
    fechaResumen,
    fechasOrdenadas,
    formData,
    formError,
    getLosasDisponiblesParaAccion,
    groupedByDate,
    handleSubmit,
    isDialogOpen,
    loadingDependencies,
    bloquesActivosMonoHilo,
    monoHiloMasas,
    origenesActivosByAccion,
    picarUsageOptions,
    registrarMonoHiloDesdeProduccion,
    usageComboOptionsByAccion,
    origenesActivosResumen,
    prepareNewForm,
    removeUsage,
    resetFormAndClose,
    resumenAcciones,
    resumenPartidas,
    searchTerm,
    setDateFilter,
    setEntryActionError,
    setFormData,
    setIsDialogOpen,
    setSearchTerm,
    stockProcesoDisponible,
    topOrigenesResumen,
    today,
    totalLosasResumen,
    totalMonoHiloResumen,
    totalM2Resumen,
    toggleUsageDimension,
    trabajadoresActivos,
    updateProduccionRegistro,
    resolveEquipoCodigo,
    resolveOrigenCodigo,
    updateUsage,
    updateUsageDimension,
  } = useProduccionPageState()

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [retornoDialogOpen, setRetornoDialogOpen] = useState(false)
  const [retornoTipo, setRetornoTipo] = useState<RetornoProcesoTipo>('producto')
  const [retornoProductoId, setRetornoProductoId] = useState('')
  const [retornoMasaId, setRetornoMasaId] = useState('')
  const [retornoCantidadLosas, setRetornoCantidadLosas] = useState(0)
  const [retornoCantidadTouched, setRetornoCantidadTouched] = useState(false)
  const [retornoMotivo, setRetornoMotivo] = useState('')
  const [retornoDialogError, setRetornoDialogError] = useState<string | null>(null)
  const [retornoDialogSubmitting, setRetornoDialogSubmitting] = useState(false)
  const [retornoNotice, setRetornoNotice] = useState<string | null>(null)
  const [entryEditDialogOpen, setEntryEditDialogOpen] = useState(false)
  const [entryDeleteDialogOpen, setEntryDeleteDialogOpen] = useState(false)
  const [entryEditTarget, setEntryEditTarget] = useState<ProduccionDiaria | null>(null)
  const [entryDeleteTarget, setEntryDeleteTarget] = useState<ProduccionDiaria | null>(null)
  const [monoHiloCancelDialogOpen, setMonoHiloCancelDialogOpen] = useState(false)
  const [monoHiloCancelTarget, setMonoHiloCancelTarget] = useState<ProduccionDiaria | null>(null)
  const [monoHiloCancelMotivo, setMonoHiloCancelMotivo] = useState('')
  const [monoHiloCancelError, setMonoHiloCancelError] = useState<string | null>(null)
  const [entryEditLosas, setEntryEditLosas] = useState(0)
  const [entryEditLosasTouched, setEntryEditLosasTouched] = useState(false)
  const [entryEditEquipoId, setEntryEditEquipoId] = useState('')
  const [entryEditTrabajadorIds, setEntryEditTrabajadorIds] = useState<string[]>([])
  const [entryEditLocalError, setEntryEditLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return
    try {
      setCurrentUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    }
  }, [])

  const canSolicitarRetornoProceso = currentUser
    ? hasPermission(currentUser, 'inventario:write')
    : false
  const canWriteProduccion = currentUser
    ? hasPermission(currentUser, 'produccion:write')
    : false

  const productosProcesoParaRetorno = useMemo(
    () => [...stockProcesoDisponible].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [stockProcesoDisponible],
  )
  const retornoProductoSeleccionado = useMemo(
    () =>
      productosProcesoParaRetorno.find((producto) => producto.id === retornoProductoId) ?? null,
    [productosProcesoParaRetorno, retornoProductoId],
  )
  const masasProcesoParaRetorno = useMemo(
    () =>
      monoHiloMasas
        .filter((masa) => masa.estado !== 'anulada')
        .filter((masa) => masa.ubicacion === 'proceso')
        .filter((masa) => getMonoHiloRetornoDisponibleTotal(masa) > 0)
        .sort(
          (a, b) =>
            b.fechaRegistro.localeCompare(a.fechaRegistro) || b.codigo.localeCompare(a.codigo),
        ),
    [monoHiloMasas],
  )
  const retornoMasaSeleccionada = useMemo(
    () => masasProcesoParaRetorno.find((masa) => masa.id === retornoMasaId) ?? null,
    [masasProcesoParaRetorno, retornoMasaId],
  )
  useEffect(() => {
    if (!retornoDialogOpen || retornoTipo !== 'producto') return
    if (retornoProductoId && productosProcesoParaRetorno.some((producto) => producto.id === retornoProductoId)) {
      return
    }
    setRetornoProductoId(productosProcesoParaRetorno[0]?.id ?? '')
  }, [productosProcesoParaRetorno, retornoDialogOpen, retornoProductoId, retornoTipo])

  useEffect(() => {
    if (!retornoDialogOpen || retornoTipo !== 'masa') return
    if (retornoMasaId && masasProcesoParaRetorno.some((masa) => masa.id === retornoMasaId)) {
      return
    }
    setRetornoMasaId(masasProcesoParaRetorno[0]?.id ?? '')
  }, [masasProcesoParaRetorno, retornoDialogOpen, retornoMasaId, retornoTipo])

  const equiposPicarActivos = useMemo(
    () => equiposActivos.filter((equipo) => equipo.tipo === 'Cortadora'),
    [equiposActivos],
  )
  const trabajadoresActivosById = useMemo(
    () => new Map(trabajadoresActivos.map((trabajador) => [trabajador.id, trabajador])),
    [trabajadoresActivos],
  )
  const selectedTrabajadoresLabel = useMemo(() => {
    if (entryEditTrabajadorIds.length === 0) return 'Seleccionar personal'
    const nombres = entryEditTrabajadorIds
      .map((trabajadorId) => trabajadoresActivosById.get(trabajadorId)?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre))
    if (nombres.length === 0) return 'Seleccionar personal'
    if (nombres.length <= 2) return nombres.join(', ')
    return `${nombres[0]}, ${nombres[1]} +${nombres.length - 2}`
  }, [entryEditTrabajadorIds, trabajadoresActivosById])

  const openRetornoDialog = () => {
    if (!canSolicitarRetornoProceso) return
    setRetornoDialogError(null)
    setRetornoTipo(productosProcesoParaRetorno.length > 0 ? 'producto' : 'masa')
    setRetornoProductoId('')
    setRetornoMasaId('')
    setRetornoCantidadLosas(0)
    setRetornoCantidadTouched(false)
    setRetornoMotivo('')
    setRetornoDialogOpen(true)
  }

  const closeRetornoDialog = () => {
    if (retornoDialogSubmitting) return
    setRetornoDialogOpen(false)
    setRetornoDialogError(null)
  }

  const confirmRetornoProceso = async () => {
    if (retornoTipo === 'masa') {
      if (!retornoMasaSeleccionada) {
        setRetornoDialogError('Selecciona una masa en proceso para solicitar su entrada a almacen.')
        return
      }

      const motivo = retornoMotivo.trim()
      if (motivo.length < 5) {
        setRetornoDialogError('El motivo debe tener al menos 5 caracteres.')
        return
      }

      setRetornoDialogError(null)
      setRetornoDialogSubmitting(true)
      try {
        const movimiento = await createRetornoProcesoMasaInventario({
          masaId: retornoMasaSeleccionada.id,
          motivo,
        })
        setRetornoNotice(
          `Solicitud ${movimiento.id} enviada para la masa ${retornoMasaSeleccionada.codigo}.`,
        )
        setRetornoDialogOpen(false)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo registrar la solicitud de entrada para la masa.'
        setRetornoDialogError(message)
      } finally {
        setRetornoDialogSubmitting(false)
      }
      return
    }

    if (!retornoProductoSeleccionado) {
      setRetornoDialogError('Selecciona un producto de proceso para retornar a almacen.')
      return
    }

    const cantidadLosas = Math.trunc(retornoCantidadLosas)
    if (!Number.isInteger(cantidadLosas) || cantidadLosas <= 0) {
      setRetornoDialogError('La cantidad de losas debe ser entera y mayor a 0.')
      return
    }

    if (cantidadLosas > retornoProductoSeleccionado.cantidadLosas) {
      setRetornoDialogError(
        `La cantidad solicitada excede el stock disponible (${retornoProductoSeleccionado.cantidadLosas} losas).`,
      )
      return
    }

    const motivo = retornoMotivo.trim()
    if (motivo.length < 5) {
      setRetornoDialogError('El motivo debe tener al menos 5 caracteres.')
      return
    }

    setRetornoDialogError(null)
    setRetornoDialogSubmitting(true)
    try {
      const estadoObjetivo = resolveEstadoRetornoObjetivo(retornoProductoSeleccionado.estado)
      const movimiento = await createRetornoProcesoInventario({
        productoId: retornoProductoSeleccionado.id,
        cantidadLosas,
        motivo,
        estadoObjetivo,
      })
      setRetornoNotice(
        `Solicitud ${movimiento.id} enviada a almacen (${retornoProductoSeleccionado.estado} -> ${estadoObjetivo}).`,
      )
      setRetornoDialogOpen(false)
      setRetornoDialogError(null)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la solicitud de retorno a almacen.'
      setRetornoDialogError(message)
    } finally {
      setRetornoDialogSubmitting(false)
    }
  }

  const buildUpdatedPicarDetalles = (
    registro: ProduccionDiaria,
    nuevaCantidadPicar: number,
    equipoSeleccionado: { id: string; codigoInterno: string },
    trabajadoresSeleccionados: Array<{ id: string; nombre: string }>,
  ): ProduccionDetalleAccion[] | undefined => {
    const trabajadoresPayload = trabajadoresSeleccionados.map((trabajador) => ({
      id: trabajador.id,
      nombre: trabajador.nombre,
    }))
    const trabajadorPrincipal = trabajadoresPayload[0]
    const crearDetallePicarBase = (): ProduccionDetalleAccion => ({
      id: `PGA-${registro.id}-picar-edit`,
      accion: 'picar',
      trabajadorId: trabajadorPrincipal?.id,
      trabajadorNombre: trabajadorPrincipal?.nombre,
      trabajadores: trabajadoresPayload,
      equipoId: equipoSeleccionado.id,
      equipoNombre: equipoSeleccionado.codigoInterno,
      cantidadLosas: nuevaCantidadPicar,
      metrosCuadrados: losasAMetros(nuevaCantidadPicar, registro.dimension),
      losasMermaTotal: 0,
      metrosMermaTotal: 0,
      losasReutilizables: 0,
      metrosReutilizables: 0,
    })

    const detalles = registro.detallesAcciones
    if (!detalles || detalles.length === 0) return [crearDetallePicarBase()]

    const picarDetalles = detalles.filter((detalle) => detalle.accion === 'picar')
    if (picarDetalles.length === 0) return [...detalles, crearDetallePicarBase()]

    const totalActual = picarDetalles.reduce((sum, detalle) => sum + detalle.cantidadLosas, 0)
    const cantidadesNuevas: number[] = []

    if (totalActual <= 0) {
      cantidadesNuevas.push(nuevaCantidadPicar)
      for (let index = 1; index < picarDetalles.length; index += 1) {
        cantidadesNuevas.push(0)
      }
    } else {
      let acumulado = 0
      picarDetalles.forEach((detalle, index) => {
        const cantidad =
          index === picarDetalles.length - 1
            ? Math.max(0, nuevaCantidadPicar - acumulado)
            : Math.max(0, Math.floor((detalle.cantidadLosas / totalActual) * nuevaCantidadPicar))
        cantidadesNuevas.push(cantidad)
        acumulado += cantidad
      })
    }

    const detallesActualizados = new Map<string, ProduccionDetalleAccion>()
    picarDetalles.forEach((detalle, index) => {
      const cantidadLosas = cantidadesNuevas[index] ?? 0
      detallesActualizados.set(detalle.id, {
        ...detalle,
        trabajadorId: trabajadorPrincipal?.id,
        trabajadorNombre: trabajadorPrincipal?.nombre,
        trabajadores: trabajadoresPayload,
        equipoId: equipoSeleccionado.id,
        equipoNombre: equipoSeleccionado.codigoInterno,
        cantidadLosas,
        metrosCuadrados: losasAMetros(cantidadLosas, registro.dimension),
      })
    })

    return detalles.map((detalle) =>
      detalle.accion === 'picar' ? (detallesActualizados.get(detalle.id) ?? detalle) : detalle,
    )
  }

  const openEntryEditDialog = (registro: ProduccionDiaria) => {
    if (!canWriteProduccion) return
    if (!canEditProduccionEntrada(registro)) return
    const detallesPicar = (registro.detallesAcciones ?? []).filter((detalle) => detalle.accion === 'picar')
    const equipoInicial =
      detallesPicar.find((detalle) => detalle.equipoId && detalle.equipoId !== 'EQUIPO-N/A')?.equipoId ?? ''
    const trabajadoresIniciales = Array.from(
      new Set(
        detallesPicar.flatMap((detalle) =>
          getDetalleTrabajadores(detalle)
            .map((trabajador) => trabajador.id)
            .filter((trabajadorId) => trabajadorId && trabajadorId !== 'legacy'),
        ),
      ),
    )
    const equipoInicialActivo = equiposPicarActivos.some((equipo) => equipo.id === equipoInicial)
      ? equipoInicial
      : ''
    const trabajadoresInicialesActivos = trabajadoresIniciales.filter((trabajadorId) =>
      trabajadoresActivosById.has(trabajadorId),
    )

    setEntryActionError(null)
    setEntryEditLocalError(null)
    setEntryEditTarget(registro)
    setEntryEditLosas(registro.cantidadPicar)
    setEntryEditLosasTouched(true)
    setEntryEditEquipoId(equipoInicialActivo)
    setEntryEditTrabajadorIds(trabajadoresInicialesActivos)
    setEntryEditDialogOpen(true)
  }

  const closeEntryEditDialog = () => {
    if (entryEditTarget && entryUpdateLoadingById[entryEditTarget.id]) return
    setEntryEditDialogOpen(false)
    setEntryEditTarget(null)
    setEntryEditLocalError(null)
    setEntryEditEquipoId('')
    setEntryEditTrabajadorIds([])
    setEntryActionError(null)
  }

  const toggleEntryEditTrabajador = (trabajadorId: string, checked: boolean) => {
    setEntryEditTrabajadorIds((prev) => {
      if (checked) {
        if (prev.includes(trabajadorId)) return prev
        return [...prev, trabajadorId]
      }
      return prev.filter((currentId) => currentId !== trabajadorId)
    })
  }

  const confirmEntryEdit = async () => {
    if (!entryEditTarget) return
    if (!canWriteProduccion) return

    const cantidadPicar = Math.trunc(entryEditLosas)
    if (!Number.isInteger(cantidadPicar) || cantidadPicar <= 0) {
      setEntryEditLocalError('La cantidad de losas debe ser entera y mayor a 0.')
      return
    }

    const equipoSeleccionado = equiposPicarActivos.find((equipo) => equipo.id === entryEditEquipoId)
    if (!equipoSeleccionado) {
      setEntryEditLocalError('Debes seleccionar un equipo.')
      return
    }

    const trabajadoresSeleccionados = [...new Set(entryEditTrabajadorIds)]
      .map((trabajadorId) => trabajadoresActivosById.get(trabajadorId))
      .filter((trabajador): trabajador is (typeof trabajadoresActivos)[number] => Boolean(trabajador))

    if (trabajadoresSeleccionados.length === 0) {
      setEntryEditLocalError('Debes seleccionar al menos un trabajador.')
      return
    }

    if (trabajadoresSeleccionados.length !== new Set(entryEditTrabajadorIds).size) {
      setEntryEditLocalError('Uno de los trabajadores seleccionados no esta activo.')
      return
    }

    setEntryEditLocalError(null)
    const otrasAcciones =
      entryEditTarget.cantidadEscuadrar +
      entryEditTarget.cantidadDevastar +
      entryEditTarget.cantidadResinar +
      entryEditTarget.cantidadPulir
    const totalLosas = cantidadPicar + otrasAcciones
    const detallesAcciones = buildUpdatedPicarDetalles(
      entryEditTarget,
      cantidadPicar,
      equipoSeleccionado,
      trabajadoresSeleccionados,
    )

    const updated = await updateProduccionRegistro(entryEditTarget.id, {
      cantidadPicar,
      totalLosas,
      totalM2: losasAMetros(totalLosas, entryEditTarget.dimension),
      detallesAcciones,
    })

    if (updated) {
      closeEntryEditDialog()
    }
  }

  const openEntryDeleteDialog = (registro: ProduccionDiaria) => {
    if (!canWriteProduccion) return
    if (!canDeleteProduccionEntrada(registro)) return
    setEntryActionError(null)
    setEntryDeleteTarget(registro)
    setEntryDeleteDialogOpen(true)
  }

  const closeEntryDeleteDialog = () => {
    if (entryDeleteTarget && entryDeleteLoadingById[entryDeleteTarget.id]) return
    setEntryDeleteDialogOpen(false)
    setEntryDeleteTarget(null)
    setEntryActionError(null)
  }

  const confirmEntryDelete = async () => {
    if (!entryDeleteTarget) return
    if (!canWriteProduccion) return
    const ok = await deleteProduccionRegistro(entryDeleteTarget.id)
    if (ok) {
      closeEntryDeleteDialog()
    }
  }

  const openMonoHiloCancelDialog = (registro: ProduccionDiaria) => {
    if (!canWriteProduccion) return
    setEntryActionError(null)
    setMonoHiloCancelError(null)
    setMonoHiloCancelMotivo('')
    setMonoHiloCancelTarget(registro)
    setMonoHiloCancelDialogOpen(true)
  }

  const closeMonoHiloCancelDialog = () => {
    if (monoHiloCancelTarget && entryDeleteLoadingById[monoHiloCancelTarget.id]) return
    setMonoHiloCancelDialogOpen(false)
    setMonoHiloCancelTarget(null)
    setMonoHiloCancelMotivo('')
    setMonoHiloCancelError(null)
    setEntryActionError(null)
  }

  const confirmMonoHiloCancel = async () => {
    if (!monoHiloCancelTarget) return
    if (!canWriteProduccion) return

    const motivo = monoHiloCancelMotivo.trim()
    if (motivo.length < 5) {
      setMonoHiloCancelError('El motivo debe tener al menos 5 caracteres.')
      return
    }

    setMonoHiloCancelError(null)
    const ok = await cancelMonoHiloProduccionRegistro(monoHiloCancelTarget.id, motivo)
    if (ok) {
      closeMonoHiloCancelDialog()
    }
  }

  const entryEditSubmitting = entryEditTarget ? Boolean(entryUpdateLoadingById[entryEditTarget.id]) : false
  const entryDeleteSubmitting = entryDeleteTarget
    ? Boolean(entryDeleteLoadingById[entryDeleteTarget.id])
    : false
  const monoHiloCancelSubmitting = monoHiloCancelTarget
    ? Boolean(entryDeleteLoadingById[monoHiloCancelTarget.id])
    : false

  const rightPanel = (
    <ProduccionRightPanel
      fechaResumen={fechaResumen}
      origenesActivosResumen={origenesActivosResumen}
      resumenAcciones={resumenAcciones}
      resumenPartidas={resumenPartidas}
      topOrigenesResumen={topOrigenesResumen}
      totalLosasResumen={totalLosasResumen}
      totalMonoHiloResumen={totalMonoHiloResumen}
      totalM2Resumen={totalM2Resumen}
    />
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Produccion diaria</h1>
            {dependenciesError ? <p className="mt-2 text-sm text-destructive">{dependenciesError}</p> : null}
            {entryActionError ? <p className="mt-2 text-sm text-destructive">{entryActionError}</p> : null}
            {loadingDependencies ? (
              <p className="mt-2 text-sm text-slate-500">Cargando catalogos de produccion...</p>
            ) : null}
            {retornoNotice ? <p className="mt-2 text-sm text-emerald-700">{retornoNotice}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canSolicitarRetornoProceso ? (
              <Button type="button" variant="outline" onClick={openRetornoDialog}>
                Solicitar entrada a almacen
              </Button>
            ) : null}
            <ProduccionCreateDialog
              addUsage={addUsage}
              bloquesActivosMonoHilo={bloquesActivosMonoHilo}
              canWriteProduccion={canWriteProduccion}
              dateEditPolicy={dateEditPolicy}
              equiposActivos={equiposActivos}
              formData={formData}
              formError={formError}
              getLosasDisponiblesParaAccion={getLosasDisponiblesParaAccion}
              handleSubmit={handleSubmit}
              isDialogOpen={isDialogOpen}
              origenesActivosByAccion={origenesActivosByAccion}
              picarUsageOptions={picarUsageOptions}
              registrarMonoHiloDesdeProduccion={registrarMonoHiloDesdeProduccion}
              usageComboOptionsByAccion={usageComboOptionsByAccion}
              prepareNewForm={prepareNewForm}
              removeUsage={removeUsage}
              resetFormAndClose={resetFormAndClose}
              setFormData={setFormData}
              setIsDialogOpen={setIsDialogOpen}
              toggleUsageDimension={toggleUsageDimension}
              today={today}
              trabajadoresActivos={trabajadoresActivos}
              updateUsage={updateUsage}
              updateUsageDimension={updateUsageDimension}
            />
          </div>
        </div>

        <div className="rounded-[var(--agent-radius-panel)] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_220px_auto] sm:items-end">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fecha, origen, tipo o dimension..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Filtrar fecha</p>
              <Input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => setDateFilter('')}
                disabled={!dateFilter}
              >
                Limpiar fecha
              </Button>
            </div>
          </div>
        </div>


        <Dialog
          open={retornoDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeRetornoDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitar entrada a almacen desde proceso</DialogTitle>
              <DialogDescription>
                La solicitud queda pendiente hasta aprobacion de jefatura de almacen. Para masas se retorna el remanente completo; para losas se mantiene el siguiente estado del flujo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Tipo de retorno</Label>
                <Select
                  value={retornoTipo}
                  onValueChange={(value) => {
                    setRetornoTipo(value === 'masa' ? 'masa' : 'producto')
                    setRetornoDialogError(null)
                  }}
                  disabled={retornoDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="producto">Losas</SelectItem>
                    <SelectItem value="masa">Masas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {retornoTipo === 'masa' ? (
                <>
                  <div className="space-y-1">
                    <Label>Masa en proceso</Label>
                    <Select
                      value={retornoMasaId}
                      onValueChange={(value) => {
                        setRetornoMasaId(value)
                        if (retornoDialogError) setRetornoDialogError(null)
                      }}
                      disabled={retornoDialogSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar masa" />
                      </SelectTrigger>
                      <SelectContent>
                        {masasProcesoParaRetorno.length === 0 ? (
                          <SelectItem value="__empty__" disabled>
                            Sin masas disponibles en proceso
                          </SelectItem>
                        ) : (
                          masasProcesoParaRetorno.map((masa) => (
                            <SelectItem key={masa.id} value={masa.id}>
                              {[masa.codigo, `${getMonoHiloRetornoDisponibleTotal(masa)} losas`, masa.bloqueNombre].join(
                                ' - ',
                              )}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {retornoMasaSeleccionada ? (
                    <p className="text-xs text-slate-600">
                      Remanente estimado: {getMonoHiloRetornoDisponibleTotal(retornoMasaSeleccionada)} losas
                      {' - '}
                      {buildMonoHiloRetornoResumen(retornoMasaSeleccionada) || 'Sin resumen por dimension'}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
              <div className="space-y-1">
                <Label>Producto en proceso</Label>
                <Select
                  value={retornoProductoId}
                  onValueChange={(value) => {
                    setRetornoProductoId(value)
                    if (retornoDialogError) setRetornoDialogError(null)
                  }}
                  disabled={retornoDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productosProcesoParaRetorno.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Sin stock disponible en proceso
                      </SelectItem>
                    ) : (
                      productosProcesoParaRetorno.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {[
                            resolveOrigenCodigo(producto.origenId, producto.origenNombre),
                            producto.estado,
                            `${producto.cantidadLosas} losas`,
                          ].join(' - ')}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {retornoProductoSeleccionado ? (
                <p className="text-xs text-slate-600">
                  Disponible en proceso: {retornoProductoSeleccionado.cantidadLosas} losas (
                  {retornoProductoSeleccionado.metrosCuadrados.toFixed(2)} m2)
                  {' - Estado al retornar: '}
                  <span className="font-semibold">
                    {`${retornoProductoSeleccionado.estado} -> ${resolveEstadoRetornoObjetivo(retornoProductoSeleccionado.estado)}`}
                  </span>
                </p>
              ) : null}

              <div className="space-y-1">
                <Label>Cantidad de losas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={retornoCantidadTouched || retornoCantidadLosas > 0 ? retornoCantidadLosas : ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setRetornoCantidadTouched(value !== '')
                    setRetornoCantidadLosas(value === '' ? 0 : Math.trunc(Number(value)))
                    if (retornoDialogError) setRetornoDialogError(null)
                  }}
                  disabled={retornoDialogSubmitting}
                />
              </div>
                </>
              )}

              <div className="space-y-1">
                <Label>Motivo</Label>
                <Textarea
                  value={retornoMotivo}
                  onChange={(event) => {
                    setRetornoMotivo(event.target.value)
                    if (retornoDialogError) setRetornoDialogError(null)
                  }}
                  placeholder="Motivo de la entrada (minimo 5 caracteres)."
                  rows={3}
                  disabled={retornoDialogSubmitting}
                />
              </div>

              {retornoDialogError ? (
                <p className="text-xs text-destructive">{retornoDialogError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeRetornoDialog}
                disabled={retornoDialogSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmRetornoProceso()
                }}
                disabled={
                  retornoDialogSubmitting ||
                  (retornoTipo === 'masa'
                    ? !retornoMasaSeleccionada
                    : !retornoProductoSeleccionado || retornoCantidadLosas <= 0)
                }
              >
                {retornoDialogSubmitting ? 'Guardando...' : 'Solicitar entrada'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={entryEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeEntryEditDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar entrada de produccion</DialogTitle>
              <DialogDescription>
                Esta edicion aplica solo a la entrada seleccionada, no al dia completo.
              </DialogDescription>
            </DialogHeader>

            {entryEditTarget ? (
              <div className="space-y-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p>
                    Bloque/Lote:{' '}
                    <span className="font-semibold">
                      {resolveOrigenCodigo(entryEditTarget.origenId, entryEditTarget.origenNombre)}
                    </span>
                  </p>
                  <p>
                    Tipo:{' '}
                    <span className="font-semibold">
                      {entryEditTarget.tipo === 'Plancha'
                        ? entryEditTarget.tipo
                        : `${entryEditTarget.tipo} / ${entryEditTarget.dimension}`}
                    </span>
                  </p>
                  <p>
                    Fecha: <span className="font-semibold">{entryEditTarget.fecha}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <Label>Equipo</Label>
                  <Select
                    value={entryEditEquipoId}
                    onValueChange={(value) => {
                      setEntryEditEquipoId(value)
                      if (entryEditLocalError) setEntryEditLocalError(null)
                      if (entryActionError) setEntryActionError(null)
                    }}
                    disabled={entryEditSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar codigo" />
                    </SelectTrigger>
                    <SelectContent>
                      {equiposPicarActivos.length === 0 ? (
                        <SelectItem value="__sin-equipos__" disabled>
                          Sin equipos activos
                        </SelectItem>
                      ) : (
                        equiposPicarActivos.map((equipo) => (
                          <SelectItem key={equipo.id} value={equipo.id}>
                            {equipo.codigoInterno}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Personal</Label>
                  <div className="space-y-1 rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-xs text-slate-500">{selectedTrabajadoresLabel}</p>
                    <div className="max-h-36 space-y-1 overflow-y-auto">
                      {trabajadoresActivos.map((trabajador) => {
                        const checked = entryEditTrabajadorIds.includes(trabajador.id)
                        return (
                          <label
                            key={trabajador.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                toggleEntryEditTrabajador(trabajador.id, value === true)
                                if (entryEditLocalError) setEntryEditLocalError(null)
                                if (entryActionError) setEntryActionError(null)
                              }}
                              disabled={entryEditSubmitting}
                            />
                            <span>{trabajador.nombre}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Losas picadas</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={entryEditLosasTouched || entryEditLosas > 0 ? entryEditLosas : ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setEntryEditLosasTouched(value !== '')
                      setEntryEditLosas(value === '' ? 0 : Math.trunc(Number(value)))
                      if (entryEditLocalError) setEntryEditLocalError(null)
                      if (entryActionError) setEntryActionError(null)
                    }}
                    disabled={entryEditSubmitting}
                  />
                </div>

                {entryEditLocalError || entryActionError ? (
                  <p className="text-xs text-destructive">{entryEditLocalError ?? entryActionError}</p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEntryEditDialog}
                disabled={entryEditSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmEntryEdit()
                }}
                disabled={!entryEditTarget || entryEditSubmitting}
              >
                {entryEditSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={entryDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeEntryDeleteDialog()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar entrada de produccion</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion elimina solo la entrada seleccionada y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {entryDeleteTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Bloque/Lote:{' '}
                  <span className="font-semibold">
                    {resolveOrigenCodigo(entryDeleteTarget.origenId, entryDeleteTarget.origenNombre)}
                  </span>
                </p>
                <p>
                  Total entrada:{' '}
                  <span className="font-semibold">
                    {entryDeleteTarget.totalLosas} losas / {entryDeleteTarget.totalM2.toFixed(2)} mÂ²
                  </span>
                </p>
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={entryDeleteSubmitting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700"
                disabled={!entryDeleteTarget || entryDeleteSubmitting}
                onClick={(event) => {
                  event.preventDefault()
                  void confirmEntryDelete()
                }}
              >
                {entryDeleteSubmitting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={monoHiloCancelDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeMonoHiloCancelDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Anular registro de mono hilo</DialogTitle>
              <DialogDescription>
                La anulacion conserva la auditoria, marca la masa como anulada y la saca del flujo operativo.
              </DialogDescription>
            </DialogHeader>

            {monoHiloCancelTarget ? (
              <div className="space-y-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p>
                    Bloque:{' '}
                    <span className="font-semibold">
                      {resolveOrigenCodigo(monoHiloCancelTarget.origenId, monoHiloCancelTarget.origenNombre)}
                    </span>
                  </p>
                  <p>
                    Masas:{' '}
                    <span className="font-semibold">
                      {monoHiloCancelTarget.monoHiloDetalle?.masas.map((masa) => masa.masaCodigo).join(', ') ?? 'N/A'}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <Label>Motivo de anulacion</Label>
                  <Textarea
                    value={monoHiloCancelMotivo}
                    onChange={(event) => {
                      setMonoHiloCancelMotivo(event.target.value)
                      if (monoHiloCancelError) setMonoHiloCancelError(null)
                      if (entryActionError) setEntryActionError(null)
                    }}
                    rows={3}
                    placeholder="Explica por que se anula este registro."
                    disabled={monoHiloCancelSubmitting}
                  />
                </div>

                {monoHiloCancelError || entryActionError ? (
                  <p className="text-xs text-destructive">
                    {monoHiloCancelError ?? entryActionError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeMonoHiloCancelDialog}
                disabled={monoHiloCancelSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => {
                  void confirmMonoHiloCancel()
                }}
                disabled={!monoHiloCancelTarget || monoHiloCancelSubmitting}
              >
                {monoHiloCancelSubmitting ? 'Anulando...' : 'Anular registro'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProduccionRegistrosList
          canWriteProduccion={canWriteProduccion}
          fechasOrdenadas={fechasOrdenadas}
          groupedByDate={groupedByDate}
          resolveEquipoCodigo={resolveEquipoCodigo}
          resolveOrigenCodigo={resolveOrigenCodigo}
          onEditRegistro={openEntryEditDialog}
          onCancelMonoHiloRegistro={openMonoHiloCancelDialog}
          onDeleteRegistro={openEntryDeleteDialog}
          editLoadingById={entryUpdateLoadingById}
          deleteLoadingById={entryDeleteLoadingById}
        />
      </div>
    </AdminShell>
  )
}


