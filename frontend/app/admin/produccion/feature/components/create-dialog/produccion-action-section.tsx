'use client'

import { Button as AdminButton } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  TIPO_EQUIPO_POR_ACCION,
  type AccionLosa,
  type BloqueOLote,
  type Dimension,
  type Equipo,
  type TipoProducto,
  type Trabajador,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import {
  actionColors,
  actionLabels,
  updateUsageDimensionNumericInput,
} from '../../lib/produccion-helpers'
import type {
  ActionFormState,
  ActionUsageForm,
  UpdateActionUsageDimensionFn,
  UpdateActionUsageFn,
} from '../../model/types'

const actionSectionBackgrounds: Record<AccionLosa, string> = {
  picar: 'border-blue-200/70 bg-blue-50/40',
  escuadrar: 'border-amber-200/70 bg-amber-50/40',
  devastar: 'border-violet-200/70 bg-violet-50/40',
  resinar: 'border-cyan-200/70 bg-cyan-50/40',
  pulir: 'border-emerald-200/70 bg-emerald-50/40',
}

const dimensionOptions: Dimension[] = ['40x40', '60x40', '80x40']
const processActions: AccionLosa[] = ['escuadrar', 'devastar', 'resinar', 'pulir']
const tipoProductoOptions: TipoProducto[] = ['Piso', 'Plancha']

const triggerSurfaceClasses =
  'rounded-xl border border-[var(--field-border)] bg-[var(--field-surface)] px-3 text-sm shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-[color,background-color,box-shadow,border-color] hover:border-[var(--field-border-hover)] focus-visible:border-[var(--field-ring)] focus-visible:ring-ring/30 focus-visible:ring-[3px]'

const compactFieldTriggerClasses = `h-8 w-full ${triggerSurfaceClasses}`
const regularFieldTriggerClasses = `h-9 w-full ${triggerSurfaceClasses}`

type ProduccionActionSectionProps = {
  accion: AccionLosa
  accionState: ActionFormState
  addUsage: (accion: AccionLosa) => void
  equiposActivos: Equipo[]
  getLosasDisponiblesParaAccion: (
    accion: AccionLosa,
    origenId: string,
    tipo: TipoProducto | '',
    dimension: Dimension,
  ) => number | null
  origenesActivos: BloqueOLote[]
  removeUsage: (accion: AccionLosa, usageId: string) => void
  toggleUsageDimension: (
    accion: AccionLosa,
    usageId: string,
    dimension: Dimension,
    enabled: boolean,
  ) => void
  trabajadoresActivos: Trabajador[]
  updateUsage: UpdateActionUsageFn
  updateUsageDimension: UpdateActionUsageDimensionFn
}

export function ProduccionActionSection({
  accion,
  accionState,
  addUsage,
  equiposActivos,
  getLosasDisponiblesParaAccion,
  origenesActivos,
  removeUsage,
  toggleUsageDimension,
  trabajadoresActivos,
  updateUsage,
  updateUsageDimension,
}: ProduccionActionSectionProps) {
  const isResinar = accion === 'resinar'
  const tipoEquipo = TIPO_EQUIPO_POR_ACCION[accion]
  const equiposPorAccion = equiposActivos.filter((equipo) => equipo.tipo === tipoEquipo)
  const supportsMerma = accion !== 'picar' && accion !== 'resinar'

  const totalAsignado = accionState.usos.reduce(
    (sum, uso) =>
      sum +
      uso.dimensiones.reduce(
        (sumDimension, dimensionUso) => sumDimension + dimensionUso.cantidadLosas,
        0,
      ),
    0,
  )

  const selectedDimensionsLabel = (uso: ActionUsageForm): string => {
    if (uso.dimensiones.length === 0) return 'Seleccionar dimensiones'
    if (uso.dimensiones.length === dimensionOptions.length) return 'Todas'
    return uso.dimensiones.map((item) => item.dimension).join(', ')
  }

  return (
    <div className={cn('overflow-hidden rounded-[16px] border', actionSectionBackgrounds[accion])}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2.5">
        <Badge className={cn('w-fit', actionColors[accion])}>{actionLabels[accion]}</Badge>
        <div className="text-right">
          <p className="text-xs text-slate-500">Asignado</p>
          <p className="text-sm font-semibold text-slate-900">{totalAsignado} losas</p>
        </div>
      </div>

      <div className="divide-y divide-slate-200/70">
        {accionState.usos.map((uso, index) => {
          const personalSeleccionado = trabajadoresActivos.filter((trabajador) =>
            uso.trabajadorIds.includes(trabajador.id),
          )
          const personalLabel =
            personalSeleccionado.length > 0
              ? personalSeleccionado.map((trabajador) => trabajador.nombre).join(', ')
              : 'Seleccionar personal'
          const dimensionesUso = uso.dimensiones
          const isProcesoAction = processActions.includes(accion)
          const dimensionesDisponiblesParaUso = dimensionOptions.filter((dimension) => {
            if (!isProcesoAction || !uso.origenId) return true
            const disponibles = getLosasDisponiblesParaAccion(accion, uso.origenId, uso.tipo, dimension) ?? 0
            const isSelected = uso.dimensiones.some(
              (dimensionUso) => dimensionUso.dimension === dimension,
            )
            return isSelected || disponibles > 0
          })

          return (
            <div key={uso.id} className="bg-white/85 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Fila {index + 1}
                </p>
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeUsage(accion, uso.id)}
                  disabled={accionState.usos.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </AdminButton>
              </div>

              <div
                className={cn(
                  'mt-3 grid gap-3 md:grid-cols-2',
                  isResinar
                    ? 'lg:grid-cols-[170px_280px_140px_170px] lg:items-end'
                    : 'lg:grid-cols-[170px_170px_280px_140px_170px] lg:items-end',
                )}
              >
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Codigo</p>
                  <Select
                    value={uso.origenId}
                    onValueChange={(value) => updateUsage(accion, uso.id, { origenId: value })}
                  >
                    <SelectTrigger size="sm" className={compactFieldTriggerClasses}>
                      <SelectValue placeholder="Seleccionar origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {origenesActivos.map((bloque) => (
                        <SelectItem key={bloque.id} value={bloque.id}>
                          {getBloqueCodigo(bloque)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isResinar ? (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Equipo</p>
                    <Select
                      value={uso.equipoId}
                      onValueChange={(value) => updateUsage(accion, uso.id, { equipoId: value })}
                    >
                      <SelectTrigger size="sm" className={compactFieldTriggerClasses}>
                        <SelectValue placeholder="Seleccionar equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {equiposPorAccion.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs text-slate-500">
                            No hay equipos activos tipo {tipoEquipo}.
                          </p>
                        ) : (
                          equiposPorAccion.map((equipo) => (
                            <SelectItem key={equipo.id} value={equipo.id}>
                              {equipo.codigoInterno}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Personal (opcional)</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center justify-between gap-2 overflow-hidden text-left font-normal',
                          regularFieldTriggerClasses,
                        )}
                      >
                        <span className="truncate">{personalLabel}</span>
                        <div className="ml-2 flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{personalSeleccionado.length}</span>
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
                          const isSelected = uso.trabajadorIds.includes(trabajador.id)

                          return (
                            <DropdownMenuCheckboxItem
                              key={trabajador.id}
                              checked={isSelected}
                              onSelect={(event) => event.preventDefault()}
                              onCheckedChange={(checked) => {
                                const shouldSelect = checked === true
                                const trabajadorIds = shouldSelect
                                  ? [...uso.trabajadorIds, trabajador.id]
                                  : uso.trabajadorIds.filter((id) => id !== trabajador.id)

                                updateUsage(accion, uso.id, {
                                  trabajadorIds: [...new Set(trabajadorIds)],
                                })
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

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Tipo</p>
                  <Select
                    value={uso.tipo}
                    onValueChange={(value) =>
                      updateUsage(accion, uso.id, {
                        tipo: value as TipoProducto,
                      })
                    }
                  >
                    <SelectTrigger size="sm" className={compactFieldTriggerClasses}>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoProductoOptions.map((tipo) => (
                        <SelectItem key={`${uso.id}-${tipo}`} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Dimensiones disponibles</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center justify-between gap-2 text-left font-normal',
                          compactFieldTriggerClasses,
                        )}
                      >
                        <span className="truncate">{selectedDimensionsLabel(uso)}</span>
                        <div className="ml-2 flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{uso.dimensiones.length}</span>
                          <ChevronDown className="size-4 opacity-50" />
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-[var(--radix-dropdown-menu-trigger-width)]"
                    >
                      {dimensionesDisponiblesParaUso.length === 0 ? (
                        <p className="px-2 py-1.5 text-xs text-slate-500">
                          Sin dimensiones disponibles para esta accion.
                        </p>
                      ) : (
                        dimensionesDisponiblesParaUso.map((dimension) => {
                          const isSelected = uso.dimensiones.some(
                            (dimensionUso) => dimensionUso.dimension === dimension,
                          )

                          return (
                            <DropdownMenuCheckboxItem
                              key={`${uso.id}-${dimension}`}
                              checked={isSelected}
                              onSelect={(event) => event.preventDefault()}
                              onCheckedChange={(checked) => {
                                toggleUsageDimension(accion, uso.id, dimension, checked === true)
                              }}
                            >
                              {dimension}
                            </DropdownMenuCheckboxItem>
                          )
                        })
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {dimensionesUso.length > 0
                  ? dimensionesUso.map((dimensionUso) => (
                      <Badge key={dimensionUso.id} variant="outline" className="bg-white">
                        {dimensionUso.dimension}
                      </Badge>
                    ))
                  : null}
              </div>

              {dimensionesUso.length > 0 && (
                <div className="mt-3 rounded-md bg-slate-50/80 p-2">
                  <div className="space-y-2">
                    {dimensionesUso.map((dimensionUso, dimensionIndex) => (
                      <div
                        key={dimensionUso.id}
                        className={cn(
                          'bg-white/80 p-2',
                          dimensionIndex > 0 && 'border-t border-slate-200/70',
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700">
                            {dimensionUso.dimension}
                          </Badge>
                          <AdminButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              toggleUsageDimension(accion, uso.id, dimensionUso.dimension, false)
                            }
                          >
                            <X className="h-4 w-4" />
                          </AdminButton>
                        </div>

                        <div
                          className={cn(
                            'grid gap-2',
                            isResinar
                              ? 'sm:grid-cols-2'
                              : supportsMerma
                                ? 'sm:grid-cols-3'
                                : 'sm:grid-cols-2',
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Losas</p>
                            <div className="min-h-[15px]">
                              {(() => {
                                const disponibles = getLosasDisponiblesParaAccion(
                                  accion,
                                  uso.origenId,
                                  uso.tipo,
                                  dimensionUso.dimension,
                                )
                                if (disponibles === null) return null

                                return (
                                  <p className="text-[10px] text-slate-500">
                                    Disponible para esta accion: {disponibles} losas
                                  </p>
                                )
                              })()}
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              className="h-8 max-w-[220px] text-right"
                              value={
                                dimensionUso.cantidadTouched || dimensionUso.cantidadLosas > 0
                                  ? dimensionUso.cantidadLosas
                                  : ''
                              }
                              onChange={(event) =>
                                updateUsageDimensionNumericInput({
                                  action: accion,
                                  usageId: uso.id,
                                  dimensionUsageId: dimensionUso.id,
                                  rawValue: event.target.value,
                                  numericField: 'cantidadLosas',
                                  touchedField: 'cantidadTouched',
                                  updateUsageDimension,
                                })
                              }
                            />
                            <div className="min-h-[15px]">
                              {(() => {
                                const disponibles = getLosasDisponiblesParaAccion(
                                  accion,
                                  uso.origenId,
                                  uso.tipo,
                                  dimensionUso.dimension,
                                )
                                if (disponibles === null) return null

                                return (
                                  <p
                                    className={cn(
                                      'text-[10px]',
                                      dimensionUso.cantidadLosas > disponibles
                                        ? 'text-rose-600'
                                        : 'text-slate-500',
                                    )}
                                  >
                                    {dimensionUso.cantidadLosas > disponibles
                                      ? `Maximo disponible: ${disponibles}`
                                      : 'Cantidad dentro de disponibilidad.'}
                                  </p>
                                )
                              })()}
                            </div>
                          </div>

                          {supportsMerma && (
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                Merma prod. (no pago)
                              </p>
                              <div className="min-h-[15px]" aria-hidden="true" />
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="h-8 max-w-[220px] text-right"
                                value={
                                  dimensionUso.mermaTotalTouched || dimensionUso.mermaTotalLosas > 0
                                    ? dimensionUso.mermaTotalLosas
                                    : ''
                                }
                                onChange={(event) =>
                                  updateUsageDimensionNumericInput({
                                    action: accion,
                                    usageId: uso.id,
                                    dimensionUsageId: dimensionUso.id,
                                    rawValue: event.target.value,
                                    numericField: 'mermaTotalLosas',
                                    touchedField: 'mermaTotalTouched',
                                    updateUsageDimension,
                                  })
                                }
                              />
                              <div className="min-h-[15px]" aria-hidden="true" />
                            </div>
                          )}

                          {!isResinar && (
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                Reutilizable (paga)
                              </p>
                              <div className="min-h-[15px]" aria-hidden="true" />
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="h-8 max-w-[220px] text-right"
                                value={
                                  dimensionUso.reutilizableTouched || dimensionUso.reutilizableLosas > 0
                                    ? dimensionUso.reutilizableLosas
                                    : ''
                                }
                                onChange={(event) =>
                                  updateUsageDimensionNumericInput({
                                    action: accion,
                                    usageId: uso.id,
                                    dimensionUsageId: dimensionUso.id,
                                    rawValue: event.target.value,
                                    numericField: 'reutilizableLosas',
                                    touchedField: 'reutilizableTouched',
                                    updateUsageDimension,
                                  })
                                }
                              />
                              <div className="min-h-[15px]" aria-hidden="true" />
                            </div>
                          )}

                          {accion === 'resinar' && (
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                Resina consumida
                              </p>
                              <div className="min-h-[15px]" aria-hidden="true" />
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                className="h-8 max-w-[220px] text-right"
                                value={
                                  dimensionUso.resinaTouched || dimensionUso.cantidadResina > 0
                                    ? dimensionUso.cantidadResina
                                    : ''
                                }
                                onChange={(event) =>
                                  updateUsageDimensionNumericInput({
                                    action: accion,
                                    usageId: uso.id,
                                    dimensionUsageId: dimensionUso.id,
                                    rawValue: event.target.value,
                                    numericField: 'cantidadResina',
                                    touchedField: 'resinaTouched',
                                    updateUsageDimension,
                                  })
                                }
                              />
                              <div className="min-h-[15px]" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-slate-200/70 px-3 py-3">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <AdminButton
            type="button"
            size="sm"
            className="bg-transparent"
            onClick={() => addUsage(accion)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nueva fila
          </AdminButton>
        </div>

        {!isResinar && equiposPorAccion.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">No hay equipos activos tipo {tipoEquipo}.</p>
        )}
      </div>
    </div>
  )
}


