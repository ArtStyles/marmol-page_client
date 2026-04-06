'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/admin/admin-button'
import type { ProduccionDiaria } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Pencil } from 'lucide-react'
import type { DateEditPolicy } from '../model/types'
import {
  actionColors,
  actionLabels,
  actionOrder,
  getAccionDetalles,
  getDetalleMermaLosas,
  getDetalleReutilizableLosas,
  getDetalleTrabajadores,
} from '../lib/produccion-helpers'

type Props = {
  fechasOrdenadas: string[]
  getDatePolicy: (fecha: string) => DateEditPolicy
  groupedByDate: Record<string, ProduccionDiaria[]>
  resolveOrigenCodigo: (origenId: string, origenNombre: string) => string
  onEditFecha: (fecha: string) => void
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
  getDatePolicy,
  groupedByDate,
  resolveOrigenCodigo,
  onEditFecha,
}: Props) {
  return (
    <Card className="bg-transparent border-none outline-none shadow-none p-0">
      <CardContent className="p-0">
        {fechasOrdenadas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No hay registros de produccion
          </div>
        ) : (
          <div className="space-y-2">
            {fechasOrdenadas.map((fecha) => {
              const registros = groupedByDate[fecha]
              const policy = getDatePolicy(fecha)

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
                  registros: registrosGrupo,
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
                  <div className="flex flex-col gap-2 border-b border-slate-200/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
                      <p className="text-base font-semibold text-slate-900">{fecha}</p>
                    </div>
                    {policy.canMutate ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        title={`Editar produccion ${fecha}`}
                        onClick={() => onEditFecha(fecha)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn('w-fit border-slate-200 bg-slate-50 text-slate-600')}
                      >
                        Solo visualizacion
                      </Badge>
                    )}
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

                      const accionesActivas = actionOrder
                        .map((accion) => {
                          const detallesConContexto = grupo.registros.flatMap((registro) =>
                            getAccionDetalles(registro, accion).map((detalle) => ({
                              detalle,
                              tipo: registro.tipo,
                              dimension: registro.dimension,
                            })),
                          )

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

                          return {
                            accion,
                            dimensiones,
                            totalEquipos,
                            totalLosasAccion,
                          }
                        })
                        .filter((accion) => accion.totalLosasAccion > 0)

                      return (
                        <div key={`${fecha}-${grupo.groupKey}-${groupIndex}`} className="px-4 py-3">
                          <div className="space-y-2">
                            <div>
                              <p className="text-base font-semibold text-slate-900">{grupo.origenCodigo}</p>
                            </div>

                            <div className="space-y-2">
                              {accionesActivas.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-500">
                                  Sin acciones con produccion en este bloque.
                                </div>
                              ) : (
                                accionesActivas.map((accion) => (
                                  <div
                                    key={`${grupo.groupKey}-${accion.accion}`}
                                    className="space-y-1"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Badge className={cn('w-fit', actionColors[accion.accion])}>
                                          {actionLabels[accion.accion]}
                                        </Badge>
                                        <span className="text-sm text-slate-500">
                                          {accion.dimensiones.length} dimension(es) - {accion.totalEquipos} equipo(s)
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-2 space-y-1.5">
                                      {accion.dimensiones.map((dimensionItem, index) => (
                                        <div
                                          key={`${grupo.groupKey}-${accion.accion}-${dimensionItem.key}`}
                                          className={cn(
                                            'px-2 py-1.5',
                                            index < accion.dimensiones.length - 1 && 'border-b border-slate-200/70',
                                          )}
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold text-slate-800">
                                                {dimensionItem.tipo} / {dimensionItem.dimension}
                                              </p>
                                              <p className="truncate text-sm text-slate-500">
                                                Equipos:{' '}
                                                {dimensionItem.equipos.length > 0
                                                  ? dimensionItem.equipos.join(', ')
                                                  : 'Sin equipo'}
                                              </p>
                                              <p className="truncate text-sm text-slate-500">
                                                Personal: {dimensionItem.personal.join(', ')}
                                              </p>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
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
                                ))
                              )}
                            </div>

                            <p className="pt-1 text-right text-sm font-medium text-slate-600">
                              Total: {totalLosasGrupo} losas / {totalM2Grupo.toFixed(2)} m2
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
