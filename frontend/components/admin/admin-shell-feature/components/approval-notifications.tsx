'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, LogOut, RefreshCw, User } from 'lucide-react'
import { Button } from '@/components/admin/admin-button'
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
import { cn } from '@/lib/utils'
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

const isMonoHiloProduccion = (registro: Pick<ProduccionDiaria, 'workflowTipo'>): boolean =>
  registro.workflowTipo === 'mono_hilo'

const buildProduccionNotificationDetail = (registro: ProduccionDiaria): string => {
  if (!isMonoHiloProduccion(registro)) {
    return `${registro.fecha} - ${registro.origenNombre} - ${registro.totalLosas} losas`
  }

  const masasCount = registro.monoHiloDetalle?.masas.length ?? 0
  const masasLabel = masasCount === 1 ? 'masa' : 'masas'
  return `${registro.fecha} - ${registro.origenNombre} - ${masasCount} ${masasLabel}`
}

type ApprovalNotificationsProps = {
  sessionUser: AdminUser | null
  onLogout: () => void
  compact?: boolean
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

async function loadPendingInventarioMovimientos(
  options: { maxPages?: number } = {},
): Promise<InventarioMovimiento[]> {
  const items: InventarioMovimiento[] = []
  const seen = new Set<string>()
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY
  let cursor: string | undefined
  let hasMore = true
  let pagesLoaded = 0

  while (hasMore && pagesLoaded < maxPages) {
    const page = await getInventarioMovimientosPage({
      limit: 50,
      cursor,
      estado: 'pendiente',
    })
    pagesLoaded += 1

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

export const ApprovalNotifications = ({
  sessionUser,
  onLogout,
  compact = false,
}: ApprovalNotificationsProps) => {
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveDialogTarget, setApproveDialogTarget] = useState<ApprovalNotification | null>(null)
  const [approveDialogError, setApproveDialogError] = useState<string | null>(null)
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
  const canRejectProduccionAlmacen = canApproveTaller
  const canManageApprovals = canApproveTaller || canApproveAlmacen
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

  const canApproveNotification = useCallback(
    (item: ApprovalNotification): boolean => {
      if (item.type === 'produccion_taller') return canApproveTaller
      if (item.type === 'produccion_almacen') return canApproveAlmacen
      return canApproveAlmacen
    },
    [canApproveAlmacen, canApproveTaller],
  )

  const canRejectNotification = useCallback(
    (item: ApprovalNotification): boolean => {
      if (item.type === 'produccion_taller') return canApproveTaller
      if (item.type === 'produccion_almacen') return canRejectProduccionAlmacen
      return canApproveAlmacen
    },
    [canApproveAlmacen, canApproveTaller, canRejectProduccionAlmacen],
  )

  const loadNotifications = useCallback(async (options: { lightweight?: boolean } = {}) => {
    if (!canManageApprovals) {
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
          ? loadPendingInventarioMovimientos({
              maxPages: options.lightweight ? 1 : Number.POSITIVE_INFINITY,
            })
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
            detail: buildProduccionNotificationDetail(registro),
            href: scopedRoute('/admin/produccion'),
            timestamp: toTimestamp(registro.fecha),
          })
        }
      }

      if (canApproveAlmacen || canRejectProduccionAlmacen) {
        for (const registro of produccion) {
          if (isMonoHiloProduccion(registro)) continue
          if (resolveAprobacion(registro.aprobacionTallerEstado) !== 'aprobado') continue
          if (resolveAprobacion(registro.aprobacionAlmacenEstado) !== 'pendiente') continue
          pending.push({
            id: `prod-almacen-${registro.id}`,
            type: 'produccion_almacen',
            referenceId: registro.id,
            title: 'Entrada a almacen pendiente',
            detail: buildProduccionNotificationDetail(registro),
            href: scopedRoute('/admin/produccion'),
            timestamp: toTimestamp(registro.fecha),
          })
        }

        if (canApproveAlmacen) {
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
    canManageApprovals,
    canReadInventario,
    canReadProduccion,
    canRejectProduccionAlmacen,
    scopedRoute,
  ])

  useEffect(() => {
    void loadNotifications({ lightweight: true })
  }, [loadNotifications])

  useEffect(() => {
    if (!dialogOpen) return

    const poll = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      void loadNotifications({ lightweight: true })
    }

    const timerId = window.setInterval(poll, 60_000)
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        void loadNotifications({ lightweight: true })
      }
    }

    window.addEventListener('focus', onVisibilityChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timerId)
      window.removeEventListener('focus', onVisibilityChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [dialogOpen, loadNotifications])

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

  const closeApproveDialog = useCallback(() => {
    const isBusy = approveDialogTarget ? !!actionLoadingById[approveDialogTarget.id] : false
    if (isBusy) return
    setApproveDialogOpen(false)
    setApproveDialogTarget(null)
    setApproveDialogError(null)
  }, [actionLoadingById, approveDialogTarget])

  const closeRejectDialog = useCallback(() => {
    const isBusy = rejectDialogTarget ? !!actionLoadingById[rejectDialogTarget.id] : false
    if (isBusy) return
    setRejectDialogOpen(false)
    setRejectDialogTarget(null)
    setRejectDialogMotivo('')
    setRejectDialogError(null)
  }, [actionLoadingById, rejectDialogTarget])

  const confirmApproval = useCallback(async () => {
    if (!approveDialogTarget) return

    const ok = await runAction(approveDialogTarget.id, async () => {
      if (approveDialogTarget.type === 'produccion_almacen') {
        await approveProduccionAlmacen(approveDialogTarget.referenceId, {
          motivo: 'Aprobacion confirmada en modal',
        })
        return
      }

      if (approveDialogTarget.type === 'inventario_movimiento') {
        await approveInventarioMovimiento(approveDialogTarget.referenceId, {})
      }
    })

    if (ok) {
      closeApproveDialog()
    } else {
      setApproveDialogError('No se pudo aprobar la solicitud.')
    }
  }, [approveDialogTarget, closeApproveDialog, runAction])

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
    if (!canApproveNotification(item)) {
      setSyncError('No tienes permisos para aprobar esta solicitud.')
      return
    }

    if (item.type === 'produccion_taller') {
      void runAction(item.id, async () => {
        await approveProduccionTaller(item.referenceId, { aprobado: true })
      })
      return
    }

    setApproveDialogTarget(item)
    setApproveDialogError(null)
    setApproveDialogOpen(true)
  }

  const handleReject = (item: ApprovalNotification) => {
    const canReject = canRejectNotification(item)
    if (!canReject) {
      setSyncError('No tienes permisos para denegar esta solicitud.')
      return
    }

    setRejectDialogTarget(item)
    setRejectDialogMotivo('')
    setRejectDialogError(null)
    setRejectDialogOpen(true)
  }

  const totalPendientes = notifications.length
  const badgeClassName =
    totalPendientes > 0
      ? 'pointer-events-none absolute -right-2.5 -top-2.5 h-5 min-w-5 rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white'
      : 'pointer-events-none absolute -right-2.5 -top-2.5 h-5 min-w-5 rounded-full border-2 border-white bg-slate-200 px-1 text-[10px] font-bold leading-none text-slate-700'
  const iconButtonClassName = 'relative flex shrink-0 bg-white/70'

  return (
    <div className={cn('space-y-2', compact ? 'space-y-0' : 'space-y-3')}>
      <div className={cn('flex', compact ? 'justify-center' : 'justify-end')}>
        <div
          className={cn(
            'inline-flex shrink-0 rounded-[var(--dash-panel-radius-tight)] border border-white/70 bg-white/45 p-1.5 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.32)] backdrop-blur-sm',
            compact ? 'flex-col items-center gap-1.5' : 'items-center gap-2',
          )}
        >
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            className={iconButtonClassName}
            onClick={() => setAccountDialogOpen(true)}
            disabled={!sessionUser}
            aria-label="Detalles de cuenta"
            title="Detalles de cuenta"
          >
            <User className="h-5 w-5 text-slate-800" strokeWidth={2.2} />
            <span className="sr-only">Detalles de cuenta</span>
          </Button>
          <Button
            type="button"
            size="icon-lg"
            variant="outline"
            className={iconButtonClassName}
            onClick={() => {
              setDialogOpen(true)
              void loadNotifications()
            }}
            aria-label="Notificaciones"
          >
            <span className="relative inline-flex items-center justify-center leading-none">
              <Bell className="h-6 w-6 text-slate-800" strokeWidth={2.4} />
              <Badge className={badgeClassName}>
                {totalPendientes}
              </Badge>
            </span>
            <span className="sr-only">Notificaciones</span>
          </Button>
          <Button
            type="button"
            size="icon-lg"
            tone="danger"
            variant="outline"
            className="relative flex shrink-0"
            onClick={() => setLogoutDialogOpen(true)}
            disabled={!sessionUser}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
          >
            <LogOut className="h-5 w-5 text-red-700" strokeWidth={2.2} />
            <span className="sr-only">Cerrar sesion</span>
          </Button>
        </div>
      </div>

      {!compact && syncError ? <p className="text-xs text-destructive">{syncError}</p> : null}

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cierre de sesion</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion cerrara tu sesion actual y te llevara al inicio de sesion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200"
              onClick={onLogout}
            >
              Cerrar sesion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de cuenta</DialogTitle>
            <DialogDescription>
              Informacion del usuario autenticado en esta sesion.
            </DialogDescription>
          </DialogHeader>
          {sessionUser ? (
            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/70 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Nombre</p>
                <p className="mt-1 font-semibold text-slate-900">{sessionUser.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Correo</p>
                <p className="mt-1 text-slate-800">{sessionUser.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rol</p>
                  <p className="mt-1 text-slate-800">{sessionUser.role}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Taller</p>
                  <p className="mt-1 text-slate-800">{sessionUser.workshopId ?? 'Global'}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No hay una sesion activa.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  const canApprove = canApproveNotification(item)
                  const canReject = canRejectNotification(item)

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
                          disabled={isActionLoading || !canApprove}
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
                      {canReject && !canApprove && item.type === 'produccion_almacen' ? (
                        <p className="mt-2 text-[11px] text-slate-600">
                          Puedes denegar esta solicitud; la aprobacion la realiza almacen.
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
        open={approveDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeApproveDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approveDialogTarget?.type === 'produccion_almacen'
                ? 'Confirmar entrada a almacen'
                : 'Confirmar movimiento de almacen'}
            </DialogTitle>
            <DialogDescription>
              Esta accion aprobara la solicitud seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {approveDialogTarget ? (
              <p className="text-xs text-slate-600">{approveDialogTarget.detail}</p>
            ) : null}
            {approveDialogError ? (
              <p className="text-xs text-destructive">{approveDialogError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeApproveDialog}
              disabled={approveDialogTarget ? !!actionLoadingById[approveDialogTarget.id] : false}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                void confirmApproval()
              }}
              disabled={approveDialogTarget ? !!actionLoadingById[approveDialogTarget.id] : false}
            >
              {approveDialogTarget && actionLoadingById[approveDialogTarget.id]
                ? 'Procesando...'
                : 'Confirmar'}
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

