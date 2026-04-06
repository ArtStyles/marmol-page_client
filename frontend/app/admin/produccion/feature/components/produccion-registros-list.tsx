'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/admin/admin-button'
import type { ProduccionDiaria } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import {
  actionColors,
  actionLabels,
  actionOrder,
  canDeleteProduccionEntrada,
  canEditProduccionEntrada,
  getAccionDetalles,
  getDetalleMermaLosas,
  getDetalleReutilizableLosas,
  getDetalleTrabajadores,
  getProduccionDeleteLockReason,
  getProduccionEditLockReason,
  isProduccionEnAlmacen,
} from '../lib/produccion-helpers'

type Props = {
  fechasOrdenadas: string[]
  groupedByDate: Record<string, ProduccionDiaria[]>
  resolveOrigenCodigo: (origenId: string, origenNombre: string) => string
  onEditRegistro: (registro: ProduccionDiaria) => void
  onDeleteRegistro: (registro: ProduccionDiaria) => void
  editLoadingById: Record<string, boolean>
  deleteLoadingById: Record<string, boolean>
}

type DimensionAggregate = {
  key: string
  tipo: ProduccionDiaria['tipo']
  dimension: ProduccionDiaria['dimension']
  totalLosas: number
  totalM2: number
  totalMerma: number
  totalReutilizable: number
  totalResina: number
  equipos: Set<string>
  personal: Set<string>
}

export function ProduccionRegistrosList({
  fechasOrdenadas,
  groupedByDate,
  resolveOrigenCodigo,
  onEditRegistro,
  onDeleteRegistro,
  editLoadingById,
  deleteLoadingById,
}: Props) {
  return (
    <Card className="border-none bg-transparent p-0 shadow-none outline-none">
      <CardContent className="p-0">
        {fechasOrdenadas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No hay registros de produccion
          </div>
        ) : (
          <div className="space-y-4">
            {fechasOrdenadas.map((fecha) => {
              const registros = groupedByDate[fecha]

              const registrosPorOrigen = Array.from(
                registros.reduce((map, registro) => {
                  const key = registro.origenId || registro.origenNombre
                  const current = map.get(key)
                  if (current) {
                    current.push(registro)
                  } else {
                    map.set(key, [registro])
                  }
                  return map
                }, new Map<string, ProduccionDiaria[]>()),
              )
                .map(([groupKey, registrosGrupo]) => ({
                  groupKey,
                  registros: [...registrosGrupo].sort((a, b) => {
                    const byTipo = a.tipo.localeCompare(b.tipo)
                    if (byTipo !== 0) return byTipo
                    const byDimension = a.dimension.localeCompare(b.dimension)
                    if (byDimension !== 0) return byDimension
                    return a.id.localeCompare(b.id)
                  }),
                  origenCodigo: resolveOrigenCodigo(
                    registrosGrupo[0]?.origenId ?? '',
                    registrosGrupo[0]?.origenNombre ?? '',
                  ),
                }))
                .sort((a, b) => a.origenCodigo.localeCompare(b.origenCodigo))

              return (
                <div
                  key={fecha}
                  className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
                      <p className="text-base font-semibold text-slate-900">{fecha}</p>
                    </div>
                  </div>

                  <div className="hidden border-b border-slate-200/70 bg-slate-50/70 px-4 py-2 lg:block">
                    <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Produccion por bloque
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200/60">
                    {registrosPorOrigen.map((grupo, groupIndex) => {
                      const totalLosasGrupo = grupo.registros.reduce(
                        (sum, registro) => sum + registro.totalLosas,
                        0,
                      )
                      const totalM2Grupo = grupo.registros.reduce((sum, registro) => sum + registro.totalM2, 0)

                      return (
                        <div key={`${fecha}-${grupo.groupKey}-${groupIndex}`} className="px-4 py-3">
                          <div className="space-y-2">
                            <div>
                              <p className="text-base font-semibold text-slate-900">{grupo.origenCodigo}</p>
                            </div>

                            <div className="space-y-2">
                              {grupo.registros.map((registro) => {
                                const enAlmacen = isProduccionEnAlmacen(registro)
                                const canEdit = canEditProduccionEntrada(registro)
                                const canDelete = canDeleteProduccionEntrada(registro)
                                const editReason = getProduccionEditLockReason(registro)
                                const deleteReason = getProduccionDeleteLockReason(registro)

                                const accionesEntrada = actionOrder
                                  .map((accion) => {
                                    const detallesConContexto = getAccionDetalles(registro, accion).map((detalle) => ({
                                      detalle,
                                      tipo: registro.tipo,
                                      dimension: registro.dimension,
                                    }))

                                    const dimensionesMap = detallesConContexto.reduce((map, item) => {
                                      const key = `${item.tipo}::${item.dimension}`
                                      const current: DimensionAggregate = map.get(key) ?? {
                                        key,
                                        tipo: item.tipo,
                                        dimension: item.dimension,
                                        totalLosas: 0,
                                        totalM2: 0,
                                        totalMerma: 0,
                                        totalReutilizable: 0,
                                        totalResina: 0,
                                        equipos: new Set<string>(),
                                        personal: new Set<string>(),
                                      }

                                      current.totalLosas += item.detalle.cantidadLosas
                                      current.totalM2 += item.detalle.metrosCuadrados
                                      current.totalMerma += getDetalleMermaLosas(item.detalle)
                                      current.totalReutilizable += getDetalleReutilizableLosas(item.detalle)
                                      current.totalResina += item.detalle.cantidadResina ?? 0

                                      if (item.detalle.equipoNombre?.trim()) {
                                        current.equipos.add(item.detalle.equipoNombre.trim())
                                      }

                                      const trabajadores = getDetalleTrabajadores(item.detalle)
                                      if (trabajadores.length === 0) {
                                        current.personal.add('Sin personal')
                                      } else {
                                        trabajadores.forEach((trabajador) => current.personal.add(trabajador.nombre))
                                      }

                                      map.set(key, current)
                                      return map
                                    }, new Map<string, DimensionAggregate>())

                                    const dimensiones = Array.from(dimensionesMap.values())
                                      .map((item) => ({
                                        ...item,
                                        equipos: Array.from(item.equipos).sort((a, b) => a.localeCompare(b)),
                                        personal: Array.from(item.personal).sort((a, b) => a.localeCompare(b)),
                                      }))
                                      .sort(
                                        (a, b) =>
                                          a.dimension.localeCompare(b.dimension) || a.tipo.localeCompare(b.tipo),
                                      )

                                    const totalLosasAccion = dimensiones.reduce((sum, item) => sum + item.totalLosas, 0)
                                    const totalEquipos = new Set(dimensiones.flatMap((item) => item.equipos)).size
                                    const dimensionCountVisible = dimensiones.filter(
                                      (item) => item.tipo.toLowerCase() !== 'plancha',
                                    ).length

                                    return {
                                      accion,
                                      dimensiones,
                                      totalEquipos,
                                      totalLosasAccion,
                                      dimensionCountVisible,
                                    }
                                  })
                                  .filter((accion) => accion.totalLosasAccion > 0)

                                return (
                                  <div key={registro.id} className="rounded-lg border border-slate-200/80 px-3 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                          className={cn(
                                            'w-fit',
                                            enAlmacen
                                              ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                              : 'border-amber-200 bg-amber-100 text-amber-800',
                                          )}
                                          variant="outline"
                                        >
                                          {enAlmacen ? 'En almacen' : 'Fuera de almacen'}
                                        </Badge>
                                        {accionesEntrada.map((accion) => (
                                          <Badge
                                            key={`${registro.id}-${accion.accion}`}
                                            className={cn('w-fit', actionColors[accion.accion])}
                                          >
                                            {actionLabels[accion.accion]}
                                          </Badge>
                                        ))}
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          title={canEdit ? 'Editar entrada' : (editReason ?? 'No editable')}
                                          disabled={
                                            !canEdit || editLoadingById[registro.id] || deleteLoadingById[registro.id]
                                          }
                                          onClick={() => onEditRegistro(registro)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 text-rose-700 hover:text-rose-800"
                                          title={
                                            canDelete ? 'Eliminar entrada' : (deleteReason ?? 'No se puede eliminar')
                                          }
                                          disabled={
                                            !canDelete || editLoadingById[registro.id] || deleteLoadingById[registro.id]
                                          }
                                          onClick={() => onDeleteRegistro(registro)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="mt-2 space-y-2">
                                      {accionesEntrada.map((accion) => (
                                        <div key={`${registro.id}-${accion.accion}-detalle`} className="space-y-1">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-sm text-slate-500">
                                              {accion.dimensionCountVisible > 0
                                                ? `${accion.dimensionCountVisible} dimension(es) - ${accion.totalEquipos} equipo(s)`
                                                : `${accion.totalEquipos} equipo(s)`}
                                            </span>
                                          </div>

                                          <div className="space-y-1.5">
                                            {accion.dimensiones.map((dimensionItem, index) => (
                                              <div
                                                key={`${registro.id}-${accion.accion}-${dimensionItem.key}`}
                                                className={cn(
                                                  'px-1 py-1.5',
                                                  index < accion.dimensiones.length - 1 &&
                                                    'border-b border-slate-200/70',
                                                )}
                                              >
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="text-base font-semibold text-slate-800">
                                                      {dimensionItem.tipo.toLowerCase() === 'plancha'
                                                        ? dimensionItem.tipo
                                                        : `${dimensionItem.tipo} / ${dimensionItem.dimension}`}
                                                    </p>
                                                    <p className="truncate text-base text-slate-500">
                                                      Equipos:{' '}
                                                      {dimensionItem.equipos.length > 0
                                                        ? dimensionItem.equipos.join(', ')
                                                        : 'Sin equipo'}
                                                    </p>
                                                    <p className="truncate text-base text-slate-500">
                                                      Personal: {dimensionItem.personal.join(', ')}
                                                    </p>
                                                  </div>

                                                  <div className="flex flex-wrap items-center justify-end gap-2 text-base">
                                                    <span className="font-medium text-slate-700">
                                                      Losas:{' '}
                                                      <span className="font-semibold text-slate-900">
                                                        {dimensionItem.totalLosas}
                                                      </span>
                                                    </span>
                                                    <span className="font-medium text-emerald-700">
                                                      M2: {dimensionItem.totalM2.toFixed(2)}
                                                    </span>
                                                    {accion.accion !== 'picar' ? (
                                                      <span className="font-medium text-rose-700">
                                                        Merma: {dimensionItem.totalMerma}
                                                      </span>
                                                    ) : null}
                                                    {accion.accion !== 'picar' ? (
                                                      <span className="font-medium text-sky-700">
                                                        Reutilizable: {dimensionItem.totalReutilizable}
                                                      </span>
                                                    ) : null}
                                                    {dimensionItem.totalResina > 0 ? (
                                                      <span className="font-medium text-cyan-700">
                                                        Resina: {dimensionItem.totalResina.toFixed(2)}
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <p className="pt-1 text-right text-base font-medium text-slate-600">
                                      Total entrada: {registro.totalLosas} losas / {registro.totalM2.toFixed(2)} m2
                                    </p>
                                  </div>
                                )
                              })}
                            </div>

                            <p className="pt-1 text-right text-base font-semibold text-slate-700">
                              Total bloque: {totalLosasGrupo} losas / {totalM2Grupo.toFixed(2)} m2
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
