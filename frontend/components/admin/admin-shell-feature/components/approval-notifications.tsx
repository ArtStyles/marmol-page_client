'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { hasPermission, type AdminUser } from '@/lib/admin-auth'
import { extractWorkshopIdFromAdminPath, routeWithWorkshop } from '@/lib/admin-routes'
import {
  approveInventarioMovimiento,
  approveProduccionAlmacen,
  approveProduccionTaller,
  getInventarioMovimientosPage,
  getProduccion,
  rejectInventarioMovimiento,
} from '@/lib/resources-api'
import type { EstadoAprobacion, InventarioMovimiento, ProduccionDiaria } from '@/lib/types'
import { WORKSHOP_STORAGE_KEY } from '@/lib/workshops'

type ApprovalNotificationType =
  | 'produccion_taller'
  | 'produccion_almacen'
  | 'inventario_movimiento'

type ApprovalNotification = {
  id: string
  type: ApprovalNotificationType
  referenceId: string
  title: string
  detail: string
  href: string
  timestamp: number
}

type ApprovalNotificationsProps = {
  sessionUser: AdminUser | null
}

const resolveAprobacion = (value: EstadoAprobacion | undefined): EstadoAprobacion => {
  if (value === 'aprobado' || value === 'rechazado') return value
  return 'pendiente'
}

const toTimestamp = (value: string | undefined): number => {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function loadPendingInventarioMovimientos(): Promise<InventarioMovimiento[]> {
  const items: InventarioMovimiento[] = []
  const seen = new Set<string>()
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const page = await getInventarioMovimientosPage({
      limit: 50,
      cursor,
      estado: 'pendiente',
    })

    for (const item of page.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }

    hasMore = page.hasMore && !!page.nextCursor
    cursor = page.nextCursor ?? undefined
  }

  return items
}

export const ApprovalNotifications = ({ sessionUser }: ApprovalNotificationsProps) => {
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [almacenDialogOpen, setAlmacenDialogOpen] = useState(false)
  const [almacenDialogTarget, setAlmacenDialogTarget] = useState<ApprovalNotification | null>(null)
  const [almacenDialogMotivo, setAlmacenDialogMotivo] = useState('')
  const [almacenDialogError, setAlmacenDialogError] = useState<string | null>(null)
  const [inventarioApproveDialogOpen, setInventarioApproveDialogOpen] = useState(false)
  const [inventarioApproveTarget, setInventarioApproveTarget] = useState<ApprovalNotification | null>(null)
  const [inventarioApproveObservaciones, setInventarioApproveObservaciones] = useState('')
  const [inventarioApproveError, setInventarioApproveError] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectDialogTarget, setRejectDialogTarget] = useState<ApprovalNotification | null>(null)
  const [rejectDialogMotivo, setRejectDialogMotivo] = useState('')
  const [rejectDialogError, setRejectDialogError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([])
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, boolean>>({})

  const isSuperAdmin = sessionUser?.role === 'Super Admin'
  const canApproveTaller = isSuperAdmin || hasPermission(sessionUser, 'produccion:approve_taller')
  const canApproveAlmacen = isSuperAdmin || hasPermission(sessionUser, 'inventario:approve')
  const canReadProduccion = isSuperAdmin || hasPermission(sessionUser, 'produccion:read')
  const canReadInventario = isSuperAdmin || hasPermission(sessionUser, 'inventario:read')

  const workshopScopeId = useMemo(() => {
    if (!sessionUser) return null
    if (!hasPermission(sessionUser, 'workshops:override_scope')) {
      return sessionUser.workshopId ?? null
    }

    if (typeof window === 'undefined') {
      return extractWorkshopIdFromAdminPath(pathname)
    }

    const storedWorkshop = window.localStorage.getItem(WORKSHOP_STORAGE_KEY)
    return storedWorkshop ?? extractWorkshopIdFromAdminPath(pathname)
  }, [pathname, sessionUser])

  const scopedRoute = useCallback(
    (path: string): string => routeWithWorkshop(path, workshopScopeId),
    [workshopScopeId],
  )

  const loadNotifications = useCallback(async () => {
    if (!canApproveTaller && !canApproveAlmacen) {
      setNotifications([])
      setSyncError(null)
      return
    }

    setLoading(true)
    setSyncError(null)

    try {
      const produccionPromise: Promise<ProduccionDiaria[]> =
        (canApproveTaller || canApproveAlmacen) && canReadProduccion
          ? getProduccion()
          : Promise.resolve([])
      const inventarioPromise: Promise<InventarioMovimiento[]> =
        canApproveAlmacen && canReadInventario
          ? loadPendingInventarioMovimientos()
          : Promise.resolve([])

      const [produccion, movimientosInventario] = await Promise.all([
        produccionPromise,
        inventarioPromise,
      ])

      const pending: ApprovalNotification[] = []

      if (canApproveTaller) {
        for (const registro of produccion) {
          if (resolveAprobacion(registro.aprobacionTallerEstado) !== 'pendiente') continue
          pending.push({
            id: `prod-taller-${registro.id}`,
            type: 'produccion_taller',
            referenceId: registro.id,
            title: 'Aprobacion de taller pendiente',
            detail: `${registro.fecha} - ${registro.origenNombre} - ${registro.totalLosas} losas`,
            href: scopedRoute('/admin/produccion'),
            timestamp: toTimestamp(registro.fecha),
          })
        }
      }

      if (canApproveAlmacen) {
        for (const registro of produccion) {
          if (resolveAprobacion(registro.aprobacionTallerEstado) !== 'aprobado') continue
          if (resolveAprobacion(registro.aprobacionAlmacenEstado) !== 'pendiente') continue
          pending.push({
            id: `prod-almacen-${registro.id}`,
            type: 'produccion_almacen',
            referenceId: registro.id,
            title: 'Entrada a almacen pendiente',
            detail: `${registro.fecha} - ${registro.origenNombre} - ${registro.totalLosas} losas`,
            href: scopedRoute('/admin/produccion'),
            timestamp: toTimestamp(registro.fecha),
          })
        }

        for (const movimiento of movimientosInventario) {
          if (movimiento.estado !== 'pendiente') continue
          pending.push({
            id: `inv-mov-${movimiento.id}`,
            type: 'inventario_movimiento',
            referenceId: movimiento.id,
            title: 'Movimiento de almacen pendiente',
            detail: `${movimiento.tipo} - ${movimiento.origen} - ${movimiento.motivo}`,
            href: scopedRoute('/admin/inventario'),
            timestamp: toTimestamp(movimiento.fechaSolicitud),
          })
        }
      }

      pending.sort((a, b) => b.timestamp - a.timestamp)
      setNotifications(pending)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No se pudieron cargar notificaciones.')
    } finally {
      setLoading(false)
    }
  }, [
    canApproveAlmacen,
    canApproveTaller,
    canReadInventario,
    canReadProduccion,
    scopedRoute,
  ])

  useEffect(() => {
    void loadNotifications()
    const timerId = window.setInterval(() => {
      void loadNotifications()
    }, 60_000)
    return () => {
      window.clearInterval(timerId)
    }
  }, [loadNotifications])

  const runAction = useCallback(
    async (notificationId: string, action: () => Promise<void>) => {
      setActionLoadingById((prev) => ({ ...prev, [notificationId]: true }))
      setSyncError(null)
      try {
        await action()
        await loadNotifications()
        return true
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'No se pudo procesar la aprobacion.')
        return false
      } finally {
        setActionLoadingById((prev) => ({ ...prev, [notificationId]: false }))
      }
    },
    [loadNotifications],
  )

  const closeAlmacenDialog = useCallback(() => {
    const isBusy = almacenDialogTarget ? !!actionLoadingById[almacenDialogTarget.id] : false
    if (isBusy) return
    setAlmacenDialogOpen(false)
    setAlmacenDialogTarget(null)
    setAlmacenDialogMotivo('')
    setAlmacenDialogError(null)
  }, [actionLoadingById, almacenDialogTarget])

  const closeInventarioApproveDialog = useCallback(() => {
    const isBusy = inventarioApproveTarget ? !!actionLoadingById[inventarioApproveTarget.id] : false
    if (isBusy) return
    setInventarioApproveDialogOpen(false)
    setInventarioApproveTarget(null)
    setInventarioApproveObservaciones('')
    setInventarioApproveError(null)
  }, [actionLoadingById, inventarioApproveTarget])

  const closeRejectDialog = useCallback(() => {
    const isBusy = rejectDialogTarget ? !!actionLoadingById[rejectDialogTarget.id] : false
    if (isBusy) return
    setRejectDialogOpen(false)
    setRejectDialogTarget(null)
    setRejectDialogMotivo('')
    setRejectDialogError(null)
  }, [actionLoadingById, rejectDialogTarget])

  const confirmAlmacenApproval = useCallback(async () => {
    if (!almacenDialogTarget) return

    const motivo = almacenDialogMotivo.trim()
    if (motivo.length < 5) {
      setAlmacenDialogError('Debes indicar un motivo de al menos 5 caracteres.')
      return
    }

    const ok = await runAction(almacenDialogTarget.id, async () => {
      await approveProduccionAlmacen(almacenDialogTarget.referenceId, { motivo })
    })

    if (ok) {
      closeAlmacenDialog()
    } else {
      setAlmacenDialogError('No se pudo aprobar la entrada de almacen.')
    }
  }, [almacenDialogMotivo, almacenDialogTarget, closeAlmacenDialog, runAction])

  const confirmInventarioApprove = useCallback(async () => {
    if (!inventarioApproveTarget) return

    const observaciones = inventarioApproveObservaciones.trim()
    const ok = await runAction(inventarioApproveTarget.id, async () => {
      await approveInventarioMovimiento(inventarioApproveTarget.referenceId, {
        observaciones: observaciones ? observaciones : undefined,
      })
    })

    if (ok) {
      closeInventarioApproveDialog()
    } else {
      setInventarioApproveError('No se pudo aprobar el movimiento de almacen.')
    }
  }, [
    closeInventarioApproveDialog,
    inventarioApproveObservaciones,
    inventarioApproveTarget,
    runAction,
  ])

  const confirmReject = useCallback(async () => {
    if (!rejectDialogTarget) return

    const motivo = rejectDialogMotivo.trim()
    if (motivo.length < 5) {
      setRejectDialogError('Debes indicar un motivo de al menos 5 caracteres.')
      return
    }

    const ok = await runAction(rejectDialogTarget.id, async () => {
      if (rejectDialogTarget.type === 'inventario_movimiento') {
        await rejectInventarioMovimiento(rejectDialogTarget.referenceId, {
          motivoRechazo: motivo,
        })
        return
      }

      await approveProduccionTaller(rejectDialogTarget.referenceId, {
        aprobado: false,
        motivoRechazo: motivo,
      })
    })

    if (ok) {
      closeRejectDialog()
    } else {
      setRejectDialogError('No se pudo completar el rechazo.')
    }
  }, [closeRejectDialog, rejectDialogMotivo, rejectDialogTarget, runAction])

  const handleApprove = (item: ApprovalNotification) => {
    if (item.type === 'produccion_taller') {
      void runAction(item.id, async () => {
        await approveProduccionTaller(item.referenceId, { aprobado: true })
      })
      return
    }

    if (item.type === 'produccion_almacen') {
      setAlmacenDialogTarget(item)
      setAlmacenDialogMotivo('')
      setAlmacenDialogError(null)
      setAlmacenDialogOpen(true)
      return
    }

    setInventarioApproveTarget(item)
    setInventarioApproveObservaciones('')
    setInventarioApproveError(null)
    setInventarioApproveDialogOpen(true)
  }

  const handleReject = (item: ApprovalNotification) => {
    const canReject = item.type === 'inventario_movimiento' || canApproveTaller
    if (!canReject) {
      setSyncError('Para denegar esta solicitud necesitas permiso de aprobacion de taller.')
      return
    }

    setRejectDialogTarget(item)
    setRejectDialogMotivo('')
    setRejectDialogError(null)
    setRejectDialogOpen(true)
  }

  const totalPendientes = notifications.length

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between bg-white/70"
        onClick={() => {
          setDialogOpen(true)
          void loadNotifications()
        }}
      >
        <span className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notificaciones
        </span>
        <Badge variant={totalPendientes > 0 ? 'default' : 'secondary'}>{totalPendientes}</Badge>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aprobaciones pendientes</DialogTitle>
            <DialogDescription>
              Gestiona aqui mismo las solicitudes que requieren aprobacion segun tus permisos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 bg-white/70"
                onClick={() => {
                  void loadNotifications()
                }}
                disabled={loading}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Actualizar
              </Button>
            </div>

            {syncError ? <p className="text-xs text-destructive">{syncError}</p> : null}

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-xs text-slate-500">Cargando notificaciones...</p>
              ) : null}

              {!loading && totalPendientes === 0 ? (
                <p className="text-xs text-slate-500">No tienes aprobaciones pendientes.</p>
              ) : null}

              {!loading &&
                notifications.map((item) => {
                  const isActionLoading = !!actionLoadingById[item.id]
                  const canReject = item.type === 'inventario_movimiento' || canApproveTaller

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-[11px] text-slate-600">{item.detail}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          disabled={isActionLoading}
                          onClick={() => handleApprove(item)}
                        >
                          {isActionLoading ? 'Procesando...' : 'Aprobar'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          tone="danger"
                          className="h-7 px-2 text-[11px]"
                          disabled={isActionLoading || !canReject}
                          onClick={() => handleReject(item)}
                        >
                          Denegar
                        </Button>
                        <Button asChild type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                          <Link href={item.href}>Ir al modulo</Link>
                        </Button>
                      </div>

                      {!canReject && item.type === 'produccion_almacen' ? (
                        <p className="mt-2 text-[11px] text-amber-700">
                          Solo usuarios con permiso de taller pueden denegar esta solicitud.
                        </p>
                      ) : null}
                    </div>
                  )
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={almacenDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAlmacenDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Entrada a almacen</DialogTitle>
            <DialogDescription>
              Escribe el motivo para aprobar esta entrada de produccion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {almacenDialogTarget ? (
              <p className="text-xs text-slate-600">{almacenDialogTarget.detail}</p>
            ) : null}
            <Textarea
              value={almacenDialogMotivo}
              onChange={(event) => {
                setAlmacenDialogMotivo(event.target.value)
                if (almacenDialogError) setAlmacenDialogError(null)
              }}
              rows={4}
              placeholder="Ejemplo: Entrada verificada por almacen y aprobada."
              disabled={
                almacenDialogTarget ? !!actionLoadingById[almacenDialogTarget.id] : false
              }
            />
            {almacenDialogError ? (
              <p className="text-xs text-destructive">{almacenDialogError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeAlmacenDialog}
              disabled={almacenDialogTarget ? !!actionLoadingById[almacenDialogTarget.id] : false}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                void confirmAlmacenApproval()
              }}
              disabled={almacenDialogTarget ? !!actionLoadingById[almacenDialogTarget.id] : false}
            >
              {almacenDialogTarget && actionLoadingById[almacenDialogTarget.id]
                ? 'Procesando...'
                : 'Aprobar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inventarioApproveDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeInventarioApproveDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aprobar movimiento de almacen</DialogTitle>
            <DialogDescription>
              Puedes agregar observaciones opcionales para esta aprobacion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {inventarioApproveTarget ? (
              <p className="text-xs text-slate-600">{inventarioApproveTarget.detail}</p>
            ) : null}
            <Textarea
              value={inventarioApproveObservaciones}
              onChange={(event) => {
                setInventarioApproveObservaciones(event.target.value)
                if (inventarioApproveError) setInventarioApproveError(null)
              }}
              rows={4}
              placeholder="Observaciones (opcional)."
              disabled={inventarioApproveTarget ? !!actionLoadingById[inventarioApproveTarget.id] : false}
            />
            {inventarioApproveError ? (
              <p className="text-xs text-destructive">{inventarioApproveError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeInventarioApproveDialog}
              disabled={inventarioApproveTarget ? !!actionLoadingById[inventarioApproveTarget.id] : false}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                void confirmInventarioApprove()
              }}
              disabled={inventarioApproveTarget ? !!actionLoadingById[inventarioApproveTarget.id] : false}
            >
              {inventarioApproveTarget && actionLoadingById[inventarioApproveTarget.id]
                ? 'Procesando...'
                : 'Aprobar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeRejectDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {rejectDialogTarget?.type === 'inventario_movimiento'
                ? 'Rechazar movimiento de almacen'
                : 'Rechazar solicitud'}
            </DialogTitle>
            <DialogDescription>
              Escribe el motivo del rechazo (minimo 5 caracteres).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {rejectDialogTarget ? (
              <p className="text-xs text-slate-600">{rejectDialogTarget.detail}</p>
            ) : null}
            <Textarea
              value={rejectDialogMotivo}
              onChange={(event) => {
                setRejectDialogMotivo(event.target.value)
                if (rejectDialogError) setRejectDialogError(null)
              }}
              rows={4}
              placeholder="Motivo del rechazo."
              disabled={rejectDialogTarget ? !!actionLoadingById[rejectDialogTarget.id] : false}
            />
            {rejectDialogError ? (
              <p className="text-xs text-destructive">{rejectDialogError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeRejectDialog}
              disabled={rejectDialogTarget ? !!actionLoadingById[rejectDialogTarget.id] : false}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              tone="danger"
              onClick={() => {
                void confirmReject()
              }}
              disabled={rejectDialogTarget ? !!actionLoadingById[rejectDialogTarget.id] : false}
            >
              {rejectDialogTarget && actionLoadingById[rejectDialogTarget.id]
                ? 'Procesando...'
                : 'Confirmar rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
