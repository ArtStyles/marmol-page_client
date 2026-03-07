'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ProduccionDiaria } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { DateEditPolicy } from '../model/types'
import {
  actionColors,
  actionLabels,
  actionOrder,
  getAccionDetalles,
  getDetalleLosasPorTrabajador,
  getDetalleMermaLosas,
  getDetalleReutilizableLosas,
  getDetalleTrabajadores,
  getDetalleTrabajadoresCount,
} from '../lib/produccion-helpers'

type Props = {
  fechasOrdenadas: string[]
  getDatePolicy: (fecha: string) => DateEditPolicy
  groupedByDate: Record<string, ProduccionDiaria[]>
}

export function ProduccionRegistrosList({
  fechasOrdenadas,
  getDatePolicy,
  groupedByDate,
}: Props) {
  return (
    <Card className=" bg-transparent border-none outline-none shadow-none p-0 ">
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
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit',
                        policy.canMutate
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600',
                      )}
                    >
                      {policy.canMutate ? 'Editable (24h/API)' : 'Solo visualizacion'}
                    </Badge>
                  </div>

                  <div className="hidden lg:grid lg:grid-cols-[1fr_3fr] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                    <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Origen</span>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Detalle por accion
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200/60">
                    {registros.map((item) => {
                      const accionesActivas = actionOrder
                        .map((accion) => {
                          const detalles = getAccionDetalles(item, accion)
                          const totalLosasAccion = detalles.reduce(
                            (sum, detalle) => sum + detalle.cantidadLosas,
                            0,
                          )
                          const totalM2Accion = detalles.reduce(
                            (sum, detalle) => sum + detalle.metrosCuadrados,
                            0,
                          )
                          const totalMermaAccion = detalles.reduce(
                            (sum, detalle) => sum + getDetalleMermaLosas(detalle),
                            0,
                          )
                          const totalReutilizableAccion = detalles.reduce(
                            (sum, detalle) => sum + getDetalleReutilizableLosas(detalle),
                            0,
                          )

                          return {
                            accion,
                            detalles,
                            totalLosasAccion,
                            totalM2Accion,
                            totalMermaAccion,
                            totalReutilizableAccion,
                          }
                        })
                        .filter((accion) => accion.totalLosasAccion > 0)

                      return (
                        <div key={item.id} className="px-4 py-3">
                          <div className="grid gap-1 lg:grid-cols-[1fr_3fr] lg:items-start">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.origenNombre}</p>
                              <p className="text-[11px] text-slate-500">
                                {item.tipo} / {item.dimension}
                              </p>
                              <p className="mt-1 text-[11px] font-medium text-slate-600">
                                Total: {item.totalLosas} losas / {item.totalM2.toFixed(2)} m2
                              </p>
                            </div>

                            <div className="overflow-x-auto">
                              <div className="min-w-[860px] overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                                <div className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px] border-b border-slate-200/70 px-2.5 py-1">
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                    Accion
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                    Equipo / Personal
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">
                                    Losas
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">
                                    M2
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">
                                    Merma prod. (no pago)
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">
                                    Reutilizable (paga)
                                  </span>
                                </div>

                                <div className="divide-y divide-slate-200/70">
                                  {accionesActivas.map((accion) => (
                                    <div key={`${item.id}-${accion.accion}`}>
                                      <div className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px] items-center gap-2 border-b border-slate-200/70 bg-white/70 px-2.5 py-1.5">
                                        <Badge className={cn('w-fit', actionColors[accion.accion])}>
                                          {actionLabels[accion.accion]}
                                        </Badge>
                                        <p className="text-[11px] text-slate-500">
                                          {accion.detalles.length} subfila(s)
                                        </p>
                                        <span />
                                        <span />
                                        <span />
                                        <span />
                                      </div>

                                      <div className="divide-y divide-slate-200/70">
                                        {accion.detalles.map((detalle) => (
                                          <div
                                            key={detalle.id}
                                            className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px] items-center gap-2 px-2.5 py-1.5"
                                          >
                                            <span />
                                            <p className="text-sm text-slate-700">
                                              <span className="font-medium text-slate-800">
                                                {detalle.equipoNombre}
                                              </span>
                                              <span className="block truncate text-[11px] text-slate-500">
                                                {getDetalleTrabajadores(detalle)
                                                  .map((trabajador) => trabajador.nombre)
                                                  .join(', ') || 'Sin personal'}{' '}
                                                ({getDetalleTrabajadoresCount(detalle)} integrante(s))
                                              </span>
                                              <span className="block truncate text-[11px] text-sky-700">
                                                Reparto: {getDetalleLosasPorTrabajador(detalle).toFixed(2)} losas c/u
                                              </span>
                                            </p>
                                            <span className="text-right text-sm font-semibold text-slate-800">
                                              {detalle.cantidadLosas}
                                            </span>
                                            <span className="text-right text-sm font-semibold text-emerald-700">
                                              {detalle.metrosCuadrados.toFixed(2)}
                                            </span>
                                            <span className="text-right text-sm font-semibold text-rose-700">
                                              {getDetalleMermaLosas(detalle)}
                                            </span>
                                            <span className="text-right text-sm font-semibold text-sky-700">
                                              {getDetalleReutilizableLosas(detalle)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
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
