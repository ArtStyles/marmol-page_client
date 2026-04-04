'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/admin/admin-button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { EstadoAprobacion, ProduccionDiaria } from '@/lib/types'
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
  canApproveAlmacen: boolean
  canApproveTaller: boolean
  fechasOrdenadas: string[]
  getDatePolicy: (fecha: string) => DateEditPolicy
  groupedByDate: Record<string, ProduccionDiaria[]>
  onApproveAlmacen: (produccionId: string, motivo: string) => Promise<boolean>
  onApproveTaller: (
    produccionId: string,
    aprobado: boolean,
    motivoRechazo?: string,
  ) => Promise<boolean>
  almacenApprovalLoadingById: Record<string, boolean>
  tallerApprovalLoadingById: Record<string, boolean>
}

const approvalBadgeClass: Record<EstadoAprobacion, string> = {
  pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
  aprobado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rechazado: 'border-rose-200 bg-rose-50 text-rose-700',
}

const approvalLabel: Record<EstadoAprobacion, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

const resolveAprobacion = (value: ProduccionDiaria['aprobacionTallerEstado']): EstadoAprobacion => {
  if (value === 'aprobado' || value === 'rechazado') return value
  return 'pendiente'
}

export function ProduccionRegistrosList({
  canApproveAlmacen,
  canApproveTaller,
  fechasOrdenadas,
  getDatePolicy,
  groupedByDate,
  onApproveAlmacen,
  onApproveTaller,
  almacenApprovalLoadingById,
  tallerApprovalLoadingById,
}: Props) {
  const [almacenModalOpen, setAlmacenModalOpen] = useState(false)
  const [almacenTarget, setAlmacenTarget] = useState<{
    id: string
    origenNombre: string
    fecha: string
  } | null>(null)
  const [almacenMotivo, setAlmacenMotivo] = useState('')
  const [almacenModalError, setAlmacenModalError] = useState<string | null>(null)
  const [tallerRejectModalOpen, setTallerRejectModalOpen] = useState(false)
  const [tallerRejectTarget, setTallerRejectTarget] = useState<{
    id: string
    origenNombre: string
    fecha: string
  } | null>(null)
  const [tallerRejectMotivo, setTallerRejectMotivo] = useState('')
  const [tallerRejectModalError, setTallerRejectModalError] = useState<string | null>(null)

  const isAlmacenSubmitLoading = useMemo(() => {
    if (!almacenTarget) return false
    return !!almacenApprovalLoadingById[almacenTarget.id]
  }, [almacenApprovalLoadingById, almacenTarget])
  const isTallerRejectSubmitLoading = useMemo(() => {
    if (!tallerRejectTarget) return false
    return !!tallerApprovalLoadingById[tallerRejectTarget.id]
  }, [tallerApprovalLoadingById, tallerRejectTarget])

  const openAlmacenModal = (item: ProduccionDiaria) => {
    setAlmacenTarget({
      id: item.id,
      origenNombre: item.origenNombre,
      fecha: item.fecha,
    })
    setAlmacenMotivo('')
    setAlmacenModalError(null)
    setAlmacenModalOpen(true)
  }

  const closeAlmacenModal = () => {
    if (isAlmacenSubmitLoading) return
    setAlmacenModalOpen(false)
    setAlmacenTarget(null)
    setAlmacenMotivo('')
    setAlmacenModalError(null)
  }
  const openTallerRejectModal = (item: ProduccionDiaria) => {
    setTallerRejectTarget({
      id: item.id,
      origenNombre: item.origenNombre,
      fecha: item.fecha,
    })
    setTallerRejectMotivo('')
    setTallerRejectModalError(null)
    setTallerRejectModalOpen(true)
  }

  const closeTallerRejectModal = () => {
    if (isTallerRejectSubmitLoading) return
    setTallerRejectModalOpen(false)
    setTallerRejectTarget(null)
    setTallerRejectMotivo('')
    setTallerRejectModalError(null)
  }

  const confirmAlmacenEntry = async () => {
    if (!almacenTarget) return
    const motivo = almacenMotivo.trim()
    if (motivo.length < 5) {
      setAlmacenModalError('El motivo debe tener al menos 5 caracteres.')
      return
    }

    const ok = await onApproveAlmacen(almacenTarget.id, motivo)
    if (ok) {
      closeAlmacenModal()
      return
    }

    setAlmacenModalError('No se pudo registrar la entrada de almacen.')
  }

  const confirmTallerReject = async () => {
    if (!tallerRejectTarget) return
    const motivo = tallerRejectMotivo.trim()
    if (motivo.length < 5) {
      setTallerRejectModalError('El motivo debe tener al menos 5 caracteres.')
      return
    }

    const ok = await onApproveTaller(tallerRejectTarget.id, false, motivo)
    if (ok) {
      closeTallerRejectModal()
      return
    }

    setTallerRejectModalError('No se pudo rechazar la aprobacion de taller.')
  }

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
                      {policy.canMutate ? 'Editable' : 'Solo visualizacion'}
                    </Badge>
                  </div>

                  <div className="hidden lg:grid lg:grid-cols-[1fr_3fr] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                    <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Origen</span>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Detalle por accion
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200/60">
                    {registros.map((item, itemIndex) => {
                      const aprobacionTaller = resolveAprobacion(item.aprobacionTallerEstado)
                      const aprobacionAlmacen = resolveAprobacion(item.aprobacionAlmacenEstado)
                      const isTallerLoading = !!tallerApprovalLoadingById[item.id]
                      const isAlmacenLoading = !!almacenApprovalLoadingById[item.id]

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
                        <div key={`${fecha}-${item.id}-${itemIndex}`} className="px-4 py-3">
                          <div className="grid gap-1 lg:grid-cols-[1fr_3fr] lg:items-start">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.origenNombre}</p>
                              <p className="text-[11px] text-slate-500">
                                {item.tipo} / {item.dimension}
                              </p>
                              <p className="mt-1 text-[11px] font-medium text-slate-600">
                                Total: {item.totalLosas} losas / {item.totalM2.toFixed(2)} m2
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className={cn('text-[10px]', approvalBadgeClass[aprobacionTaller])}>
                                  Taller: {approvalLabel[aprobacionTaller]}
                                </Badge>
                                <Badge variant="outline" className={cn('text-[10px]', approvalBadgeClass[aprobacionAlmacen])}>
                                  Almacen: {approvalLabel[aprobacionAlmacen]}
                                </Badge>
                              </div>

                              {(canApproveTaller || canApproveAlmacen) && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {canApproveTaller && aprobacionTaller !== 'aprobado' && (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={isTallerLoading || isAlmacenLoading}
                                        onClick={() => {
                                          void onApproveTaller(item.id, true)
                                        }}
                                      >
                                        {isTallerLoading ? 'Procesando...' : 'Aprobar taller'}
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] border-rose-200 text-rose-700"
                                        disabled={isTallerLoading || isAlmacenLoading}
                                        onClick={() => {
                                          openTallerRejectModal(item)
                                        }}
                                      >
                                        Rechazar taller
                                      </Button>
                                    </>
                                  )}

                                  {canApproveAlmacen &&
                                    aprobacionTaller === 'aprobado' &&
                                    aprobacionAlmacen !== 'aprobado' && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={isTallerLoading || isAlmacenLoading}
                                        onClick={() => {
                                          openAlmacenModal(item)
                                        }}
                                      >
                                        {isAlmacenLoading ? 'Procesando...' : 'Dar entrada almacen'}
                                      </Button>
                                    )}
                                </div>
                              )}
                            </div>

                            <div className="overflow-x-auto">
                              <div className="min-w-[860px] overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                                <div className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px_100px] border-b border-slate-200/70 px-2.5 py-1">
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
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">
                                    Resina
                                  </span>
                                </div>

                                <div className="divide-y divide-slate-200/70">
                                  {accionesActivas.map((accion) => (
                                    <div key={`${item.id}-${accion.accion}`}>
                                      <div className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px_100px] items-center gap-2 border-b border-slate-200/70 bg-white/70 px-2.5 py-1.5">
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
                                        <span />
                                      </div>

                                      <div className="divide-y divide-slate-200/70">
                                        {accion.detalles.map((detalle, detalleIndex) => (
                                          <div
                                            key={`${item.id}-${accion.accion}-${detalle.id ?? 'detalle'}-${detalleIndex}`}
                                            className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px_100px] items-center gap-2 px-2.5 py-1.5"
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
                                            <span className="text-right text-sm font-semibold text-cyan-700">
                                              {detalle.cantidadResina != null && detalle.cantidadResina > 0
                                                ? detalle.cantidadResina.toFixed(2)
                                                : '-'}
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

        <Dialog
          open={almacenModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeAlmacenModal()
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Entrada a almacen</DialogTitle>
              <DialogDescription>
                Registra el motivo para aprobar la entrada al almacen.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {almacenTarget ? (
                <p className="text-xs text-slate-600">
                  {almacenTarget.fecha} - {almacenTarget.origenNombre}
                </p>
              ) : null}

              <Textarea
                value={almacenMotivo}
                onChange={(event) => {
                  setAlmacenMotivo(event.target.value)
                  if (almacenModalError) setAlmacenModalError(null)
                }}
                placeholder="Ejemplo: Entrada aprobada tras validacion de losas y metraje."
                rows={4}
                disabled={isAlmacenSubmitLoading}
              />

              {almacenModalError ? (
                <p className="text-xs text-destructive">{almacenModalError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeAlmacenModal}
                disabled={isAlmacenSubmitLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmAlmacenEntry()
                }}
                disabled={isAlmacenSubmitLoading}
              >
                {isAlmacenSubmitLoading ? 'Procesando...' : 'Confirmar entrada'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={tallerRejectModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeTallerRejectModal()
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rechazar aprobacion de taller</DialogTitle>
              <DialogDescription>
                Escribe el motivo de rechazo para este registro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {tallerRejectTarget ? (
                <p className="text-xs text-slate-600">
                  {tallerRejectTarget.fecha} - {tallerRejectTarget.origenNombre}
                </p>
              ) : null}

              <Textarea
                value={tallerRejectMotivo}
                onChange={(event) => {
                  setTallerRejectMotivo(event.target.value)
                  if (tallerRejectModalError) setTallerRejectModalError(null)
                }}
                placeholder="Ejemplo: Se detecto inconsistencia en losas o metraje reportado."
                rows={4}
                disabled={isTallerRejectSubmitLoading}
              />

              {tallerRejectModalError ? (
                <p className="text-xs text-destructive">{tallerRejectModalError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeTallerRejectModal}
                disabled={isTallerRejectSubmitLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                tone="danger"
                onClick={() => {
                  void confirmTallerReject()
                }}
                disabled={isTallerRejectSubmitLoading}
              >
                {isTallerRejectSubmitLoading ? 'Procesando...' : 'Confirmar rechazo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
