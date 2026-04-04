'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { useInventarioStore } from '@/hooks/use-inventario'
import {
  approveInventarioMovimiento,
  createSalidaProcesoInventario,
  getInventarioMovimientos,
  rejectInventarioMovimiento,
} from '@/lib/resources-api'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { useProduccionStore } from '@/hooks/use-produccion'
import { dimensiones, estadosInventario, tiposProducto } from '@/lib/data'
import {
  losasAMetros,
  type Dimension,
  type InventarioMovimiento,
  type Producto,
  type UbicacionInventario,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { BarChart3, Search } from 'lucide-react'

type EstadoRow = {
  estado: Producto['estado']
  losas: number
  m2: number
}

type MetricView = 'both' | 'losas' | 'm2'
type UbicacionFilter = 'all' | UbicacionInventario

type OrigenChartGroup = {
  origenId: string
  origenNombre: string
  items: Producto[]
  totalLosas: number
  totalM2: number
  chartData: EstadoRow[]
  estadoDominante: Producto['estado']
}

type PartidasOrigenGroup = {
  origenId: string
  origenNombre: string
  mermaLosas: number
  mermaM2: number
  reutilizableLosas: number
  reutilizableM2: number
}

type AccionFiltroResumenRow = {
  estado: Producto['estado']
  productos: number
  losas: number
  m2: number
}

const estadoOrden: Producto['estado'][] = ['Picado', 'Escuadrado', 'Devastado', 'Resinado', 'Pulido']

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

const rankingLosasConfig = {
  losas: {
    label: 'Losas',
    color: 'hsl(222, 47%, 11%)',
  },
} satisfies ChartConfig

const rankingM2Config = {
  m2: {
    label: 'm2',
    color: 'hsl(160, 84%, 39%)',
  },
} satisfies ChartConfig

const breakageChartConfig = {
  merma: {
    label: 'Merma total',
    color: 'hsl(0, 84%, 60%)',
  },
  reutilizable: {
    label: 'Reutilizable',
    color: 'hsl(205, 85%, 55%)',
  },
} satisfies ChartConfig

const estadoBadgeClass: Record<Producto['estado'], string> = {
  Picado: 'border-blue-200 bg-blue-50 text-blue-700',
  Escuadrado: 'border-amber-200 bg-amber-50 text-amber-700',
  Devastado: 'border-violet-200 bg-violet-50 text-violet-700',
  Resinado: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  Pulido: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}
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

const estadoRequeridoProcesoPorAccion: Record<
  'escuadrar' | 'devastar' | 'resinar' | 'pulir',
  Producto['estado']
> = {
  escuadrar: 'Picado',
  devastar: 'Escuadrado',
  resinar: 'Devastado',
  pulir: 'Resinado',
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

function getDominantEstado(rows: EstadoRow[]): Producto['estado'] {
  return [...rows].sort((a, b) => b.losas - a.losas)[0]?.estado ?? 'Picado'
}

function shortOrigenLabel(name: string): string {
  if (name.length <= 24) return name
  return `${name.slice(0, 21)}...`
}

function isMetricView(value: string): value is MetricView {
  return value === 'both' || value === 'losas' || value === 'm2'
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

export default function InventarioPage() {
  const { productos } = useInventarioStore()
  const { produccion } = useProduccionStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [dimensionFilter, setDimensionFilter] = useState<string>('all')
  const [ubicacionFilter, setUbicacionFilter] = useState<UbicacionFilter>('almacen')
  const [metricView, setMetricView] = useState<MetricView>('both')
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([])
  const [movimientosLoading, setMovimientosLoading] = useState(true)
  const [movimientosError, setMovimientosError] = useState<string | null>(null)
  const [movimientoActionLoadingById, setMovimientoActionLoadingById] = useState<Record<string, boolean>>({})
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveDialogTargetId, setApproveDialogTargetId] = useState<string | null>(null)
  const [approveDialogObservaciones, setApproveDialogObservaciones] = useState('')
  const [approveDialogError, setApproveDialogError] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectDialogTargetId, setRejectDialogTargetId] = useState<string | null>(null)
  const [rejectDialogMotivo, setRejectDialogMotivo] = useState('')
  const [rejectDialogError, setRejectDialogError] = useState<string | null>(null)
  const [procesoDialogOpen, setProcesoDialogOpen] = useState(false)
  const [procesoAccionObjetivo, setProcesoAccionObjetivo] = useState<'escuadrar' | 'devastar' | 'resinar' | 'pulir'>('escuadrar')
  const [procesoProductoId, setProcesoProductoId] = useState('')
  const [procesoCantidadLosas, setProcesoCantidadLosas] = useState(0)
  const [procesoCantidadTouched, setProcesoCantidadTouched] = useState(false)
  const [procesoMotivo, setProcesoMotivo] = useState('')
  const [procesoDialogError, setProcesoDialogError] = useState<string | null>(null)
  const [procesoDialogSubmitting, setProcesoDialogSubmitting] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return
    try {
      setCurrentUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    let alive = true

    const loadMovimientos = async () => {
      setMovimientosLoading(true)
      setMovimientosError(null)
      try {
        const data = await getInventarioMovimientos()
        if (!alive) return
        setMovimientos(data)
      } catch (error) {
        if (!alive) return
        setMovimientosError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el historial de movimientos de almacen.',
        )
      } finally {
        if (alive) setMovimientosLoading(false)
      }
    }

    void loadMovimientos()

    return () => {
      alive = false
    }
  }, [])

  const canApproveMovimientos = currentUser ? hasPermission(currentUser, 'inventario:approve') : false
  const canSolicitarSalidaProceso = currentUser
    ? hasPermission(currentUser, 'inventario:write')
    : false

  const showLosas = metricView !== 'm2'
  const showM2 = metricView !== 'losas'
  const showBothMetrics = showLosas && showM2
  const generalMetricTitle =
    metricView === 'both'
      ? 'Losas y m2 por estado operativo'
      : metricView === 'losas'
        ? 'Losas por estado operativo'
        : 'm2 por estado operativo'

  const filteredProductos = useMemo(() => {
    return productos.filter((producto) => {
      const query = searchTerm.toLowerCase()
      const matchesSearch =
        producto.nombre.toLowerCase().includes(query) ||
        producto.origenNombre.toLowerCase().includes(query) ||
        producto.id.toLowerCase().includes(query)
      const matchesTipo = tipoFilter === 'all' || producto.tipo === tipoFilter
      const matchesEstado = estadoFilter === 'all' || producto.estado === estadoFilter
      const matchesDimension = dimensionFilter === 'all' || producto.dimension === dimensionFilter
      const matchesUbicacion = ubicacionFilter === 'all' || producto.ubicacion === ubicacionFilter
      return matchesSearch && matchesTipo && matchesEstado && matchesDimension && matchesUbicacion
    })
  }, [productos, searchTerm, tipoFilter, estadoFilter, dimensionFilter, ubicacionFilter])

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
  }, [procesoDialogOpen, procesoProductoId, productosAlmacenParaProceso])

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

  const groupedByOrigen = useMemo(() => {
    const grouped = filteredProductos.reduce<Record<string, Omit<OrigenChartGroup, 'chartData' | 'estadoDominante'>>>(
      (acc, item) => {
        if (!acc[item.origenId]) {
          acc[item.origenId] = {
            origenId: item.origenId,
            origenNombre: item.origenNombre,
            items: [],
            totalLosas: 0,
            totalM2: 0,
          }
        }

        acc[item.origenId].items.push(item)
        acc[item.origenId].totalLosas += item.cantidadLosas
        acc[item.origenId].totalM2 += item.metrosCuadrados

        return acc
      },
      {},
    )

    return Object.values(grouped)
      .map((group) => {
        const chartData = buildEstadoRows(group.items)
        return {
          ...group,
          chartData,
          estadoDominante: getDominantEstado(chartData),
        }
      })
      .sort((a, b) => b.totalM2 - a.totalM2)
  }, [filteredProductos])

  const topLosasByOrigen = useMemo(
    () =>
      groupedByOrigen.slice(0, 6).map((group) => ({
        origen: shortOrigenLabel(group.origenNombre),
        losas: group.totalLosas,
      })),
    [groupedByOrigen],
  )

  const topM2ByOrigen = useMemo(
    () =>
      groupedByOrigen.slice(0, 6).map((group) => ({
        origen: shortOrigenLabel(group.origenNombre),
        m2: Number(group.totalM2.toFixed(2)),
      })),
    [groupedByOrigen],
  )

  const partidasPorOrigen = useMemo(() => {
    const grouped = produccion.reduce<Record<string, PartidasOrigenGroup>>((acc, registro) => {
      if (!acc[registro.origenId]) {
        acc[registro.origenId] = {
          origenId: registro.origenId,
          origenNombre: registro.origenNombre,
          mermaLosas: 0,
          mermaM2: 0,
          reutilizableLosas: 0,
          reutilizableM2: 0,
        }
      }

      ;(registro.detallesAcciones ?? []).forEach((detalle) => {
        const mermaLosas = detalle.losasMermaTotal ?? 0
        const reutilizableLosas = detalle.losasReutilizables ?? 0

        acc[registro.origenId].mermaLosas += mermaLosas
        acc[registro.origenId].mermaM2 +=
          (detalle.metrosMermaTotal ?? 0) > 0
            ? detalle.metrosMermaTotal ?? 0
            : losasAMetros(mermaLosas, registro.dimension)

        acc[registro.origenId].reutilizableLosas += reutilizableLosas
        acc[registro.origenId].reutilizableM2 +=
          (detalle.metrosReutilizables ?? 0) > 0
            ? detalle.metrosReutilizables ?? 0
            : losasAMetros(reutilizableLosas, registro.dimension)
      })

      return acc
    }, {})

    return Object.values(grouped)
      .filter((group) => group.mermaLosas > 0 || group.reutilizableLosas > 0)
      .sort(
        (a, b) =>
          b.mermaLosas +
          b.reutilizableLosas -
          (a.mermaLosas + a.reutilizableLosas),
      )
  }, [produccion])

  const mermaPorOrigen = useMemo(
    () => partidasPorOrigen.filter((group) => group.mermaLosas > 0),
    [partidasPorOrigen],
  )

  const reutilizablePorOrigen = useMemo(
    () => partidasPorOrigen.filter((group) => group.reutilizableLosas > 0),
    [partidasPorOrigen],
  )

  const resumenPartidas = useMemo(() => {
    return partidasPorOrigen.reduce(
      (acc, group) => {
        acc.mermaLosas += group.mermaLosas
        acc.mermaM2 += group.mermaM2
        acc.reutilizableLosas += group.reutilizableLosas
        acc.reutilizableM2 += group.reutilizableM2
        return acc
      },
      { mermaLosas: 0, mermaM2: 0, reutilizableLosas: 0, reutilizableM2: 0 },
    )
  }, [partidasPorOrigen])

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

  const closeApproveDialog = () => {
    if (isApproveDialogLoading) return
    setApproveDialogOpen(false)
    setApproveDialogTargetId(null)
    setApproveDialogObservaciones('')
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
    if (!canSolicitarSalidaProceso) return
    setProcesoDialogError(null)
    setProcesoAccionObjetivo('escuadrar')
    setProcesoProductoId('')
    setProcesoCantidadLosas(0)
    setProcesoCantidadTouched(false)
    setProcesoMotivo('')
    setProcesoDialogOpen(true)
  }

  const closeProcesoDialog = () => {
    if (procesoDialogSubmitting) return
    setProcesoDialogOpen(false)
    setProcesoDialogError(null)
  }

  const handleApproveMovimiento = (movimientoId: string) => {
    if (!canApproveMovimientos) return
    setApproveDialogTargetId(movimientoId)
    setApproveDialogObservaciones('')
    setApproveDialogError(null)
    setApproveDialogOpen(true)
  }

  const confirmApproveMovimiento = async () => {
    if (!approveDialogTargetId) return
    setMovimientosError(null)
    setApproveDialogError(null)
    setMovimientoActionLoadingById((prev) => ({ ...prev, [approveDialogTargetId]: true }))

    try {
      const observaciones = approveDialogObservaciones.trim()
      const updated = await approveInventarioMovimiento(approveDialogTargetId, {
        observaciones: observaciones ? observaciones : undefined,
      })
      setMovimientos((prev) =>
        prev.map((movimiento) => (movimiento.id === updated.id ? updated : movimiento)),
      )
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
    if (!procesoProductoSeleccionado) {
      setProcesoDialogError('Selecciona un producto de almacen para la salida a proceso.')
      return
    }

    const cantidadLosas = Math.trunc(procesoCantidadLosas)
    if (!Number.isInteger(cantidadLosas) || cantidadLosas <= 0) {
      setProcesoDialogError('La cantidad de losas debe ser entera y mayor a 0.')
      return
    }

    if (cantidadLosas > procesoProductoSeleccionado.cantidadLosas) {
      setProcesoDialogError(
        `La cantidad solicitada excede el stock disponible (${procesoProductoSeleccionado.cantidadLosas} losas).`,
      )
      return
    }

    const motivo = procesoMotivo.trim()
    if (motivo.length < 5) {
      setProcesoDialogError('El motivo debe tener al menos 5 caracteres.')
      return
    }

    setProcesoDialogError(null)
    setMovimientosError(null)
    setProcesoDialogSubmitting(true)
    try {
      const movimiento = await createSalidaProcesoInventario({
        accionObjetivo: procesoAccionObjetivo,
        productoId: procesoProductoSeleccionado.id,
        cantidadLosas,
        motivo,
      })
      setMovimientos((prev) => [movimiento, ...prev])
      closeProcesoDialog()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la solicitud de salida a proceso.'
      setProcesoDialogError(message)
      setMovimientosError(message)
    } finally {
      setProcesoDialogSubmitting(false)
    }
  }

  const breakageChartData = useMemo(
    () => [
      {
        tipo: 'Merma total',
        merma: showLosas ? resumenPartidas.mermaLosas : Number(resumenPartidas.mermaM2.toFixed(2)),
      },
      {
        tipo: 'Reutilizable',
        reutilizable: showLosas
          ? resumenPartidas.reutilizableLosas
          : Number(resumenPartidas.reutilizableM2.toFixed(2)),
      },
    ],
    [resumenPartidas, showLosas],
  )

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard
        title="Filtro por accion"
        meta={`Tipo ${tipoFilter === 'all' ? 'Todos' : tipoFilter} | Estado ${
          estadoFilter === 'all' ? 'Todos' : estadoFilter
        } | Dim ${dimensionFilter === 'all' ? 'Todas' : dimensionFilter}`}
      >
        <div className="space-y-2 text-sm text-slate-700">
          {accionResumenFiltro.map((row) => (
            <div key={row.estado} className="rounded-2xl bg-white/70 px-3 py-2">
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

      <AdminPanelCard title="Losas partidas" meta="Desde produccion">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Merma total</span>
            <span className="font-semibold text-rose-700">
              {resumenPartidas.mermaLosas.toLocaleString()} / {resumenPartidas.mermaM2.toFixed(2)} m2
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Reutilizable</span>
            <span className="font-semibold text-sky-700">
              {resumenPartidas.reutilizableLosas.toLocaleString()} / {resumenPartidas.reutilizableM2.toFixed(2)} m2
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Merma total es perdida. Reutilizable se controla aparte y no se mezcla con stock operativo.
          </p>
        </div>
      </AdminPanelCard>

      {showLosas && (
        <AdminPanelCard title="Top bloques" meta="Por losas">
          {topLosasByOrigen.length === 0 ? (
            <p className="text-xs text-slate-500">Sin datos para mostrar.</p>
          ) : (
            <ChartContainer config={rankingLosasConfig} className="h-[180px] w-full sm:h-[210px]">
              <BarChart layout="vertical" data={topLosasByOrigen} margin={{ top: 4, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="origen"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={92}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value).toLocaleString()} losas`}
                    />
                  }
                />
                <Bar dataKey="losas" fill="var(--color-losas)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </AdminPanelCard>
      )}

      {showM2 && (
        <AdminPanelCard title="Top bloques" meta="Por m2">
          {topM2ByOrigen.length === 0 ? (
            <p className="text-xs text-slate-500">Sin datos para mostrar.</p>
          ) : (
            <ChartContainer config={rankingM2Config} className="h-[180px] w-full sm:h-[210px]">
              <BarChart layout="vertical" data={topM2ByOrigen} margin={{ top: 4, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="origen"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={92}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value).toFixed(2)} m2`}
                    />
                  }
                />
                <Bar dataKey="m2" fill="var(--color-m2)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </AdminPanelCard>
      )}
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Inventario</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Stock operativo separado de estadisticas de partidas (merma/reutilizable).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canSolicitarSalidaProceso && (
              <Button type="button" onClick={openProcesoDialog}>
                Solicitar salida a proceso
              </Button>
            )}
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              {canApproveMovimientos ? 'Control de aprobacion' : 'Solo lectura'}
            </Badge>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</Label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por producto, origen o id..."
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


        <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Historial exclusivo de almacen</p>
              <h2 className="text-lg font-semibold text-slate-900">Entradas y salidas con aprobacion</h2>
              <p className="mt-1 text-xs text-slate-500">
                Todo movimiento debe aprobarse por jefatura de almacen antes de completarse.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('w-fit', movimientosPendientes > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                Pendientes: {movimientosPendientes}
              </Badge>
              <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
                {canApproveMovimientos ? 'Aprobador: almacen' : 'Solo consulta'}
              </Badge>
            </div>
          </div>

          {movimientosError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {movimientosError}
            </p>
          ) : null}

          {movimientosLoading ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              Cargando movimientos de almacen...
            </div>
          ) : movimientosOrdenados.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              Sin movimientos registrados.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-200/60 overflow-hidden rounded-xl border border-slate-200/80">
              {movimientosOrdenados.map((movimiento) => {
                const totalLosas = movimiento.detalles.reduce((sum, detalle) => sum + detalle.cantidadLosas, 0)
                const totalM2 = movimiento.detalles.reduce((sum, detalle) => sum + detalle.metrosCuadrados, 0)
                const isActionLoading = !!movimientoActionLoadingById[movimiento.id]
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
                              movimientoTipoBadgeClass[movimiento.tipo],
                            )}
                          >
                            {movimiento.tipo.toUpperCase()} / {movimiento.origen}
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
                              void handleApproveMovimiento(movimiento.id)
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
                              void handleRejectMovimiento(movimiento.id)
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
          )}
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
                Puedes agregar observaciones opcionales antes de aprobar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {approveDialogTarget ? (
                <p className="text-xs text-slate-600">
                  {approveDialogTarget.id} - {approveDialogTarget.tipo.toUpperCase()} / {approveDialogTarget.origen}
                </p>
              ) : null}
              <Textarea
                value={approveDialogObservaciones}
                onChange={(event) => {
                  setApproveDialogObservaciones(event.target.value)
                  if (approveDialogError) setApproveDialogError(null)
                }}
                rows={4}
                placeholder="Observaciones (opcional)."
                disabled={isApproveDialogLoading}
              />
              {approveDialogError ? (
                <p className="text-xs text-destructive">{approveDialogError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeApproveDialog}
                disabled={isApproveDialogLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmApproveMovimiento()
                }}
                disabled={isApproveDialogLoading}
              >
                {isApproveDialogLoading ? 'Procesando...' : 'Aprobar'}
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
                Escribe el motivo del rechazo (minimo 5 caracteres).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {rejectDialogTarget ? (
                <p className="text-xs text-slate-600">
                  {rejectDialogTarget.id} - {rejectDialogTarget.tipo.toUpperCase()} / {rejectDialogTarget.origen}
                </p>
              ) : null}
              <Textarea
                value={rejectDialogMotivo}
                onChange={(event) => {
                  setRejectDialogMotivo(event.target.value)
                  if (rejectDialogError) setRejectDialogError(null)
                }}
                rows={4}
                placeholder="Motivo del rechazo."
                disabled={isRejectDialogLoading}
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
                disabled={isRejectDialogLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                tone="danger"
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
              <DialogTitle>Solicitar salida a proceso</DialogTitle>
              <DialogDescription>
                Esta salida queda pendiente hasta aprobación de jefatura de almacén.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Acción objetivo</Label>
                <Select
                  value={procesoAccionObjetivo}
                  onValueChange={(value) => {
                    if (value === 'escuadrar' || value === 'devastar' || value === 'resinar' || value === 'pulir') {
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
                <Label>Producto en almacén</Label>
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
                        Sin stock disponible para esta acción
                      </SelectItem>
                    ) : (
                      productosAlmacenParaProceso.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {producto.nombre} · {producto.estado} · {producto.cantidadLosas} losas
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {procesoProductoSeleccionado && (
                <p className="text-xs text-slate-600">
                  Disponible: {procesoProductoSeleccionado.cantidadLosas} losas (
                  {procesoProductoSeleccionado.metrosCuadrados.toFixed(2)} m2)
                </p>
              )}

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

              <div className="space-y-1">
                <Label>Motivo</Label>
                <Textarea
                  value={procesoMotivo}
                  onChange={(event) => {
                    setProcesoMotivo(event.target.value)
                    if (procesoDialogError) setProcesoDialogError(null)
                  }}
                  placeholder="Motivo de salida a proceso (mínimo 5 caracteres)."
                  rows={3}
                  disabled={procesoDialogSubmitting}
                />
              </div>

              {procesoDialogError ? (
                <p className="text-xs text-destructive">{procesoDialogError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeProcesoDialog}
                disabled={procesoDialogSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmSalidaProceso()
                }}
                disabled={
                  procesoDialogSubmitting ||
                  !procesoProductoSeleccionado ||
                  procesoCantidadLosas <= 0
                }
              >
                {procesoDialogSubmitting ? 'Guardando...' : 'Solicitar salida'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
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
                      const isM2 = String(name).toLowerCase().includes('m2')
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

        <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Constancia de partidas</p>
              <h2 className="text-lg font-semibold text-slate-900">
                Merma total vs reutilizable desde produccion diaria
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Estas partidas no se mezclan con el stock operativo.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Vista en {showLosas ? 'losas' : 'm2'} segun selector activo
            </p>
          </div>

          {resumenPartidas.mermaLosas === 0 && resumenPartidas.reutilizableLosas === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              Sin partidas registradas desde produccion diaria.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <ChartContainer config={breakageChartConfig} className="h-[220px] w-full sm:h-[270px]">
                <BarChart data={breakageChartData} margin={{ top: 10, right: 12, left: 0, bottom: 6 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="tipo" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={!showLosas} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          const numeric = Number(value ?? 0)
                          return showLosas
                            ? `${Math.round(numeric).toLocaleString()} losas`
                            : `${numeric.toFixed(2)} m2`
                        }}
                      />
                    }
                  />
                  <Bar dataKey="merma" name="Merma total" fill="var(--color-merma)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="reutilizable" name="Reutilizable" fill="var(--color-reutilizable)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-rose-600">Merma por bloque</p>
                  {mermaPorOrigen.length === 0 ? (
                    <p className="text-xs text-slate-500">Sin merma registrada.</p>
                  ) : (
                    mermaPorOrigen.slice(0, 6).map((group) => (
                      <div
                        key={`merma-${group.origenId}`}
                        className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-slate-900">{group.origenNombre}</p>
                        <p className="mt-1 text-[11px] text-rose-700">
                          {group.mermaLosas} losas / {group.mermaM2.toFixed(2)} m2
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-sky-600">Reutilizable por bloque</p>
                  {reutilizablePorOrigen.length === 0 ? (
                    <p className="text-xs text-slate-500">Sin reutilizable registrado.</p>
                  ) : (
                    reutilizablePorOrigen.slice(0, 6).map((group) => (
                      <div
                        key={`reutilizable-${group.origenId}`}
                        className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-slate-900">{group.origenNombre}</p>
                        <p className="mt-1 text-[11px] text-sky-700">
                          {group.reutilizableLosas} losas / {group.reutilizableM2.toFixed(2)} m2
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            {groupedByOrigen.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No hay datos de inventario para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {groupedByOrigen.map((group) => (
                  <div
                    key={group.origenId}
                    className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Bloque / lote</p>
                        <p className="text-base font-semibold text-slate-900">{group.origenNombre}</p>
                      </div>
                      <Badge variant="outline" className={cn('w-fit', estadoBadgeClass[group.estadoDominante])}>
                        {group.estadoDominante}
                      </Badge>
                    </div>

                    <ChartContainer config={inventoryChartConfig} className="mt-3 h-[200px] w-full sm:h-[230px]">
                      <BarChart data={group.chartData} margin={{ top: 10, right: 8, left: 0, bottom: 6 }} barGap={8}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="estado" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        {showLosas && <YAxis yAxisId="losas" tickLine={false} axisLine={false} width={36} allowDecimals={false} />}
                        {showM2 && (
                          <YAxis
                            yAxisId="m2"
                            orientation={showLosas ? 'right' : 'left'}
                            tickLine={false}
                            axisLine={false}
                            width={36}
                          />
                        )}
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                const numeric = Number(value ?? 0)
                                const isM2 = String(name).toLowerCase().includes('m2')
                                return isM2 ? `${numeric.toFixed(2)} m2` : `${Math.round(numeric).toLocaleString()} losas`
                              }}
                            />
                          }
                        />
                        {showLosas && <Bar yAxisId="losas" dataKey="losas" name="Losas" fill="var(--color-losas)" radius={[6, 6, 0, 0]} />}
                        {showM2 && <Bar yAxisId="m2" dataKey="m2" name="m2" fill="var(--color-m2)" radius={[6, 6, 0, 0]} />}
                      </BarChart>
                    </ChartContainer>

                    <p className="mt-2 text-xs text-slate-500">
                      {[
                        `${group.items.length} items`,
                        showLosas ? `${group.totalLosas.toLocaleString()} losas` : null,
                        showM2 ? `${group.totalM2.toFixed(2)} m2` : null,
                      ]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
