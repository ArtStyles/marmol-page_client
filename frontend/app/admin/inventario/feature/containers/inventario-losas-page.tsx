'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useInventarioStore } from '@/hooks/use-inventario'
import {
  approveInventarioMovimiento,
  createSalidaAjusteInventario,
  createSalidaProcesoInventario,
  getInventarioMovimientosPage,
  rejectInventarioMovimiento,
} from '@/lib/resources-api'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { dimensiones, estadosInventario, tiposProducto } from '@/lib/data'
import {
  type Dimension,
  type InventarioMovimiento,
  type Producto,
  type UbicacionInventario,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { BarChart3, ChevronDown, Search } from 'lucide-react'

type EstadoRow = {
  estado: Producto['estado']
  losas: number
  m2: number
}

type MetricView = 'both' | 'losas' | 'm2'
type UbicacionFilter = 'all' | UbicacionInventario
type ProcesoAccionObjetivo = 'escuadrar' | 'devastar' | 'resinar' | 'pulir'

type AccionFiltroResumenRow = {
  estado: Producto['estado']
  productos: number
  losas: number
  m2: number
}

const estadoOrden: Producto['estado'][] = [
  'Picado',
  'Escuadrado',
  'Devastado',
  'Resinado',
  'Pulido',
  'Recuperado',
  'Pendiente',
  'Redimensionado',
]

const inventoryChartConfig = {
  losas: {
    label: 'Losas',
    color: 'hsl(222, 47%, 11%)',
  },
  m2: {
    label: 'm2',
    color: 'hsl(160, 84%, 39%)',
  },
} satisfies ChartConfig

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

const movimientoTipoBadgeClass: Record<InventarioMovimiento['tipo'], string> = {
  entrada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  salida: 'border-indigo-200 bg-indigo-50 text-indigo-700',
}

const estadoRequeridoProcesoPorAccion: Record<ProcesoAccionObjetivo, Producto['estado']> = {
  escuadrar: 'Picado',
  devastar: 'Escuadrado',
  resinar: 'Devastado',
  pulir: 'Resinado',
}

const accionObjetivoProcesoLabel: Record<ProcesoAccionObjetivo, string> = {
  escuadrar: 'Escuadrar',
  devastar: 'Devastar',
  resinar: 'Resinar',
  pulir: 'Pulir',
}

const MOVIMIENTOS_PAGE_SIZE = 10

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

function buildEstadoRows(items: Producto[]): EstadoRow[] {
  return estadoOrden.map((estado) => {
    const itemsEstado = items.filter((item) => item.estado === estado)
    const losas = itemsEstado.reduce((sum, item) => sum + item.cantidadLosas, 0)
    const m2 = itemsEstado.reduce((sum, item) => sum + item.metrosCuadrados, 0)

    return {
      estado,
      losas,
      m2: Number(m2.toFixed(2)),
    }
  })
}

function isMetricView(value: string): value is MetricView {
  return value === 'both' || value === 'losas' || value === 'm2'
}

function buildProductoProcesoOptionLabel(
  producto: Pick<Producto, 'origenNombre' | 'estado' | 'dimension' | 'cantidadLosas'>,
): string {
  return [producto.origenNombre, producto.estado, producto.dimension, `${producto.cantidadLosas} losas`].join(' - ')
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

function resolveMovimientoBadgeDisplay(
  movimiento: InventarioMovimiento,
): { tipo: InventarioMovimiento['tipo']; origen: string } {
  if (movimiento.origen !== 'proceso') {
    return {
      tipo: movimiento.tipo,
      origen: movimiento.origen,
    }
  }

  const destinos = new Set(
    movimiento.detalles
      .map((detalle) => detalle.ubicacionDestino)
      .filter((ubicacion): ubicacion is UbicacionInventario => Boolean(ubicacion)),
  )
  const origenes = new Set(
    movimiento.detalles
      .map((detalle) => detalle.ubicacionOrigen)
      .filter((ubicacion): ubicacion is UbicacionInventario => Boolean(ubicacion)),
  )

  const esRetornoAAlmacen =
    destinos.size === 1 &&
    destinos.has('almacen') &&
    (origenes.size === 0 || (origenes.size === 1 && origenes.has('proceso')))
  if (esRetornoAAlmacen) {
    return {
      tipo: 'entrada',
      origen: 'almacen',
    }
  }

  const esSalidaAProceso = destinos.size === 1 && destinos.has('proceso')
  if (esSalidaAProceso) {
    return {
      tipo: 'salida',
      origen: 'proceso',
    }
  }

  return {
    tipo: movimiento.tipo,
    origen: movimiento.origen,
  }
}

export default function InventarioLosasPage() {
  const { productos, reload: reloadInventario } = useInventarioStore()
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [dimensionFilter, setDimensionFilter] = useState<string>('all')
  const [ubicacionFilter, setUbicacionFilter] = useState<UbicacionFilter>('almacen')
  const [metricView, setMetricView] = useState<MetricView>('both')
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([])
  const [movimientosLoading, setMovimientosLoading] = useState(true)
  const [movimientosLoadingMore, setMovimientosLoadingMore] = useState(false)
  const [movimientosHasMore, setMovimientosHasMore] = useState(false)
  const [movimientosNextCursor, setMovimientosNextCursor] = useState<string | null>(null)
  const [movimientosOpen, setMovimientosOpen] = useState(false)
  const [movimientosError, setMovimientosError] = useState<string | null>(null)
  const [movimientoActionLoadingById, setMovimientoActionLoadingById] = useState<Record<string, boolean>>({})
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveDialogTargetId, setApproveDialogTargetId] = useState<string | null>(null)
  const [approveDialogError, setApproveDialogError] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectDialogTargetId, setRejectDialogTargetId] = useState<string | null>(null)
  const [rejectDialogMotivo, setRejectDialogMotivo] = useState('')
  const [rejectDialogError, setRejectDialogError] = useState<string | null>(null)
  const [procesoDialogOpen, setProcesoDialogOpen] = useState(false)
  const [procesoAccionObjetivo, setProcesoAccionObjetivo] = useState<ProcesoAccionObjetivo>('escuadrar')
  const [procesoProductoId, setProcesoProductoId] = useState('')
  const [procesoCantidadLosas, setProcesoCantidadLosas] = useState(0)
  const [procesoCantidadTouched, setProcesoCantidadTouched] = useState(false)
  const [procesoDialogError, setProcesoDialogError] = useState<string | null>(null)
  const [procesoDialogSubmitting, setProcesoDialogSubmitting] = useState(false)
  const [procesoConfirmDialogOpen, setProcesoConfirmDialogOpen] = useState(false)
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false)
  const [ajusteProductoId, setAjusteProductoId] = useState('')
  const [ajusteCantidadLosas, setAjusteCantidadLosas] = useState(0)
  const [ajusteCantidadTouched, setAjusteCantidadTouched] = useState(false)
  const [ajusteDestino, setAjusteDestino] = useState<'Redimensión' | 'Otro'>('Redimensión')
  const [ajusteMotivo, setAjusteMotivo] = useState('')
  const [ajusteDialogError, setAjusteDialogError] = useState<string | null>(null)
  const [ajusteDialogSubmitting, setAjusteDialogSubmitting] = useState(false)

  useEffect(() => {
    setCurrentUser(readSessionUser())
  }, [])

  useEffect(() => {
    let alive = true

    const loadMovimientosIniciales = async () => {
      setMovimientosLoading(true)
      setMovimientosError(null)
      try {
        const data = await getInventarioMovimientosPage({
          limit: MOVIMIENTOS_PAGE_SIZE,
          detalleTipo: 'producto',
        })
        if (!alive) return
        setMovimientos(data.items)
        setMovimientosHasMore(data.hasMore)
        setMovimientosNextCursor(data.nextCursor)
      } catch (error) {
        if (!alive) return
        setMovimientosError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el historial de movimientos de almacen.',
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

  const canApproveMovimientos = currentUser ? hasPermission(currentUser, 'inventario:approve') : false
  const canDarSalidaProceso = canApproveMovimientos

  const showLosas = metricView !== 'm2'
  const showM2 = metricView !== 'losas'
  const showBothMetrics = showLosas && showM2
  const generalMetricTitle =
    metricView === 'both'
      ? 'Panorama del stock por estado'
      : metricView === 'losas'
        ? 'Panorama del stock en losas'
        : 'Panorama del stock en m2'

  const filteredProductos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return productos.filter((producto) => {
      const matchesTipo = tipoFilter === 'all' || producto.tipo === tipoFilter
      const matchesEstado = estadoFilter === 'all' || producto.estado === estadoFilter
      const matchesDimension = dimensionFilter === 'all' || producto.dimension === dimensionFilter
      const matchesUbicacion = ubicacionFilter === 'all' || producto.ubicacion === ubicacionFilter
      const matchesSearch =
        !query ||
        [
          producto.nombre,
          producto.origenNombre,
          producto.origenId,
          producto.tipo,
          producto.estado,
          producto.dimension,
          producto.ubicacion,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return (
        matchesTipo &&
        matchesEstado &&
        matchesDimension &&
        matchesUbicacion &&
        matchesSearch
      )
    })
  }, [dimensionFilter, estadoFilter, productos, searchTerm, tipoFilter, ubicacionFilter])

  const stockSummary = useMemo(
    () =>
      filteredProductos.reduce(
        (acc, producto) => {
          acc.items += 1
          acc.losas += producto.cantidadLosas
          acc.m2 += producto.metrosCuadrados
          if (producto.ubicacion === 'almacen') acc.almacen += 1
          if (producto.ubicacion === 'proceso') acc.proceso += 1
          return acc
        },
        { items: 0, almacen: 0, proceso: 0, losas: 0, m2: 0 },
      ),
    [filteredProductos],
  )

  const generalChartData = useMemo(() => buildEstadoRows(filteredProductos), [filteredProductos])

  const accionResumenFiltro = useMemo<AccionFiltroResumenRow[]>(
    () =>
      estadoOrden.map((estado) => {
        const itemsEstado = filteredProductos.filter((item) => item.estado === estado)
        return {
          estado,
          productos: itemsEstado.length,
          losas: itemsEstado.reduce((sum, item) => sum + item.cantidadLosas, 0),
          m2: itemsEstado.reduce((sum, item) => sum + item.metrosCuadrados, 0),
        }
      }),
    [filteredProductos],
  )

  const productosAlmacenParaProceso = useMemo(() => {
    const estadoRequerido = estadoRequeridoProcesoPorAccion[procesoAccionObjetivo]
    return productos
      .filter((producto) => producto.ubicacion === 'almacen')
      .filter((producto) => producto.estado === estadoRequerido)
      .filter((producto) => producto.cantidadLosas > 0)
      .sort((a, b) => b.cantidadLosas - a.cantidadLosas)
  }, [productos, procesoAccionObjetivo])

  useEffect(() => {
    if (!procesoDialogOpen) return
    if (procesoProductoId && productosAlmacenParaProceso.some((item) => item.id === procesoProductoId)) return
    setProcesoProductoId(productosAlmacenParaProceso[0]?.id ?? '')
  }, [productosAlmacenParaProceso, procesoDialogOpen, procesoProductoId])

  const movimientosOrdenados = useMemo(
    () => [...movimientos].sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud)),
    [movimientos],
  )

  const movimientosPendientes = useMemo(
    () => movimientos.filter((movimiento) => movimiento.estado === 'pendiente').length,
    [movimientos],
  )

  const approveDialogTarget = useMemo(
    () => movimientos.find((movimiento) => movimiento.id === approveDialogTargetId) ?? null,
    [approveDialogTargetId, movimientos],
  )
  const rejectDialogTarget = useMemo(
    () => movimientos.find((movimiento) => movimiento.id === rejectDialogTargetId) ?? null,
    [movimientos, rejectDialogTargetId],
  )
  const approveDialogTargetBadge = approveDialogTarget
    ? resolveMovimientoBadgeDisplay(approveDialogTarget)
    : null
  const rejectDialogTargetBadge = rejectDialogTarget
    ? resolveMovimientoBadgeDisplay(rejectDialogTarget)
    : null
  const isApproveDialogLoading = approveDialogTargetId
    ? !!movimientoActionLoadingById[approveDialogTargetId]
    : false
  const isRejectDialogLoading = rejectDialogTargetId
    ? !!movimientoActionLoadingById[rejectDialogTargetId]
    : false

  const procesoProductoSeleccionado = useMemo(
    () => productosAlmacenParaProceso.find((producto) => producto.id === procesoProductoId) ?? null,
    [productosAlmacenParaProceso, procesoProductoId],
  )
  const procesoProductoResumen = useMemo(
    () => (procesoProductoSeleccionado ? buildProductoProcesoOptionLabel(procesoProductoSeleccionado) : ''),
    [procesoProductoSeleccionado],
  )

  const productosAlmacenParaAjuste = useMemo(
    () =>
      productos
        .filter((producto) => producto.ubicacion === 'almacen')
        .filter((producto) => producto.cantidadLosas > 0)
        .sort((a, b) => b.cantidadLosas - a.cantidadLosas),
    [productos],
  )

  const ajusteProductoSeleccionado = useMemo(
    () => productosAlmacenParaAjuste.find((producto) => producto.id === ajusteProductoId) ?? null,
    [productosAlmacenParaAjuste, ajusteProductoId],
  )

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Vista actual" meta={`${stockSummary.items} item(s) visibles`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>En almacen</span>
            <span className="font-semibold text-slate-900">{stockSummary.almacen}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>En proceso</span>
            <span className="font-semibold text-slate-900">{stockSummary.proceso}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Losas visibles</span>
            <span className="font-semibold text-slate-900">
              {stockSummary.losas.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>m2 visibles</span>
            <span className="font-semibold text-slate-900">{stockSummary.m2.toFixed(2)} m2</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard
        title="Ritmo por estado"
        meta={`Tipo ${tipoFilter === 'all' ? 'Todos' : tipoFilter} | Estado ${
          estadoFilter === 'all' ? 'Todos' : estadoFilter
        }`}
      >
        <div className="space-y-2 text-sm text-slate-700">
          {accionResumenFiltro.map((row) => (
            <div key={row.estado} className="rounded-xl bg-white/70 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{row.estado}</span>
                <span className="text-xs text-slate-500">{row.productos} item(s)</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span>{row.losas.toLocaleString()} losas</span>
                <span>{row.m2.toFixed(2)} m2</span>
              </div>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Movimientos" meta="Almacen de losas">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Pendientes</span>
            <span className="font-semibold text-amber-700">{movimientosPendientes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Registrados</span>
            <span className="font-semibold text-slate-900">{movimientos.length}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Desde esta vista salen las losas para escuadrado, devastado, resinado y pulido.
          </p>
        </div>
      </AdminPanelCard>
    </div>
  )

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

  const openProcesoDialog = () => {
    if (!canDarSalidaProceso) return
    setProcesoDialogError(null)
    setProcesoAccionObjetivo('escuadrar')
    setProcesoProductoId('')
    setProcesoCantidadLosas(0)
    setProcesoCantidadTouched(false)
    setProcesoConfirmDialogOpen(false)
    setProcesoDialogOpen(true)
  }

  const closeProcesoDialog = () => {
    if (procesoDialogSubmitting) return
    setProcesoDialogOpen(false)
    setProcesoConfirmDialogOpen(false)
    setProcesoDialogError(null)
  }

  const closeProcesoConfirmDialog = () => {
    if (procesoDialogSubmitting) return
    setProcesoConfirmDialogOpen(false)
  }

  const openAjusteDialog = () => {
    if (!canDarSalidaProceso) return
    setAjusteDialogError(null)
    setAjusteProductoId(productosAlmacenParaAjuste[0]?.id ?? '')
    setAjusteCantidadLosas(0)
    setAjusteCantidadTouched(false)
    setAjusteDestino('Redimensión')
    setAjusteMotivo('')
    setAjusteDialogOpen(true)
  }

  const closeAjusteDialog = () => {
    if (ajusteDialogSubmitting) return
    setAjusteDialogOpen(false)
    setAjusteDialogError(null)
  }

  const confirmSalidaAjuste = async () => {
    const motivoNorm = ajusteMotivo.trim()
    if (!ajusteProductoSeleccionado) {
      setAjusteDialogError('Selecciona un producto de almacen para la salida de ajuste.')
      return
    }
    const cantidadLosas = Math.trunc(ajusteCantidadLosas)
    if (!Number.isInteger(cantidadLosas) || cantidadLosas <= 0) {
      setAjusteDialogError('La cantidad de losas debe ser entera y mayor a 0.')
      return
    }
    if (cantidadLosas > ajusteProductoSeleccionado.cantidadLosas) {
      setAjusteDialogError(
        `La cantidad solicitada excede el stock disponible (${ajusteProductoSeleccionado.cantidadLosas} losas).`,
      )
      return
    }
    if (motivoNorm.length < 5) {
      setAjusteDialogError('La observación es obligatoria y debe tener al menos 5 caracteres.')
      return
    }
    setAjusteDialogError(null)
    setMovimientosError(null)
    setAjusteDialogSubmitting(true)
    try {
      const movimiento = await createSalidaAjusteInventario({
        productoId: ajusteProductoSeleccionado.id,
        cantidadLosas,
        destino: ajusteDestino,
        motivo: motivoNorm,
      })
      setMovimientos((prev) => [movimiento, ...prev.filter((item) => item.id !== movimiento.id)])
      await reloadInventario().catch(() => undefined)
      closeAjusteDialog()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo registrar la salida de ajuste.'
      setAjusteDialogError(message)
      setMovimientosError(message)
    } finally {
      setAjusteDialogSubmitting(false)
    }
  }

  const validateSalidaProcesoForm = (): boolean => {
    if (!procesoProductoSeleccionado) {
      setProcesoDialogError('Selecciona un producto de almacen para la salida a proceso.')
      return false
    }

    const cantidadLosas = Math.trunc(procesoCantidadLosas)
    if (!Number.isInteger(cantidadLosas) || cantidadLosas <= 0) {
      setProcesoDialogError('La cantidad de losas debe ser entera y mayor a 0.')
      return false
    }

    if (cantidadLosas > procesoProductoSeleccionado.cantidadLosas) {
      setProcesoDialogError(
        `La cantidad solicitada excede el stock disponible (${procesoProductoSeleccionado.cantidadLosas} losas).`,
      )
      return false
    }

    return true
  }

  const openProcesoConfirmDialog = () => {
    if (!validateSalidaProcesoForm()) return
    setProcesoDialogError(null)
    setProcesoConfirmDialogOpen(true)
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
      await reloadInventario().catch(() => undefined)
      closeApproveDialog()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo aprobar el movimiento de almacen.'
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
    const motivoNormalizado = rejectDialogMotivo.trim()
    if (motivoNormalizado.length < 5) {
      setRejectDialogError('El motivo de rechazo debe tener al menos 5 caracteres.')
      return
    }
    setMovimientosError(null)
    setRejectDialogError(null)
    setMovimientoActionLoadingById((prev) => ({ ...prev, [rejectDialogTargetId]: true }))

    try {
      const updated = await rejectInventarioMovimiento(rejectDialogTargetId, {
        motivoRechazo: motivoNormalizado,
      })
      setMovimientos((prev) =>
        prev.map((movimiento) => (movimiento.id === updated.id ? updated : movimiento)),
      )
      await reloadInventario().catch(() => undefined)
      closeRejectDialog()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo rechazar el movimiento de almacen.'
      setMovimientosError(message)
      setRejectDialogError(message)
    } finally {
      setMovimientoActionLoadingById((prev) => ({ ...prev, [rejectDialogTargetId]: false }))
    }
  }

  const confirmSalidaProceso = async () => {
    if (!validateSalidaProcesoForm() || !procesoProductoSeleccionado) return

    setProcesoDialogError(null)
    setMovimientosError(null)
    setProcesoDialogSubmitting(true)
    try {
      const movimiento = await createSalidaProcesoInventario({
        accionObjetivo: procesoAccionObjetivo,
        productoId: procesoProductoSeleccionado.id,
        cantidadLosas: Math.trunc(procesoCantidadLosas),
      })
      setMovimientos((prev) => [movimiento, ...prev.filter((item) => item.id !== movimiento.id)])
      await reloadInventario().catch(() => undefined)
      setProcesoConfirmDialogOpen(false)
      setProcesoDialogOpen(false)
      setProcesoDialogError(null)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la salida a proceso.'
      setProcesoDialogError(message)
      setMovimientosError(message)
    } finally {
      setProcesoDialogSubmitting(false)
    }
  }

  const handleLoadMoreMovimientos = async () => {
    if (!movimientosHasMore || !movimientosNextCursor || movimientosLoadingMore) return
    setMovimientosError(null)
    setMovimientosLoadingMore(true)
    try {
      const data = await getInventarioMovimientosPage({
        limit: MOVIMIENTOS_PAGE_SIZE,
        cursor: movimientosNextCursor,
        detalleTipo: 'producto',
      })
      setMovimientos((prev) => {
        const ids = new Set(prev.map((item) => item.id))
        const nextItems = data.items.filter((item) => !ids.has(item.id))
        return [...prev, ...nextItems]
      })
      setMovimientosHasMore(data.hasMore)
      setMovimientosNextCursor(data.nextCursor)
    } catch (error) {
      setMovimientosError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar mas movimientos de almacen.',
      )
    } finally {
      setMovimientosLoadingMore(false)
    }
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Inventario de losas</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Stock operativo de losas por estado, ubicacion y salida a proceso para las etapas posteriores al picado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canDarSalidaProceso ? (
              <>
                <Button type="button" onClick={openProcesoDialog}>
                  Dar salida a proceso
                </Button>
                <Button type="button" variant="outline" onClick={openAjusteDialog}>
                  Salida de ajuste
                </Button>
              </>
            ) : null}
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              {canApproveMovimientos ? 'Control de almacen' : 'Solo lectura'}
            </Badge>
          </div>
        </div>

        <div className="rounded-[var(--agent-radius-panel)] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</Label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por origen, tipo, estado o dimension..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tipo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposProducto.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Estado</Label>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estadosInventario.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Ubicacion</Label>
              <Select
                value={ubicacionFilter}
                onValueChange={(value) => setUbicacionFilter(value as UbicacionFilter)}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Ubicacion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="almacen">Almacen</SelectItem>
                  <SelectItem value="proceso">Fuera de almacen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Dimension</Label>
              <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(dimensiones as Dimension[]).map((dimension) => (
                    <SelectItem key={dimension} value={dimension}>
                      {dimension}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--agent-radius-panel)] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Stock operativo</p>
              <h2 className="text-lg font-semibold text-slate-900">{generalMetricTitle}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <BarChart3 className="h-4 w-4" />
                Grafica interactiva
              </div>
              <ToggleGroup
                type="single"
                value={metricView}
                onValueChange={(value) => {
                  if (isMetricView(value)) setMetricView(value)
                }}
                variant="outline"
                size="sm"
                className="bg-white/80"
              >
                <ToggleGroupItem value="losas" className="px-3 text-xs">
                  Losas
                </ToggleGroupItem>
                <ToggleGroupItem value="m2" className="px-3 text-xs">
                  m2
                </ToggleGroupItem>
                <ToggleGroupItem value="both" className="px-3 text-xs">
                  Ambos
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <ChartContainer config={inventoryChartConfig} className="mt-4 h-[230px] w-full sm:h-[320px] lg:h-[360px]">
            <BarChart data={generalChartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} barGap={10}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="estado" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              {showLosas && <YAxis yAxisId="losas" tickLine={false} axisLine={false} width={44} allowDecimals={false} />}
              {showM2 && (
                <YAxis
                  yAxisId="m2"
                  orientation={showLosas ? 'right' : 'left'}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
              )}
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const numeric = Number(value ?? 0)
                      const normalizedName = String(name).toLowerCase()
                      const isM2 = normalizedName.includes('m2')
                      return isM2 ? `${numeric.toFixed(2)} m2` : `${Math.round(numeric).toLocaleString()} losas`
                    }}
                  />
                }
              />
              {showBothMetrics && <ChartLegend content={<ChartLegendContent />} />}
              {showLosas && <Bar yAxisId="losas" dataKey="losas" name="Losas" fill="var(--color-losas)" radius={[8, 8, 0, 0]} />}
              {showM2 && <Bar yAxisId="m2" dataKey="m2" name="m2" fill="var(--color-m2)" radius={[8, 8, 0, 0]} />}
            </BarChart>
          </ChartContainer>
        </div>

        <div className="overflow-hidden rounded-[var(--agent-radius-panel)] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Stock de losas</p>
              <h2 className="text-lg font-semibold text-slate-900">Tabla operativa del inventario</h2>
              <p className="mt-1 text-xs text-slate-500">
                Esta vista concentra solo productos terminados o en proceso posteriores al picado.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              {filteredProductos.length} registros
            </Badge>
          </div>

          {filteredProductos.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              No hay losas para los filtros seleccionados.
            </div>
          ) : (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origen</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dimension</TableHead>
                    <TableHead>Ubicacion</TableHead>
                    <TableHead className="text-right">Losas</TableHead>
                    <TableHead className="text-right">m2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="whitespace-normal">
                        <div>
                          <p className="font-medium text-slate-900">{producto.origenNombre}</p>
                          <p className="text-xs text-slate-500">{producto.nombre}</p>
                        </div>
                      </TableCell>
                      <TableCell>{producto.estado}</TableCell>
                      <TableCell>{producto.tipo}</TableCell>
                      <TableCell>{producto.dimension}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                          {producto.ubicacion}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {producto.cantidadLosas.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {producto.metrosCuadrados.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[var(--agent-radius-panel)] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Historial exclusivo de almacen</p>
              <h2 className="text-lg font-semibold text-slate-900">Historial de movimientos de losas</h2>
              <p className="mt-1 text-xs text-slate-500">
                Las salidas a proceso desde almacen se aplican directo. Los retornos desde proceso pueden requerir aprobacion.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('w-fit', movimientosPendientes > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                Pendientes: {movimientosPendientes}
              </Badge>
              <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
                {canApproveMovimientos ? 'Aprobador: almacen' : 'Solo consulta'}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-slate-200 bg-white/70 text-slate-700"
                onClick={() => {
                  setMovimientosOpen((prev) => !prev)
                }}
                aria-expanded={movimientosOpen}
              >
                {movimientosOpen ? 'Ocultar historial' : 'Ver historial'}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-300 ease-out',
                    movimientosOpen ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-500 ease-out',
              movimientosOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              {movimientosError ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {movimientosError}
                </p>
              ) : null}

              {movimientosLoading ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                  Cargando movimientos de almacen...
                </div>
              ) : movimientosOrdenados.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                  Sin movimientos registrados.
                </div>
              ) : (
                <>
                  <div className="max-h-[540px] overflow-y-auto scroll-smooth rounded-xl border border-slate-200/80">
                    <div className="divide-y divide-slate-200/60">
                      {movimientosOrdenados.map((movimiento) => {
                        const totalLosas = movimiento.detalles.reduce((sum, detalle) => sum + detalle.cantidadLosas, 0)
                        const totalM2 = movimiento.detalles.reduce((sum, detalle) => sum + detalle.metrosCuadrados, 0)
                        const isActionLoading = !!movimientoActionLoadingById[movimiento.id]
                        const movimientoBadge = resolveMovimientoBadgeDisplay(movimiento)
                        const detalleResumen = movimiento.detalles
                          .slice(0, 2)
                          .map((detalle) => {
                            const ubicacionResumen = detalle.ubicacionDestino
                              ? ` (${detalle.ubicacionOrigen ?? 'almacen'} -> ${detalle.ubicacionDestino})`
                              : detalle.ubicacionOrigen
                                ? ` (${detalle.ubicacionOrigen})`
                                : ''
                            return `${detalle.origenNombre} ${detalle.dimension}${ubicacionResumen}`
                          })
                          .join(' | ')

                        return (
                          <div key={movimiento.id} className="bg-white/70 px-3 py-3">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{movimiento.id}</p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'border-slate-200 bg-slate-50 text-slate-700',
                                      movimientoTipoBadgeClass[movimientoBadge.tipo],
                                    )}
                                  >
                                    {movimientoBadge.tipo.toUpperCase()} / {movimientoBadge.origen}
                                  </Badge>
                                  <Badge variant="outline" className={cn('text-[11px]', movimientoEstadoBadgeClass[movimiento.estado])}>
                                    {movimientoEstadoLabel[movimiento.estado]}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-slate-600">
                                  Fecha: {formatDateTime(movimiento.fechaSolicitud)} - Motivo: {movimiento.motivo}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {totalLosas.toLocaleString()} losas - {totalM2.toFixed(2)} m2 - {movimiento.detalles.length} detalle(s)
                                </p>
                                {detalleResumen ? (
                                  <p className="mt-1 text-[11px] text-slate-500">{detalleResumen}</p>
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
                                    {isActionLoading ? 'Procesando...' : 'Aprobar'}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-rose-200 text-rose-700"
                                    disabled={isActionLoading}
                                    onClick={() => {
                                      handleRejectMovimiento(movimiento.id)
                                    }}
                                  >
                                    Rechazar
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  {movimiento.estado === 'pendiente'
                                    ? 'Pendiente por aprobacion de almacen'
                                    : movimiento.fechaResolucion
                                      ? `Resuelto: ${formatDateTime(movimiento.fechaResolucion)}`
                                      : 'Resuelto'}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {movimientosHasMore ? (
                    <div className="mt-3 flex items-center justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-slate-200 bg-white/70 text-slate-700"
                        disabled={movimientosLoadingMore}
                        onClick={() => {
                          void handleLoadMoreMovimientos()
                        }}
                      >
                        {movimientosLoadingMore ? 'Cargando...' : 'Cargar mas'}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-center text-[11px] text-slate-500">
                      Mostrando {movimientosOrdenados.length} movimiento(s).
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <Dialog
          open={approveDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeApproveDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Aprobar movimiento de almacen</DialogTitle>
              <DialogDescription>
                Este movimiento se aplicara sobre el stock operativo de losas.
              </DialogDescription>
            </DialogHeader>

            {approveDialogTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Movimiento: <span className="font-semibold">{approveDialogTarget.id}</span>
                </p>
                {approveDialogTargetBadge ? (
                  <p>
                    Tipo: <span className="font-semibold">{approveDialogTargetBadge.tipo} / {approveDialogTargetBadge.origen}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            {approveDialogError ? (
              <p className="text-xs text-destructive">{approveDialogError}</p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeApproveDialog} disabled={isApproveDialogLoading}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmApproveMovimiento()
                }}
                disabled={isApproveDialogLoading}
              >
                {isApproveDialogLoading ? 'Procesando...' : 'Confirmar aprobacion'}
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
              <DialogTitle>Rechazar movimiento de almacen</DialogTitle>
              <DialogDescription>
                Explica el motivo para mantener la trazabilidad del rechazo.
              </DialogDescription>
            </DialogHeader>

            {rejectDialogTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Movimiento: <span className="font-semibold">{rejectDialogTarget.id}</span>
                </p>
                {rejectDialogTargetBadge ? (
                  <p>
                    Tipo: <span className="font-semibold">{rejectDialogTargetBadge.tipo} / {rejectDialogTargetBadge.origen}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input
                value={rejectDialogMotivo}
                onChange={(event) => setRejectDialogMotivo(event.target.value)}
                placeholder="Motivo del rechazo"
                disabled={isRejectDialogLoading}
              />
            </div>

            {rejectDialogError ? (
              <p className="text-xs text-destructive">{rejectDialogError}</p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRejectDialog} disabled={isRejectDialogLoading}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-rose-200 text-rose-700"
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

        <Dialog
          open={procesoDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeProcesoDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dar salida a proceso</DialogTitle>
              <DialogDescription>
                Esta salida aplica solo a losas posteriores al picado y mueve el stock de almacen hacia proceso.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Accion objetivo</Label>
                <Select
                  value={procesoAccionObjetivo}
                  onValueChange={(value) => {
                    if (
                      value === 'escuadrar' ||
                      value === 'devastar' ||
                      value === 'resinar' ||
                      value === 'pulir'
                    ) {
                      setProcesoAccionObjetivo(value)
                      setProcesoProductoId('')
                    }
                  }}
                  disabled={procesoDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escuadrar">Escuadrar (requiere estado Picado)</SelectItem>
                    <SelectItem value="devastar">Devastar (requiere estado Escuadrado)</SelectItem>
                    <SelectItem value="resinar">Resinar (requiere estado Devastado)</SelectItem>
                    <SelectItem value="pulir">Pulir (requiere estado Resinado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Producto en almacen</Label>
                <Select
                  value={procesoProductoId}
                  onValueChange={setProcesoProductoId}
                  disabled={procesoDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productosAlmacenParaProceso.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Sin stock disponible para esta accion
                      </SelectItem>
                    ) : (
                      productosAlmacenParaProceso.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {buildProductoProcesoOptionLabel(producto)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {procesoProductoSeleccionado ? (
                <p className="text-xs text-slate-600">
                  Disponible: {procesoProductoSeleccionado.cantidadLosas} losas (
                  {procesoProductoSeleccionado.metrosCuadrados.toFixed(2)} m2)
                </p>
              ) : null}

              <div className="space-y-1">
                <Label>Cantidad de losas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={procesoCantidadTouched || procesoCantidadLosas > 0 ? procesoCantidadLosas : ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setProcesoCantidadTouched(value !== '')
                    setProcesoCantidadLosas(value === '' ? 0 : Math.trunc(Number(value)))
                    if (procesoDialogError) setProcesoDialogError(null)
                  }}
                  disabled={procesoDialogSubmitting}
                />
              </div>

              {procesoDialogError ? (
                <p className="text-xs text-destructive">{procesoDialogError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeProcesoDialog} disabled={procesoDialogSubmitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={openProcesoConfirmDialog}
                disabled={procesoDialogSubmitting || !procesoProductoSeleccionado || procesoCantidadLosas <= 0}
              >
                Dar salida
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={procesoConfirmDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeProcesoConfirmDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar salida a proceso</DialogTitle>
              <DialogDescription>
                Esta accion mueve las losas de almacen a proceso de forma inmediata.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Accion objetivo</span>
                <span className="font-semibold text-slate-950">
                  {accionObjetivoProcesoLabel[procesoAccionObjetivo]}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Producto</span>
                <span className="max-w-[70%] text-right font-semibold text-slate-950">
                  {procesoProductoResumen || '--'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Cantidad</span>
                <span className="font-semibold text-slate-950">
                  {Math.trunc(procesoCantidadLosas).toLocaleString()} losas
                </span>
              </div>
              {procesoProductoSeleccionado ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Equivalencia</span>
                  <span className="font-semibold text-slate-950">
                    {(
                      (Math.trunc(procesoCantidadLosas) /
                        procesoProductoSeleccionado.cantidadLosas) *
                      procesoProductoSeleccionado.metrosCuadrados
                    ).toFixed(2)}{' '}
                    m2
                  </span>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeProcesoConfirmDialog} disabled={procesoDialogSubmitting}>
                Volver
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmSalidaProceso()
                }}
                disabled={procesoDialogSubmitting}
              >
                {procesoDialogSubmitting ? 'Procesando...' : 'Confirmar salida'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={ajusteDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeAjusteDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Salida de ajuste</DialogTitle>
              <DialogDescription>
                Registra una salida por Redimensión u Otro motivo. La observación es obligatoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Destino</Label>
                <Select
                  value={ajusteDestino}
                  onValueChange={(value) => {
                    if (value === 'Redimensión' || value === 'Otro') setAjusteDestino(value)
                  }}
                  disabled={ajusteDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Redimensión">Redimensión</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Producto en almacen</Label>
                <Select
                  value={ajusteProductoId}
                  onValueChange={setAjusteProductoId}
                  disabled={ajusteDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productosAlmacenParaAjuste.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Sin stock disponible en almacen
                      </SelectItem>
                    ) : (
                      productosAlmacenParaAjuste.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {buildProductoProcesoOptionLabel(producto)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {ajusteProductoSeleccionado ? (
                <p className="text-xs text-slate-600">
                  Disponible: {ajusteProductoSeleccionado.cantidadLosas} losas (
                  {ajusteProductoSeleccionado.metrosCuadrados.toFixed(2)} m2)
                </p>
              ) : null}

              <div className="space-y-1">
                <Label>Cantidad de losas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={ajusteCantidadTouched || ajusteCantidadLosas > 0 ? ajusteCantidadLosas : ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setAjusteCantidadTouched(value !== '')
                    setAjusteCantidadLosas(value === '' ? 0 : Math.trunc(Number(value)))
                    if (ajusteDialogError) setAjusteDialogError(null)
                  }}
                  disabled={ajusteDialogSubmitting}
                />
              </div>

              <div className="space-y-1">
                <Label>
                  Observación <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={ajusteMotivo}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                    setAjusteMotivo(event.target.value)
                    if (ajusteDialogError) setAjusteDialogError(null)
                  }}
                  placeholder="Describe el motivo de la salida (obligatorio, mín. 5 caracteres)"
                  disabled={ajusteDialogSubmitting}
                  rows={3}
                />
              </div>

              {ajusteDialogError ? (
                <p className="text-xs text-destructive">{ajusteDialogError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAjusteDialog} disabled={ajusteDialogSubmitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-amber-200 text-amber-700"
                onClick={() => {
                  void confirmSalidaAjuste()
                }}
                disabled={
                  ajusteDialogSubmitting ||
                  !ajusteProductoSeleccionado ||
                  ajusteCantidadLosas <= 0 ||
                  ajusteMotivo.trim().length < 5
                }
              >
                {ajusteDialogSubmitting ? 'Procesando...' : 'Registrar salida'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  )
}
