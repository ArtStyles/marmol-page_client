'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import {
  approveInventarioMovimiento,
  getBloques,
  getInventarioMovimientosPage,
  getMonoHiloMasas,
  rejectInventarioMovimiento,
  updateMonoHiloMasaUbicacion,
} from '@/lib/resources-api'
import {
  type BloqueOLote,
  type InventarioMovimiento,
  getMonoHiloLosasDisponibles,
  getMonoHiloTotalLosasDisponibles,
  type MonoHiloMasa,
} from '@/lib/types'
import { Search } from 'lucide-react'

const MOVIMIENTOS_PAGE_SIZE = 10

const movimientoEstadoBadgeClass: Record<InventarioMovimiento['estado'], string> = {
  pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
  aprobado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rechazado: 'border-rose-200 bg-rose-50 text-rose-700',
}

const movimientoEstadoLabel: Record<InventarioMovimiento['estado'], string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

function readSessionUser(): AdminUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    return null
  }
}

function formatDate(value: string): string {
  if (!value) return '--'
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-CU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

function formatDateTime(value: string | undefined): string {
  if (!value) return '--'
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value

  return new Intl.DateTimeFormat('es-CU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed)
}

function isMassMovimiento(movimiento: InventarioMovimiento): boolean {
  return movimiento.detalles.some(
    (detalle) => detalle.detalleTipo === 'masa' || Boolean(detalle.masaId),
  )
}

function buildMassMovimientoSummary(movimiento: InventarioMovimiento): string {
  const detalle = movimiento.detalles.find(
    (item) => item.detalleTipo === 'masa' || Boolean(item.masaId),
  )
  if (!detalle) return movimiento.motivo

  const parts = [
    detalle.masaCodigo ?? detalle.productoNombre,
    detalle.origenNombre ? `Bloque ${detalle.origenNombre}` : null,
    detalle.masaMedidas ?? null,
    detalle.dimension ? `Ref ${detalle.dimension}` : null,
  ]

  return parts.filter(Boolean).join(' - ')
}

export default function InventarioMasasPage() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [bloques, setBloques] = useState<BloqueOLote[]>([])
  const [monoHiloMasas, setMonoHiloMasas] = useState<MonoHiloMasa[]>([])
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [movimientosLoading, setMovimientosLoading] = useState(true)
  const [movimientosLoadingMore, setMovimientosLoadingMore] = useState(false)
  const [movimientosHasMore, setMovimientosHasMore] = useState(false)
  const [movimientosNextCursor, setMovimientosNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [movimientosError, setMovimientosError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionTargetId, setActionTargetId] = useState<string | null>(null)
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [movimientoActionLoadingById, setMovimientoActionLoadingById] = useState<Record<string, boolean>>({})
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveDialogTargetId, setApproveDialogTargetId] = useState<string | null>(null)
  const [approveDialogError, setApproveDialogError] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectDialogTargetId, setRejectDialogTargetId] = useState<string | null>(null)
  const [rejectDialogMotivo, setRejectDialogMotivo] = useState('')
  const [rejectDialogError, setRejectDialogError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentUser(readSessionUser())
  }, [])

  useEffect(() => {
    let alive = true

    const loadInventario = async () => {
      setLoading(true)
      setError(null)
      try {
        const [bloquesData, masasData] = await Promise.all([getBloques(), getMonoHiloMasas()])
        if (!alive) return
        setBloques(bloquesData)
        setMonoHiloMasas(masasData)
      } catch (loadError) {
        if (!alive) return
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el inventario de masas.')
        setBloques([])
        setMonoHiloMasas([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadInventario()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true

    const loadMovimientosIniciales = async () => {
      setMovimientosLoading(true)
      setMovimientosError(null)
      try {
        const data = await getInventarioMovimientosPage({
          limit: MOVIMIENTOS_PAGE_SIZE,
          detalleTipo: 'masa',
        })
        if (!alive) return
        setMovimientos(data.items.filter(isMassMovimiento))
        setMovimientosHasMore(data.hasMore)
        setMovimientosNextCursor(data.nextCursor)
      } catch (loadError) {
        if (!alive) return
        setMovimientosError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar las solicitudes de entrada de masas.',
        )
        setMovimientos([])
        setMovimientosHasMore(false)
        setMovimientosNextCursor(null)
      } finally {
        if (alive) setMovimientosLoading(false)
      }
    }

    void loadMovimientosIniciales()

    return () => {
      alive = false
    }
  }, [])

  const canSendToPicado = currentUser ? hasPermission(currentUser, 'inventario:approve') : false
  const canApproveMovimientos = canSendToPicado

  const blockCodeById = useMemo(
    () =>
      new Map(
        bloques.map((bloque) => [bloque.id.trim(), getBloqueCodigo(bloque)]),
      ),
    [bloques],
  )

  const resolveBlockCode = (masa: MonoHiloMasa): string =>
    blockCodeById.get(masa.bloqueId.trim()) ||
    masa.bloqueCodigo.trim() ||
    masa.bloqueNombre.trim() ||
    'SIN-CODIGO'

  const filteredMasas = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const sorted = [...monoHiloMasas].sort(
      (a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro) || b.codigo.localeCompare(a.codigo),
    )

    if (!query) return sorted

    return sorted.filter((masa) =>
      [
        masa.codigo,
        resolveBlockCode(masa),
        masa.bloqueNombre,
        masa.observaciones,
        masa.ubicacion,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [monoHiloMasas, searchTerm, blockCodeById])

  const resumen = useMemo(
    () =>
      filteredMasas.reduce(
        (acc, masa) => {
          acc.total += 1
          if (masa.ubicacion === 'almacen') acc.almacen += 1
          if (masa.ubicacion === 'proceso') acc.proceso += 1
          if (masa.ubicacion === 'consumida') acc.consumida += 1
          if (masa.estado === 'anulada') acc.anuladas += 1
          const disponibles = getMonoHiloTotalLosasDisponibles(masa)
          acc.losasDisponibles += disponibles
          if (masa.ubicacion === 'almacen' && disponibles > 0 && masa.estado !== 'anulada') {
            acc.listasParaPicar += 1
          }
          return acc
        },
        {
          total: 0,
          almacen: 0,
          proceso: 0,
          consumida: 0,
          anuladas: 0,
          listasParaPicar: 0,
          losasDisponibles: 0,
        },
      ),
    [filteredMasas],
  )

  const movimientosOrdenados = useMemo(
    () => [...movimientos].sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud)),
    [movimientos],
  )

  const movimientosPendientes = useMemo(
    () => movimientos.filter((movimiento) => movimiento.estado === 'pendiente').length,
    [movimientos],
  )

  const actionTarget = useMemo(
    () => filteredMasas.find((masa) => masa.id === actionTargetId) ?? null,
    [actionTargetId, filteredMasas],
  )

  const approveDialogTarget = useMemo(
    () => movimientos.find((movimiento) => movimiento.id === approveDialogTargetId) ?? null,
    [approveDialogTargetId, movimientos],
  )

  const rejectDialogTarget = useMemo(
    () => movimientos.find((movimiento) => movimiento.id === rejectDialogTargetId) ?? null,
    [movimientos, rejectDialogTargetId],
  )

  const isApproveDialogLoading = approveDialogTargetId
    ? !!movimientoActionLoadingById[approveDialogTargetId]
    : false
  const isRejectDialogLoading = rejectDialogTargetId
    ? !!movimientoActionLoadingById[rejectDialogTargetId]
    : false

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen de masas" meta={`${resumen.total} visibles`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>En almacen</span>
            <span className="font-semibold text-slate-900">{resumen.almacen}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>En proceso</span>
            <span className="font-semibold text-slate-900">{resumen.proceso}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Consumidas</span>
            <span className="font-semibold text-slate-900">{resumen.consumida}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Anuladas</span>
            <span className="font-semibold text-slate-900">{resumen.anuladas}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Picado" meta="Salida desde este inventario">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Masas listas</span>
            <span className="font-semibold text-amber-700">{resumen.listasParaPicar}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Losas estimadas disp.</span>
            <span className="font-semibold text-slate-900">
              {Math.trunc(resumen.losasDisponibles).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            El picado se despacha desde aqui. El regreso de remanentes entra por solicitud.
          </p>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Solicitudes de entrada" meta="Masas en retorno">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Pendientes</span>
            <span className="font-semibold text-amber-700">{movimientosPendientes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Registradas</span>
            <span className="font-semibold text-slate-900">{movimientos.length}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Las entradas pendientes de masas se aprueban desde esta misma vista.
          </p>
        </div>
      </AdminPanelCard>
    </div>
  )

  const openEnviarAPicado = (masaId: string) => {
    if (!canSendToPicado) return
    setActionError(null)
    setNotice(null)
    setActionTargetId(masaId)
  }

  const closeEnviarAPicado = () => {
    if (actionSubmitting) return
    setActionTargetId(null)
  }

  const confirmEnviarAPicado = async () => {
    if (!actionTarget) return
    setActionSubmitting(true)
    setActionError(null)
    try {
      const updated = await updateMonoHiloMasaUbicacion(actionTarget.id, {
        ubicacionDestino: 'proceso',
      })
      setMonoHiloMasas((prev) => prev.map((masa) => (masa.id === updated.id ? updated : masa)))
      setNotice(`Masa ${updated.codigo} enviada a proceso para picado.`)
      setActionTargetId(null)
    } catch (submitError) {
      setActionError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar la masa a proceso.',
      )
    } finally {
      setActionSubmitting(false)
    }
  }

  const reloadMasas = async () => {
    const masasData = await getMonoHiloMasas()
    setMonoHiloMasas(masasData)
  }

  const loadMoreMovimientos = async () => {
    if (!movimientosHasMore || !movimientosNextCursor || movimientosLoadingMore) return

    setMovimientosLoadingMore(true)
    setMovimientosError(null)
    try {
      const data = await getInventarioMovimientosPage({
        limit: MOVIMIENTOS_PAGE_SIZE,
        cursor: movimientosNextCursor,
        detalleTipo: 'masa',
      })
      const nextItems = data.items.filter(isMassMovimiento)
      setMovimientos((prev) => {
        const seen = new Set(prev.map((item) => item.id))
        return [...prev, ...nextItems.filter((item) => !seen.has(item.id))]
      })
      setMovimientosHasMore(data.hasMore)
      setMovimientosNextCursor(data.nextCursor)
    } catch (loadError) {
      setMovimientosError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar mas solicitudes de masas.',
      )
    } finally {
      setMovimientosLoadingMore(false)
    }
  }

  const closeApproveDialog = () => {
    if (isApproveDialogLoading) return
    setApproveDialogOpen(false)
    setApproveDialogTargetId(null)
    setApproveDialogError(null)
  }

  const closeRejectDialog = () => {
    if (isRejectDialogLoading) return
    setRejectDialogOpen(false)
    setRejectDialogTargetId(null)
    setRejectDialogMotivo('')
    setRejectDialogError(null)
  }

  const handleApproveMovimiento = (movimientoId: string) => {
    if (!canApproveMovimientos) return
    setApproveDialogTargetId(movimientoId)
    setApproveDialogError(null)
    setApproveDialogOpen(true)
  }

  const confirmApproveMovimiento = async () => {
    if (!approveDialogTargetId) return
    setMovimientosError(null)
    setApproveDialogError(null)
    setMovimientoActionLoadingById((prev) => ({ ...prev, [approveDialogTargetId]: true }))

    try {
      const updated = await approveInventarioMovimiento(approveDialogTargetId, {})
      setMovimientos((prev) =>
        prev.map((movimiento) => (movimiento.id === updated.id ? updated : movimiento)),
      )
      await reloadMasas()
      setNotice(`Solicitud ${updated.id} aprobada y masa retornada a almacen.`)
      closeApproveDialog()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo aprobar la solicitud de entrada.'
      setMovimientosError(message)
      setApproveDialogError(message)
    } finally {
      setMovimientoActionLoadingById((prev) => ({ ...prev, [approveDialogTargetId]: false }))
    }
  }

  const handleRejectMovimiento = (movimientoId: string) => {
    if (!canApproveMovimientos) return
    setRejectDialogTargetId(movimientoId)
    setRejectDialogMotivo('')
    setRejectDialogError(null)
    setRejectDialogOpen(true)
  }

  const confirmRejectMovimiento = async () => {
    if (!rejectDialogTargetId) return
    const motivo = rejectDialogMotivo.trim()
    if (motivo.length < 5) {
      setRejectDialogError('El motivo de rechazo debe tener al menos 5 caracteres.')
      return
    }

    setMovimientosError(null)
    setRejectDialogError(null)
    setMovimientoActionLoadingById((prev) => ({ ...prev, [rejectDialogTargetId]: true }))

    try {
      const updated = await rejectInventarioMovimiento(rejectDialogTargetId, {
        motivoRechazo: motivo,
      })
      setMovimientos((prev) =>
        prev.map((movimiento) => (movimiento.id === updated.id ? updated : movimiento)),
      )
      setNotice(`Solicitud ${updated.id} rechazada.`)
      closeRejectDialog()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo rechazar la solicitud de entrada.'
      setMovimientosError(message)
      setRejectDialogError(message)
    } finally {
      setMovimientoActionLoadingById((prev) => ({ ...prev, [rejectDialogTargetId]: false }))
    }
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Inventario de masas</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Aqui se controla la salida de masas a picado y el seguimiento operativo de cada masa.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-700">
            Picado anclado aqui
          </Badge>
        </div>

        <div className="rounded-[var(--agent-radius-panel)] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por masa, bloque o nota..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {actionError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[var(--agent-radius-panel)] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              {filteredMasas.length} visibles
            </Badge>
          </div>

          {loading ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              Cargando inventario de masas...
            </div>
          ) : error ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : filteredMasas.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              No hay masas para los filtros actuales.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Masa</th>
                    <th className="px-2 py-2">Bloque</th>
                    <th className="px-2 py-2">Dimensiones (cm)</th>
                    <th className="px-2 py-2">Estimado / disponible</th>
                    <th className="px-2 py-2">Ubicacion</th>
                    <th className="px-2 py-2 text-right">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMasas.map((masa) => {
                    const resumenDimensiones = Object.keys(masa.estimados).map((dimension) => ({
                      dimension,
                      estimado: masa.estimados[dimension],
                      disponibles: getMonoHiloLosasDisponibles(masa, dimension),
                    }))
                    const disponiblesTotales = getMonoHiloTotalLosasDisponibles(masa)
                    const canSendCurrent =
                      canSendToPicado &&
                      masa.estado !== 'anulada' &&
                      masa.ubicacion === 'almacen' &&
                      disponiblesTotales > 0

                    return (
                      <tr key={masa.id} className="border-b border-slate-200/70 text-slate-900 last:border-b-0">
                        <td className="px-2 py-3">
                          <p className="font-semibold">{masa.codigo}</p>
                          <p className="text-xs text-slate-500">{formatDate(masa.fechaRegistro)}</p>
                        </td>
                        <td className="px-2 py-3 text-xs text-slate-700">{resolveBlockCode(masa)}</td>
                        <td className="px-2 py-3 text-xs text-slate-700">
                          {masa.largoCm.toFixed(2)} x {masa.anchoCm.toFixed(2)} x {masa.profundidadCm.toFixed(2)}
                        </td>
                        <td className="px-2 py-3 text-xs text-slate-700">
                          {resumenDimensiones.map((item) => (
                            <p key={`${masa.id}-${item.dimension}`}>
                              {item.dimension}: {item.estimado?.losasEstimadas ?? 0} / {item.disponibles}
                            </p>
                          ))}
                        </td>
                        <td className="px-2 py-3">
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                            {masa.ubicacion}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 text-right">
                          {canSendCurrent ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                openEnviarAPicado(masa.id)
                              }}
                            >
                              Enviar a picado
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {masa.ubicacion === 'proceso'
                                ? 'Ya en proceso'
                                : masa.estado === 'anulada'
                                  ? 'Anulada'
                                  : 'Sin salida disponible'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[var(--agent-radius-panel)] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Entradas desde proceso</p>
              <h2 className="text-lg font-semibold text-slate-900">Solicitudes de retorno de masas</h2>
              <p className="mt-1 text-xs text-slate-500">
                Produccion diaria solicita la entrada y almacen la aprueba o la rechaza aqui.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-700">
              {movimientosPendientes} pendientes
            </Badge>
          </div>

          {movimientosError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {movimientosError}
            </div>
          ) : null}

          {movimientosLoading ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              Cargando solicitudes de entrada...
            </div>
          ) : movimientosOrdenados.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              No hay solicitudes registradas para masas.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {movimientosOrdenados.map((movimiento) => {
                const detalle = movimiento.detalles.find(
                  (item) => item.detalleTipo === 'masa' || Boolean(item.masaId),
                )
                const isActionLoading = !!movimientoActionLoadingById[movimiento.id]

                return (
                  <div key={movimiento.id} className="rounded-xl border border-slate-200/80 bg-white/70 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{movimiento.id}</p>
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                            ENTRADA / almacen
                          </Badge>
                          <Badge
                            variant="outline"
                            className={movimientoEstadoBadgeClass[movimiento.estado]}
                          >
                            {movimientoEstadoLabel[movimiento.estado]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Fecha: {formatDateTime(movimiento.fechaSolicitud)} - Motivo: {movimiento.motivo}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{buildMassMovimientoSummary(movimiento)}</p>
                        {detalle ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Disponible al solicitar: {detalle.cantidadLosas.toLocaleString()} losas
                          </p>
                        ) : null}
                        {movimiento.motivoRechazo ? (
                          <p className="mt-1 text-[11px] text-rose-700">Rechazo: {movimiento.motivoRechazo}</p>
                        ) : null}
                      </div>

                      {canApproveMovimientos && movimiento.estado === 'pendiente' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isActionLoading}
                            onClick={() => {
                              handleApproveMovimiento(movimiento.id)
                            }}
                          >
                            Aprobar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={() => {
                              handleRejectMovimiento(movimiento.id)
                            }}
                          >
                            Rechazar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {movimientosHasMore ? (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void loadMoreMovimientos()
                    }}
                    disabled={movimientosLoadingMore}
                  >
                    {movimientosLoadingMore ? 'Cargando...' : 'Cargar mas'}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <AlertDialog
          open={Boolean(actionTarget)}
          onOpenChange={(open) => {
            if (!open) closeEnviarAPicado()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar masa a picado</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion mueve la masa de almacen a proceso para que pueda consumirse en picado.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {actionTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Masa: <span className="font-semibold">{actionTarget.codigo}</span>
                </p>
                <p>
                  Bloque: <span className="font-semibold">{resolveBlockCode(actionTarget)}</span>
                </p>
                <p>
                  Disponibilidad estimada:{' '}
                  <span className="font-semibold">
                    {Math.trunc(getMonoHiloTotalLosasDisponibles(actionTarget)).toLocaleString()} losas
                  </span>
                </p>
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionSubmitting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!actionTarget || actionSubmitting}
                onClick={(event) => {
                  event.preventDefault()
                  void confirmEnviarAPicado()
                }}
              >
                {actionSubmitting ? 'Procesando...' : 'Confirmar salida'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={approveDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeApproveDialog()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aprobar entrada de masa</AlertDialogTitle>
              <AlertDialogDescription>
                La masa volvera a almacen y quedara disponible nuevamente desde este inventario.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {approveDialogTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Solicitud: <span className="font-semibold">{approveDialogTarget.id}</span>
                </p>
                <p>{buildMassMovimientoSummary(approveDialogTarget)}</p>
              </div>
            ) : null}

            {approveDialogError ? (
              <p className="text-xs text-destructive">{approveDialogError}</p>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isApproveDialogLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!approveDialogTarget || isApproveDialogLoading}
                onClick={(event) => {
                  event.preventDefault()
                  void confirmApproveMovimiento()
                }}
              >
                {isApproveDialogLoading ? 'Procesando...' : 'Aprobar entrada'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={rejectDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeRejectDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rechazar entrada de masa</DialogTitle>
            </DialogHeader>

            {rejectDialogTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Solicitud: <span className="font-semibold">{rejectDialogTarget.id}</span>
                </p>
                <p>{buildMassMovimientoSummary(rejectDialogTarget)}</p>
              </div>
            ) : null}

            <div className="space-y-1">
              <Textarea
                value={rejectDialogMotivo}
                onChange={(event) => {
                  setRejectDialogMotivo(event.target.value)
                  if (rejectDialogError) setRejectDialogError(null)
                }}
                placeholder="Motivo del rechazo (minimo 5 caracteres)."
                rows={3}
                disabled={isRejectDialogLoading}
              />
            </div>

            {rejectDialogError ? (
              <p className="text-xs text-destructive">{rejectDialogError}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeRejectDialog}
                disabled={isRejectDialogLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void confirmRejectMovimiento()
                }}
                disabled={isRejectDialogLoading}
              >
                {isRejectDialogLoading ? 'Procesando...' : 'Confirmar rechazo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  )
}
