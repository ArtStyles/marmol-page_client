'use client'

import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { Button } from '@/components/admin/admin-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import { type AccionLosa, type BloqueOLote, type Dimension, type Equipo, type Trabajador } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ChevronDown, Plus } from 'lucide-react'
import type {
  ActionUsageComboOption,
  DateEditPolicy,
  FormData,
  PicarUsageOption,
  RegistrarMonoHiloDesdeProduccionInput,
  UpdateActionUsageDimensionFn,
  UpdateActionUsageFn,
} from '../../model/types'
import { actionLabels, actionOrder, createUsageDimensionRow } from '../../lib/produccion-helpers'
import { ProduccionActionSection } from './produccion-action-section'

type DialogCreateMode = '' | 'produccion' | 'mono_hilo'

type ProduccionCreateDialogProps = {
  addUsage: (accion: AccionLosa) => void
  bloquesActivosMonoHilo: BloqueOLote[]
  canWriteProduccion: boolean
  dateEditPolicy: DateEditPolicy
  equiposActivos: Equipo[]
  formData: FormData
  formError: string
  getLosasDisponiblesParaAccion: (
    accion: AccionLosa,
    origenId: string,
    tipo: 'Piso' | 'Plancha' | '',
    dimension: Dimension,
    masaId?: string,
  ) => number | null
  handleSubmit: (event: FormEvent) => void
  isDialogOpen: boolean
  origenesActivosByAccion: Record<AccionLosa, BloqueOLote[]>
  picarUsageOptions: PicarUsageOption[]
  registrarMonoHiloDesdeProduccion: (
    input: RegistrarMonoHiloDesdeProduccionInput,
  ) => Promise<unknown>
  usageComboOptionsByAccion: Record<AccionLosa, ActionUsageComboOption[]>
  prepareNewForm: () => void
  removeUsage: (accion: AccionLosa, usageId: string) => void
  resetFormAndClose: () => void
  setFormData: Dispatch<SetStateAction<FormData>>
  setIsDialogOpen: (open: boolean) => void
  toggleUsageDimension: (
    accion: AccionLosa,
    usageId: string,
    dimension: Dimension,
    enabled: boolean,
  ) => void
  today: string
  trabajadoresActivos: Trabajador[]
  updateUsage: UpdateActionUsageFn
  updateUsageDimension: UpdateActionUsageDimensionFn
}

export function ProduccionCreateDialog({
  addUsage,
  bloquesActivosMonoHilo,
  canWriteProduccion,
  dateEditPolicy,
  equiposActivos,
  formData,
  formError,
  getLosasDisponiblesParaAccion,
  handleSubmit,
  isDialogOpen,
  origenesActivosByAccion,
  picarUsageOptions,
  registrarMonoHiloDesdeProduccion,
  usageComboOptionsByAccion,
  prepareNewForm,
  removeUsage,
  resetFormAndClose,
  setFormData,
  setIsDialogOpen,
  toggleUsageDimension,
  today,
  trabajadoresActivos,
  updateUsage,
  updateUsageDimension,
}: ProduccionCreateDialogProps) {
  const accionActiva = formData.accionActiva
  const [createMode, setCreateMode] = useState<DialogCreateMode>('')
  const [monoHiloBloqueId, setMonoHiloBloqueId] = useState('')
  const [monoHiloLargoCm, setMonoHiloLargoCm] = useState(0)
  const [monoHiloAnchoCm, setMonoHiloAnchoCm] = useState(0)
  const [monoHiloProfundidadCm, setMonoHiloProfundidadCm] = useState(0)
  const [monoHiloObservaciones, setMonoHiloObservaciones] = useState('')
  const [monoHiloEquipoId, setMonoHiloEquipoId] = useState('')
  const [monoHiloTrabajadorIds, setMonoHiloTrabajadorIds] = useState<string[]>([])
  const [monoHiloError, setMonoHiloError] = useState('')
  const [monoHiloSubmitting, setMonoHiloSubmitting] = useState(false)

  const accionesDisponibles = actionOrder.filter(
    (accion) => (origenesActivosByAccion[accion]?.length ?? 0) > 0,
  )
  const isProductionMode = createMode === 'produccion'
  const isMonoHiloMode = createMode === 'mono_hilo'
  const selectedMonoHiloTrabajadores = useMemo(
    () =>
      trabajadoresActivos.filter((trabajador) =>
        monoHiloTrabajadorIds.includes(trabajador.id),
      ),
    [monoHiloTrabajadorIds, trabajadoresActivos],
  )
  const monoHiloTrabajadoresLabel =
    selectedMonoHiloTrabajadores.length > 0
      ? selectedMonoHiloTrabajadores.map((trabajador) => trabajador.nombre).join(', ')
      : 'Seleccionar personal'
  const monoHiloCanSubmit =
    monoHiloBloqueId.trim().length > 0 &&
    monoHiloEquipoId.trim().length > 0 &&
    monoHiloTrabajadorIds.length > 0 &&
    monoHiloLargoCm > 0 &&
    monoHiloAnchoCm > 0 &&
    monoHiloProfundidadCm > 0

  const resetMonoHiloForm = () => {
    setMonoHiloBloqueId(bloquesActivosMonoHilo[0]?.id ?? '')
    setMonoHiloLargoCm(0)
    setMonoHiloAnchoCm(0)
    setMonoHiloProfundidadCm(0)
    setMonoHiloObservaciones('')
    setMonoHiloEquipoId(equiposActivos[0]?.id ?? '')
    setMonoHiloTrabajadorIds([])
    setMonoHiloError('')
  }

  const handleCancel = () => {
    setCreateMode('')
    setMonoHiloError('')
    resetFormAndClose()
  }

  const selectMonoHiloMode = () => {
    setCreateMode('mono_hilo')
    setFormData((prev) => ({
      ...prev,
      accionActiva: '',
    }))
    resetMonoHiloForm()
  }

  const submitMonoHilo = async () => {
    if (!monoHiloBloqueId.trim()) {
      setMonoHiloError('Selecciona el bloque de origen.')
      return
    }
    if (monoHiloLargoCm <= 0 || monoHiloAnchoCm <= 0 || monoHiloProfundidadCm <= 0) {
      setMonoHiloError('Largo, ancho y profundidad deben ser mayores a 0.')
      return
    }
    if (!monoHiloEquipoId.trim()) {
      setMonoHiloError('Selecciona un equipo.')
      return
    }

    const trabajadorIds = [...new Set(monoHiloTrabajadorIds)]
    if (trabajadorIds.length === 0) {
      setMonoHiloError('Selecciona al menos un trabajador.')
      return
    }

    setMonoHiloError('')
    setMonoHiloSubmitting(true)
    try {
      await registrarMonoHiloDesdeProduccion({
        fecha: formData.fecha,
        bloqueId: monoHiloBloqueId,
        largoCm: monoHiloLargoCm,
        anchoCm: monoHiloAnchoCm,
        profundidadCm: monoHiloProfundidadCm,
        observaciones: monoHiloObservaciones.trim() || undefined,
        equipoId: monoHiloEquipoId,
        trabajadorIds,
      })
      setCreateMode('')
      resetMonoHiloForm()
      resetFormAndClose()
    } catch (error) {
      setMonoHiloError(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la masa de mono hilo.',
      )
    } finally {
      setMonoHiloSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        if (open && !canWriteProduccion) return
        if (!open) {
          setCreateMode('')
          setMonoHiloError('')
        }
        setIsDialogOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            prepareNewForm()
            setCreateMode('')
            resetMonoHiloForm()
          }}
          disabled={!canWriteProduccion}
          title={canWriteProduccion ? 'Registrar Produccion' : 'Sin permiso para registrar produccion'}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Produccion
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] w-[96vw] max-w-[96vw] overflow-y-auto lg:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Registrar produccion diaria</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            if (!canWriteProduccion) {
              event.preventDefault()
              return
            }
            if (isMonoHiloMode) {
              event.preventDefault()
              void submitMonoHilo()
              return
            }
            if (!isProductionMode) {
              event.preventDefault()
              return
            }
            handleSubmit(event)
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="max-w-md space-y-2">
              <Label>Fecha de produccion</Label>
              <Input
                type="date"
                max={today}
                value={formData.fecha}
                disabled={!canWriteProduccion}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, fecha: event.target.value }))
                }
              />
            </div>

            {createMode ? (
              <div className="sm:justify-self-end">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent"
                  disabled={!canWriteProduccion}
                  onClick={() => {
                    setCreateMode('')
                    setMonoHiloError('')
                    setFormData((prev) => ({
                      ...prev,
                      accionActiva: '',
                    }))
                  }}
                >
                  Cambiar accion
                </Button>
              </div>
            ) : null}
          </div>

          {isProductionMode && dateEditPolicy.hasRecords && !dateEditPolicy.canMutate ? (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                'border-amber-200 bg-amber-50 text-amber-700',
              )}
            >
              {dateEditPolicy.message}
            </div>
          ) : null}

          {!createMode ? (
            <div className="space-y-3">
              <Label>Selecciona accion</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                {actionOrder.map((accion) => {
                  const disponible = accionesDisponibles.includes(accion)
                  const cantidadOrigenes =
                    accion === 'picar'
                      ? new Set(picarUsageOptions.map((option) => option.masaId)).size
                      : (usageComboOptionsByAccion[accion]?.length ?? 0)
                  const primeraOpcionPicar = picarUsageOptions[0]
                  const primeraOpcionCombo = usageComboOptionsByAccion[accion]?.[0]

                  return (
                  <Button
                    key={accion}
                    type="button"
                    variant="outline"
                    className="justify-center bg-transparent"
                    disabled={!canWriteProduccion || !disponible}
                    onClick={() => {
                      setCreateMode('produccion')
                      setFormData((prev) => ({
                        ...prev,
                        accionActiva: accion,
                        acciones: {
                          ...prev.acciones,
                          [accion]: {
                            ...prev.acciones[accion],
                            usos: prev.acciones[accion].usos.map((uso, index) =>
                              index === 0 &&
                              (
                                (accion === 'picar' && !uso.masaId) ||
                                (accion !== 'picar' &&
                                  (!uso.origenId || !uso.tipo || uso.dimensiones.length === 0))
                              )
                                ? {
                                    ...uso,
                                    ...(accion === 'picar' && primeraOpcionPicar
                                      ? {
                                          masaId: primeraOpcionPicar.masaId,
                                          origenId: primeraOpcionPicar.origenId,
                                          tipo:
                                            primeraOpcionPicar.pisoDimensions.length > 0
                                              ? 'Piso'
                                              : 'Plancha',
                                          dimensiones: [
                                            createUsageDimensionRow(
                                              primeraOpcionPicar.pisoDimensions[0] ??
                                                primeraOpcionPicar.defaultPlanchaDimension,
                                            ),
                                          ],
                                        }
                                      : primeraOpcionCombo
                                        ? {
                                            masaId: '',
                                            origenId: primeraOpcionCombo.origenId,
                                            tipo: primeraOpcionCombo.tipo,
                                            dimensiones: [
                                              createUsageDimensionRow(primeraOpcionCombo.dimension),
                                            ],
                                          }
                                        : {
                                            origenId: origenesActivosByAccion[accion]?.[0]?.id ?? '',
                                          }),
                                  }
                                : uso,
                            ),
                          },
                        },
                      }))
                    }}
                  >
                    {actionLabels[accion]} ({cantidadOrigenes})
                  </Button>
                  )
                })}
                <Button
                  type="button"
                  variant="outline"
                  className="justify-center bg-transparent"
                  disabled={!canWriteProduccion || bloquesActivosMonoHilo.length === 0}
                  onClick={selectMonoHiloMode}
                >
                  Mono hilo desde bloques ({bloquesActivosMonoHilo.length})
                </Button>
              </div>
              {accionesDisponibles.length === 0 && bloquesActivosMonoHilo.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No hay acciones o bloques disponibles para registrar.
                </p>
              ) : null}
            </div>
          ) : isProductionMode && accionActiva ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Captura guiada: en picado primero eliges masa y tipo; si es plancha la medida se define de forma dinamica.
              </p>
              <ProduccionActionSection
                accion={accionActiva}
                accionState={formData.acciones[accionActiva]}
                addUsage={addUsage}
                equiposActivos={equiposActivos}
                getLosasDisponiblesParaAccion={getLosasDisponiblesParaAccion}
                picarUsageOptions={picarUsageOptions}
                usageComboOptions={usageComboOptionsByAccion[accionActiva]}
                removeUsage={removeUsage}
                toggleUsageDimension={toggleUsageDimension}
                trabajadoresActivos={trabajadoresActivos}
                updateUsage={updateUsage}
                updateUsageDimension={updateUsageDimension}
              />
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Bloque de origen</p>
                  <select
                    className="h-9 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-surface)] px-3 text-sm"
                    value={monoHiloBloqueId}
                    onChange={(event) => {
                      setMonoHiloBloqueId(event.target.value)
                      if (monoHiloError) setMonoHiloError('')
                    }}
                    disabled={monoHiloSubmitting}
                  >
                    {bloquesActivosMonoHilo.length === 0 ? (
                      <option value="">Sin bloques activos</option>
                    ) : (
                      bloquesActivosMonoHilo.map((bloque) => (
                        <option key={bloque.id} value={bloque.id}>
                          {getBloqueCodigo(bloque)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Equipo</p>
                  <select
                    className="h-9 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-surface)] px-3 text-sm"
                    value={monoHiloEquipoId}
                    onChange={(event) => {
                      setMonoHiloEquipoId(event.target.value)
                      if (monoHiloError) setMonoHiloError('')
                    }}
                    disabled={monoHiloSubmitting}
                  >
                    {equiposActivos.length === 0 ? (
                      <option value="">Sin equipos activos</option>
                    ) : (
                      equiposActivos.map((equipo) => (
                        <option key={equipo.id} value={equipo.id}>
                          {equipo.codigoInterno}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Personal</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[var(--field-border)] bg-[var(--field-surface)] px-3 text-left text-sm',
                        )}
                        disabled={monoHiloSubmitting}
                      >
                        <span className="truncate">{monoHiloTrabajadoresLabel}</span>
                        <div className="ml-2 flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{selectedMonoHiloTrabajadores.length}</span>
                          <ChevronDown className="size-4 opacity-50" />
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="max-h-60 w-[var(--radix-dropdown-menu-trigger-width)]"
                    >
                      {trabajadoresActivos.length === 0 ? (
                        <p className="px-2 py-1.5 text-xs text-slate-500">No hay trabajadores activos.</p>
                      ) : (
                        trabajadoresActivos.map((trabajador) => {
                          const isSelected = monoHiloTrabajadorIds.includes(trabajador.id)

                          return (
                            <DropdownMenuCheckboxItem
                              key={trabajador.id}
                              checked={isSelected}
                              onSelect={(event) => event.preventDefault()}
                              onCheckedChange={(checked) => {
                                const shouldSelect = checked === true
                                const trabajadorIds = shouldSelect
                                  ? [...monoHiloTrabajadorIds, trabajador.id]
                                  : monoHiloTrabajadorIds.filter((id) => id !== trabajador.id)
                                setMonoHiloTrabajadorIds([...new Set(trabajadorIds)])
                                if (monoHiloError) setMonoHiloError('')
                              }}
                            >
                              {trabajador.nombre}
                            </DropdownMenuCheckboxItem>
                          )
                        })
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Largo (cm)</p>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monoHiloLargoCm > 0 ? monoHiloLargoCm : ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setMonoHiloLargoCm(raw === '' ? 0 : Number(raw))
                      if (monoHiloError) setMonoHiloError('')
                    }}
                    disabled={monoHiloSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Ancho (cm)</p>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monoHiloAnchoCm > 0 ? monoHiloAnchoCm : ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setMonoHiloAnchoCm(raw === '' ? 0 : Number(raw))
                      if (monoHiloError) setMonoHiloError('')
                    }}
                    disabled={monoHiloSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Profundidad (cm)</p>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monoHiloProfundidadCm > 0 ? monoHiloProfundidadCm : ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setMonoHiloProfundidadCm(raw === '' ? 0 : Number(raw))
                      if (monoHiloError) setMonoHiloError('')
                    }}
                    disabled={monoHiloSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Observaciones (opcional)
                </p>
                <Textarea
                  value={monoHiloObservaciones}
                  onChange={(event) => {
                    setMonoHiloObservaciones(event.target.value)
                    if (monoHiloError) setMonoHiloError('')
                  }}
                  placeholder="Notas opcionales de la masa."
                  rows={3}
                  disabled={monoHiloSubmitting}
                />
              </div>

              <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                La masa se registra en almacen y deja un registro diario de mono hilo. Para poder picarla
                primero debes darle salida a proceso desde inventario de masas.
              </p>
            </div>
          )}

          {isProductionMode && formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          {isMonoHiloMode && monoHiloError ? (
            <p className="text-sm text-destructive">{monoHiloError}</p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                !canWriteProduccion ||
                (isProductionMode
                  ? (dateEditPolicy.hasRecords && !dateEditPolicy.canMutate) || !accionActiva
                  : isMonoHiloMode
                    ? monoHiloSubmitting || !monoHiloCanSubmit
                    : true)
              }
            >
              {isMonoHiloMode
                ? monoHiloSubmitting
                  ? 'Registrando...'
                  : 'Registrar masa mono hilo'
                : dateEditPolicy.hasRecords
                  ? 'Registrar otro envio'
                  : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

