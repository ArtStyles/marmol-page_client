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
import { createRetornoProcesoInventario } from '@/lib/resources-api'
import { Search } from 'lucide-react'
import { losasAMetros, type ProduccionDetalleAccion, type ProduccionDiaria } from '@/lib/types'
import { useProduccionPageState } from '../hooks/use-produccion-page-state'
import { ProduccionCreateDialog } from '../components/create-dialog/produccion-create-dialog'
import { ProduccionRightPanel } from '../components/produccion-right-panel'
import { ProduccionRegistrosList } from '../components/produccion-registros-list'
import {
  canDeleteProduccionEntrada,
  canEditProduccionEntrada,
  getDetalleTrabajadores,
} from '../lib/produccion-helpers'

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
      const movimiento = await createRetornoProcesoInventario({
        productoId: retornoProductoSeleccionado.id,
        cantidadLosas,
        motivo,
      })
      setRetornoNotice(
        `Solicitud ${movimiento.id} enviada a almacen para retorno sin cambio de estado.`,
      )
      closeRetornoDialog()
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
    equipoSeleccionado: { id: string; nombre: string },
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
      equipoNombre: equipoSeleccionado.nombre,
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
        equipoNombre: equipoSeleccionado.nombre,
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
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canSolicitarRetornoProceso ? (
              <Button type="button" variant="outline" onClick={openRetornoDialog}>
                Retirar a almacen
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
                Esta solicitud queda pendiente hasta aprobacion de jefatura de almacen.
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
                          {producto.nombre} - {producto.estado} - {producto.cantidadLosas} losas
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
                      <SelectValue placeholder="Seleccionar equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {equiposPicarActivos.length === 0 ? (
                        <SelectItem value="__sin-equipos__" disabled>
                          Sin equipos activos
                        </SelectItem>
                      ) : (
                        equiposPicarActivos.map((equipo) => (
                          <SelectItem key={equipo.id} value={equipo.id}>
                            {equipo.nombre}
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
                    {entryDeleteTarget.totalLosas} losas / {entryDeleteTarget.totalM2.toFixed(2)} m2
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
