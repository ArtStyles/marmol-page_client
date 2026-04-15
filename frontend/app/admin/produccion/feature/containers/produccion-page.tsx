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
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  createMonoHiloMasas,
  createRetornoProcesoInventario,
  updateMonoHiloMasaUbicacion,
} from '@/lib/resources-api'
import { Search } from 'lucide-react'
import {
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

function getMonoHiloLosasDisponibles(masa: MonoHiloMasa, dimension: '40x40' | '60x40' | '80x40'): number {
  const estimado = masa.estimados[dimension]
  if (!estimado) return 0
  return Math.max(0, estimado.losasEstimadas - estimado.losasConsumidas)
}

export default function ProduccionPage() {
  const {
    addUsage,
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
    setMonoHiloMasas,
    origenesActivosByAccion,
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
  const [retornoProductoId, setRetornoProductoId] = useState('')
  const [retornoCantidadLosas, setRetornoCantidadLosas] = useState(0)
  const [retornoCantidadTouched, setRetornoCantidadTouched] = useState(false)
  const [retornoMotivo, setRetornoMotivo] = useState('')
  const [retornoDialogError, setRetornoDialogError] = useState<string | null>(null)
  const [retornoDialogSubmitting, setRetornoDialogSubmitting] = useState(false)
  const [retornoNotice, setRetornoNotice] = useState<string | null>(null)
  const [monoHiloDialogOpen, setMonoHiloDialogOpen] = useState(false)
  const [monoHiloBloqueId, setMonoHiloBloqueId] = useState('')
  const [monoHiloLargoCm, setMonoHiloLargoCm] = useState(0)
  const [monoHiloAnchoCm, setMonoHiloAnchoCm] = useState(0)
  const [monoHiloProfundidadCm, setMonoHiloProfundidadCm] = useState(0)
  const [monoHiloObservaciones, setMonoHiloObservaciones] = useState('')
  const [monoHiloDialogError, setMonoHiloDialogError] = useState<string | null>(null)
  const [monoHiloDialogSubmitting, setMonoHiloDialogSubmitting] = useState(false)
  const [monoHiloNotice, setMonoHiloNotice] = useState<string | null>(null)
  const [monoHiloMoveLoadingById, setMonoHiloMoveLoadingById] = useState<Record<string, boolean>>({})
  const [entryEditDialogOpen, setEntryEditDialogOpen] = useState(false)
  const [entryDeleteDialogOpen, setEntryDeleteDialogOpen] = useState(false)
  const [entryEditTarget, setEntryEditTarget] = useState<ProduccionDiaria | null>(null)
  const [entryDeleteTarget, setEntryDeleteTarget] = useState<ProduccionDiaria | null>(null)
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

  const monoHiloMasasOrdenadas = useMemo(
    () =>
      [...monoHiloMasas].sort((a, b) =>
        b.fechaRegistro.localeCompare(a.fechaRegistro) || b.codigo.localeCompare(a.codigo),
      ),
    [monoHiloMasas],
  )

  const monoHiloResumen = useMemo(
    () =>
      monoHiloMasas.reduce(
        (acc, masa) => {
          acc.total += 1
          if (masa.ubicacion === 'almacen') acc.almacen += 1
          if (masa.ubicacion === 'proceso') acc.proceso += 1
          if (masa.ubicacion === 'consumida') acc.consumida += 1
          return acc
        },
        { total: 0, almacen: 0, proceso: 0, consumida: 0 },
      ),
    [monoHiloMasas],
  )

  const openMonoHiloDialog = () => {
    if (!canWriteProduccion) return
    setMonoHiloDialogError(null)
    setMonoHiloBloqueId(bloquesActivosMonoHilo[0]?.id ?? '')
    setMonoHiloLargoCm(0)
    setMonoHiloAnchoCm(0)
    setMonoHiloProfundidadCm(0)
    setMonoHiloObservaciones('')
    setMonoHiloDialogOpen(true)
  }

  const closeMonoHiloDialog = () => {
    if (monoHiloDialogSubmitting) return
    setMonoHiloDialogOpen(false)
    setMonoHiloDialogError(null)
  }

  const confirmMonoHiloRegistro = async () => {
    const bloqueId = monoHiloBloqueId.trim()
    if (!bloqueId) {
      setMonoHiloDialogError('Selecciona el bloque del que saldra la masa.')
      return
    }

    if (monoHiloLargoCm <= 0 || monoHiloAnchoCm <= 0 || monoHiloProfundidadCm <= 0) {
      setMonoHiloDialogError('Largo, ancho y profundidad deben ser mayores a 0.')
      return
    }

    setMonoHiloDialogSubmitting(true)
    setMonoHiloDialogError(null)

    try {
      const created = await createMonoHiloMasas({
        bloqueId,
        masas: [
          {
            largoCm: monoHiloLargoCm,
            anchoCm: monoHiloAnchoCm,
            profundidadCm: monoHiloProfundidadCm,
            observaciones: monoHiloObservaciones.trim() || undefined,
          },
        ],
      })

      setMonoHiloMasas((prev) => [...created, ...prev])
      setMonoHiloNotice(
        created.length === 1
          ? `Masa ${created[0].codigo} registrada en almacen.`
          : `${created.length} masas registradas en almacen.`,
      )
      setMonoHiloDialogOpen(false)
      setMonoHiloDialogError(null)
    } catch (error) {
      setMonoHiloDialogError(
        error instanceof Error ? error.message : 'No se pudo registrar la masa de mono hilo.',
      )
    } finally {
      setMonoHiloDialogSubmitting(false)
    }
  }

  const moveMonoHiloMasa = async (
    masa: MonoHiloMasa,
    ubicacionDestino: 'almacen' | 'proceso',
  ) => {
    if (!canWriteProduccion) return
    if (monoHiloMoveLoadingById[masa.id]) return

    setMonoHiloMoveLoadingById((prev) => ({ ...prev, [masa.id]: true }))
    try {
      const updated = await updateMonoHiloMasaUbicacion(masa.id, { ubicacionDestino })
      setMonoHiloMasas((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setMonoHiloNotice(
        ubicacionDestino === 'proceso'
          ? `Masa ${updated.codigo} enviada a proceso para picado.`
          : `Masa ${updated.codigo} retornada a almacen.`,
      )
    } catch (error) {
      setMonoHiloDialogError(
        error instanceof Error ? error.message : 'No se pudo mover la masa de mono hilo.',
      )
    } finally {
      setMonoHiloMoveLoadingById((prev) => ({ ...prev, [masa.id]: false }))
    }
  }

  const openRetornoDialog = () => {
    if (!canSolicitarRetornoProceso) return
    setRetornoDialogError(null)
    setRetornoProductoId('')
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

  const entryEditSubmitting = entryEditTarget ? Boolean(entryUpdateLoadingById[entryEditTarget.id]) : false
  const entryDeleteSubmitting = entryDeleteTarget
    ? Boolean(entryDeleteLoadingById[entryDeleteTarget.id])
    : false

  const rightPanel = (
    <ProduccionRightPanel
      fechaResumen={fechaResumen}
      origenesActivosResumen={origenesActivosResumen}
      resumenAcciones={resumenAcciones}
      resumenPartidas={resumenPartidas}
      topOrigenesResumen={topOrigenesResumen}
      totalLosasResumen={totalLosasResumen}
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
            {monoHiloNotice ? <p className="mt-2 text-sm text-emerald-700">{monoHiloNotice}</p> : null}
            {monoHiloDialogError ? <p className="mt-2 text-sm text-destructive">{monoHiloDialogError}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canSolicitarRetornoProceso ? (
              <Button type="button" variant="outline" onClick={openRetornoDialog}>
                Retirar a almacen
              </Button>
            ) : null}
            {canWriteProduccion ? (
              <Button type="button" variant="outline" onClick={openMonoHiloDialog}>
                Registrar masa mono hilo
              </Button>
            ) : null}
            <ProduccionCreateDialog
              addUsage={addUsage}
              canWriteProduccion={canWriteProduccion}
              dateEditPolicy={dateEditPolicy}
              equiposActivos={equiposActivos}
              formData={formData}
              formError={formError}
              getLosasDisponiblesParaAccion={getLosasDisponiblesParaAccion}
              handleSubmit={handleSubmit}
              isDialogOpen={isDialogOpen}
              origenesActivosByAccion={origenesActivosByAccion}
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

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
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

        <div className="rounded-[24px] border border-amber-200/70 bg-amber-50/40 p-4 shadow-[var(--dash-shadow)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-amber-700">Mono hilo</p>
              <h2 className="text-lg font-semibold text-amber-950">Inventario de masas para picado</h2>
              <p className="text-xs text-amber-800">
                Total: {monoHiloResumen.total} | Almacen: {monoHiloResumen.almacen} | Proceso: {monoHiloResumen.proceso} | Consumidas: {monoHiloResumen.consumida}
              </p>
            </div>
          </div>

          {monoHiloMasasOrdenadas.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-amber-200 bg-white/70 p-3 text-sm text-amber-800">
              No hay masas registradas. Usa "Registrar masa mono hilo" para crear el inventario base.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-amber-200 text-xs uppercase tracking-wide text-amber-700">
                    <th className="px-2 py-2">Masa</th>
                    <th className="px-2 py-2">Bloque</th>
                    <th className="px-2 py-2">Dimensiones (cm)</th>
                    <th className="px-2 py-2">Estimado / disponible</th>
                    <th className="px-2 py-2">Merma estimada</th>
                    <th className="px-2 py-2">Ubicacion</th>
                    <th className="px-2 py-2 text-right">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {monoHiloMasasOrdenadas.map((masa) => {
                    const loadingMove = Boolean(monoHiloMoveLoadingById[masa.id])
                    const disponibles80 = getMonoHiloLosasDisponibles(masa, '80x40')
                    const disponibles60 = getMonoHiloLosasDisponibles(masa, '60x40')
                    const disponibles40 = getMonoHiloLosasDisponibles(masa, '40x40')
                    const estimado80 = masa.estimados['80x40']
                    const estimado60 = masa.estimados['60x40']
                    const estimado40 = masa.estimados['40x40']

                    return (
                      <tr key={masa.id} className="border-b border-amber-100/70 text-amber-950 last:border-b-0">
                        <td className="px-2 py-2">
                          <p className="font-semibold">{masa.codigo}</p>
                          <p className="text-xs text-amber-800">{masa.fechaRegistro.slice(0, 10)}</p>
                        </td>
                        <td className="px-2 py-2 text-xs text-amber-900">
                          {resolveOrigenCodigo(masa.bloqueId, masa.bloqueCodigo || masa.bloqueNombre)}
                        </td>
                        <td className="px-2 py-2 text-xs text-amber-900">
                          {masa.largoCm.toFixed(2)} x {masa.anchoCm.toFixed(2)} x {masa.profundidadCm.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-xs text-amber-900">
                          <p>80x40: {estimado80.losasEstimadas} / {disponibles80}</p>
                          <p>60x40: {estimado60.losasEstimadas} / {disponibles60}</p>
                          <p>40x40: {estimado40.losasEstimadas} / {disponibles40}</p>
                        </td>
                        <td className="px-2 py-2 text-xs text-amber-900">
                          <p>80x40: {estimado80.mermaEstimadaPorcentaje.toFixed(2)}% ({estimado80.mermaEstimadaM3.toFixed(4)} m³)</p>
                          <p>60x40: {estimado60.mermaEstimadaPorcentaje.toFixed(2)}% ({estimado60.mermaEstimadaM3.toFixed(4)} m³)</p>
                          <p>40x40: {estimado40.mermaEstimadaPorcentaje.toFixed(2)}% ({estimado40.mermaEstimadaM3.toFixed(4)} m³)</p>
                        </td>
                        <td className="px-2 py-2 text-xs font-medium uppercase text-amber-800">{masa.ubicacion}</td>
                        <td className="px-2 py-2 text-right">
                          {masa.ubicacion === 'almacen' && canWriteProduccion ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={loadingMove}
                              onClick={() => {
                                void moveMonoHiloMasa(masa, 'proceso')
                              }}
                            >
                              {loadingMove ? 'Moviendo...' : 'Enviar a proceso'}
                            </Button>
                          ) : null}
                          {masa.ubicacion === 'proceso' && canWriteProduccion ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={loadingMove}
                              onClick={() => {
                                void moveMonoHiloMasa(masa, 'almacen')
                              }}
                            >
                              {loadingMove ? 'Moviendo...' : 'Retornar a almacen'}
                            </Button>
                          ) : null}
                          {masa.ubicacion === 'consumida' ? (
                            <span className="text-xs text-amber-800">Consumida</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog
          open={retornoDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeRetornoDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Retornar losas de proceso a almacen</DialogTitle>
              <DialogDescription>
                Esta solicitud queda pendiente hasta aprobacion de jefatura de almacen y aplica el siguiente estado del flujo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
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
                  {retornoProductoSeleccionado.metrosCuadrados.toFixed(2)} m²)
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

              <div className="space-y-1">
                <Label>Motivo</Label>
                <Textarea
                  value={retornoMotivo}
                  onChange={(event) => {
                    setRetornoMotivo(event.target.value)
                    if (retornoDialogError) setRetornoDialogError(null)
                  }}
                  placeholder="Motivo del retorno (minimo 5 caracteres)."
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
                disabled={retornoDialogSubmitting || !retornoProductoSeleccionado || retornoCantidadLosas <= 0}
              >
                {retornoDialogSubmitting ? 'Guardando...' : 'Solicitar retorno'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={monoHiloDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeMonoHiloDialog()
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar masa de mono hilo</DialogTitle>
              <DialogDescription>
                Registra la masa con codigo de bloque y dimensiones. El margen se calcula automaticamente y los parametros tecnicos salen de Configuracion.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Bloque de origen</Label>
                <Select
                  value={monoHiloBloqueId}
                  onValueChange={(value) => {
                    setMonoHiloBloqueId(value)
                    if (monoHiloDialogError) setMonoHiloDialogError(null)
                  }}
                  disabled={monoHiloDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bloque" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloquesActivosMonoHilo.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Sin bloques activos disponibles
                      </SelectItem>
                    ) : (
                      bloquesActivosMonoHilo.map((bloque) => (
                        <SelectItem key={bloque.id} value={bloque.id}>
                          {getBloqueCodigo(bloque)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Largo (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monoHiloLargoCm > 0 ? monoHiloLargoCm : ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setMonoHiloLargoCm(raw === '' ? 0 : Number(raw))
                      if (monoHiloDialogError) setMonoHiloDialogError(null)
                    }}
                    disabled={monoHiloDialogSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ancho (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monoHiloAnchoCm > 0 ? monoHiloAnchoCm : ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setMonoHiloAnchoCm(raw === '' ? 0 : Number(raw))
                      if (monoHiloDialogError) setMonoHiloDialogError(null)
                    }}
                    disabled={monoHiloDialogSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Profundidad (cm)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monoHiloProfundidadCm > 0 ? monoHiloProfundidadCm : ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setMonoHiloProfundidadCm(raw === '' ? 0 : Number(raw))
                      if (monoHiloDialogError) setMonoHiloDialogError(null)
                    }}
                    disabled={monoHiloDialogSubmitting}
                  />
                </div>
              </div>
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                El margen se calcula automaticamente segun las dimensiones de la masa. Grosor de disco y espesor de losa se toman desde Configuracion.
              </p>
              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Textarea
                  value={monoHiloObservaciones}
                  onChange={(event) => {
                    setMonoHiloObservaciones(event.target.value)
                    if (monoHiloDialogError) setMonoHiloDialogError(null)
                  }}
                  placeholder="Notas opcionales de la masa."
                  rows={3}
                  disabled={monoHiloDialogSubmitting}
                />
              </div>
              {monoHiloDialogError ? (
                <p className="text-xs text-destructive">{monoHiloDialogError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeMonoHiloDialog}
                disabled={monoHiloDialogSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmMonoHiloRegistro()
                }}
                disabled={monoHiloDialogSubmitting || bloquesActivosMonoHilo.length === 0}
              >
                {monoHiloDialogSubmitting ? 'Guardando...' : 'Registrar masa'}
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
                    {entryDeleteTarget.totalLosas} losas / {entryDeleteTarget.totalM2.toFixed(2)} m²
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

        <ProduccionRegistrosList
          canWriteProduccion={canWriteProduccion}
          fechasOrdenadas={fechasOrdenadas}
          groupedByDate={groupedByDate}
          resolveEquipoCodigo={resolveEquipoCodigo}
          resolveOrigenCodigo={resolveOrigenCodigo}
          onEditRegistro={openEntryEditDialog}
          onDeleteRegistro={openEntryDeleteDialog}
          editLoadingById={entryUpdateLoadingById}
          deleteLoadingById={entryDeleteLoadingById}
        />
      </div>
    </AdminShell>
  )
}

