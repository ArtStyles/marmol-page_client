'use client'

import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { bloquesYLotes, dimensiones, tiposProducto } from '@/lib/data'
import {
  TIPO_EQUIPO_POR_ACCION,
  type AccionLosa,
  type Dimension,
  type Equipo,
  type TipoProducto,
  type Trabajador,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Plus, Trash2, X } from 'lucide-react'
import type {
  ActionFormState,
  ActionUsageForm,
  UpdateActionUsageDimensionFn,
  UpdateActionUsageFn,
} from '../../model/types'
import {
  actionColors,
  actionLabels,
  updateUsageDimensionNumericInput,
} from '../../lib/produccion-helpers'

const actionSectionBackgrounds: Record<AccionLosa, string> = {
  picar: 'border-blue-200/80 bg-blue-50/60',
  pulir: 'border-emerald-200/80 bg-emerald-50/60',
  escuadrar: 'border-amber-200/80 bg-amber-50/60',
}

type ProduccionActionSectionProps = {
  accion: AccionLosa
  accionState: ActionFormState
  addUsage: (accion: AccionLosa) => void
  equiposActivos: Equipo[]
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
  removeUsage,
  toggleUsageDimension,
  trabajadoresActivos,
  updateUsage,
  updateUsageDimension,
}: ProduccionActionSectionProps) {
  const tipoEquipo = TIPO_EQUIPO_POR_ACCION[accion]
  const equiposPorAccion = equiposActivos.filter((equipo) => equipo.tipo === tipoEquipo)
  const origenesActivos = bloquesYLotes.filter((bloque) => bloque.estado === 'activo')

  const totalAsignado = accionState.usos.reduce(
    (sum, uso) =>
      sum +
      uso.dimensiones.reduce(
        (sumDimension, dimensionUso) => sumDimension + dimensionUso.cantidadLosas,
        0,
      ),
    0,
  )
  const totalMermaAccion = accionState.usos.reduce(
    (sum, uso) =>
      sum +
      uso.dimensiones.reduce(
        (sumDimension, dimensionUso) => sumDimension + dimensionUso.mermaTotalLosas,
        0,
      ),
    0,
  )
  const totalReutilizableAccion = accionState.usos.reduce(
    (sum, uso) =>
      sum +
      uso.dimensiones.reduce(
        (sumDimension, dimensionUso) => sumDimension + dimensionUso.reutilizableLosas,
        0,
      ),
    0,
  )

  const selectedDimensionsLabel = (uso: ActionUsageForm): string => {
    if (uso.dimensiones.length === 0) return 'Seleccionar dimensiones'
    if (uso.dimensiones.length === dimensiones.length) return 'Todas'
    return uso.dimensiones.map((item) => item.dimension).join(', ')
  }

  return (
    <div className={cn('rounded-[18px] border p-3', actionSectionBackgrounds[accion])}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Badge className={cn('w-fit', actionColors[accion])}>{actionLabels[accion]}</Badge>
            <p className="mt-1 text-[11px] text-slate-500">
              Configura la fila base y luego captura subfilas por dimension.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Asignado</p>
            <p className="text-sm font-semibold text-slate-900">{totalAsignado} losas</p>
          </div>
        </div>

        <div className="space-y-3">
          {accionState.usos.map((uso, index) => {
            const personalSeleccionado = trabajadoresActivos.filter((trabajador) =>
              uso.trabajadorIds.includes(trabajador.id),
            )
            const personalLabel =
              personalSeleccionado.length > 0
                ? personalSeleccionado.map((trabajador) => trabajador.nombre).join(', ')
                : 'Seleccionar personal'

            return (
              <div
                key={uso.id}
                className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Fila {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeUsage(accion, uso.id)}
                    disabled={accionState.usos.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Bloque/lote</p>
                    <Select
                      value={uso.origenId}
                      onValueChange={(value) => updateUsage(accion, uso.id, { origenId: value })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Seleccionar origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {origenesActivos.map((bloque) => (
                          <SelectItem key={bloque.id} value={bloque.id}>
                            {bloque.nombre} ({bloque.tipo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Equipo</p>
                    <Select
                      value={uso.equipoId}
                      onValueChange={(value) => updateUsage(accion, uso.id, { equipoId: value })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Seleccionar equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {equiposPorAccion.map((equipo) => (
                          <SelectItem key={equipo.id} value={equipo.id}>
                            {equipo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Personal</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full justify-between overflow-hidden bg-transparent text-left font-normal"
                        >
                          <span className="truncate">{personalLabel}</span>
                          <span className="ml-2 text-[10px] text-slate-500">
                            {personalSeleccionado.length}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="max-h-60 w-[var(--radix-dropdown-menu-trigger-width)]"
                      >
                        {trabajadoresActivos.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs text-slate-500">
                            No hay trabajadores activos.
                          </p>
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
                    <p className="text-[10px] text-slate-500">{uso.trabajadorIds.length} integrante(s)</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Tipo</p>
                    <Select
                      value={uso.tipo}
                      onValueChange={(value) => updateUsage(accion, uso.id, { tipo: value as TipoProducto })}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposProducto.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Dimensiones</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full justify-between bg-transparent text-left font-normal"
                        >
                          <span className="truncate">{selectedDimensionsLabel(uso)}</span>
                          <span className="ml-2 text-[10px] text-slate-500">{uso.dimensiones.length}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-[var(--radix-dropdown-menu-trigger-width)]"
                      >
                        {dimensiones.map((dimension) => {
                          const isSelected = uso.dimensiones.some(
                            (dimensionUso) => dimensionUso.dimension === dimension,
                          )

                          return (
                            <DropdownMenuCheckboxItem
                              key={`${uso.id}-${dimension}`}
                              checked={isSelected}
                              onSelect={(event) => event.preventDefault()}
                              onCheckedChange={(checked) => {
                                toggleUsageDimension(accion, uso.id, dimension as Dimension, checked === true)
                              }}
                            >
                              {dimension}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {uso.dimensiones.length === 0 ? (
                    <p className="text-xs text-slate-500">Selecciona una o varias dimensiones para capturar detalle.</p>
                  ) : (
                    uso.dimensiones.map((dimensionUso) => (
                      <Badge key={dimensionUso.id} variant="outline" className="bg-white">
                        {dimensionUso.dimension}
                      </Badge>
                    ))
                  )}
                </div>

                {uso.dimensiones.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/80 p-2">
                    <p className="px-1 pb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      Subfilas por dimension
                    </p>
                    <div className="space-y-2">
                      {uso.dimensiones.map((dimensionUso) => (
                        <div
                          key={dimensionUso.id}
                          className="rounded-md border border-slate-200/80 bg-white p-2"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700">
                              {dimensionUso.dimension}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                toggleUsageDimension(accion, uso.id, dimensionUso.dimension, false)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Losas</p>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="h-9 text-right"
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
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Merma prod. (no pago)</p>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="h-9 text-right"
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
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Reutilizable (paga)</p>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="h-9 text-right"
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
                            </div>
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-transparent"
            onClick={() => addUsage(accion)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nueva fila
          </Button>
          <div className="text-right">
            <p className="text-xs text-slate-600">Merma total: {totalMermaAccion} losas</p>
            <p className="text-xs text-slate-600">Reutilizable total: {totalReutilizableAccion} losas</p>
          </div>
        </div>

        {equiposPorAccion.length === 0 && (
          <p className="text-xs text-amber-700">No hay equipos activos tipo {tipoEquipo}.</p>
        )}
      </div>
    </div>
  )
}

