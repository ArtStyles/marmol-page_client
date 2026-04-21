'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useProduccionStore } from '@/hooks/use-produccion'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { createMerma, getBloques, getMermas } from '@/lib/resources-api'
import {
  DIMENSIONES_PISO,
  losasAMetros,
  PLANCHA_DIMENSIONES,
  type AccionLosa,
  type BloqueOLote,
  type Dimension,
  type Merma,
  type TipoProducto,
} from '@/lib/types'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { BarChart3, Plus, Search } from 'lucide-react'

type MetricView = 'losas' | 'm2'
type RegistroKind = 'MermaTotal' | 'Reutilizable'
type KindFilter = 'all' | RegistroKind
type SourceFilter = 'all' | 'Produccion' | 'FueraProduccion'

type MermaFueraProduccionRecord = Merma & {
  kind: RegistroKind
}

type MermaFueraProduccionForm = {
  fecha: string
  origenId: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadLosas: number
  motivo: Merma['motivo']
  observaciones: string
  kind: RegistroKind
}

type MermaVisualItem = {
  id: string
  fecha: string
  origenId: string
  origenNombre: string
  tipo: Merma['tipo']
  dimension: Merma['dimension']
  source: 'Produccion' | 'FueraProduccion'
  kind: 'MermaTotal' | 'Reutilizable'
  motivo: string
  cantidadLosas: number
  metrosCuadrados: number
}

type DistributionRow = {
  categoria: string
  key: 'merma_produccion' | 'merma_fuera' | 'reutilizable'
  valor: number
}

type TrendByDateRow = {
  fecha: string
  mermaTotal: number
  reutilizable: number
}

type OrigenBreakdownRow = {
  origen: string
  mermaTotal: number
  reutilizable: number
}

const tipoOptions: TipoProducto[] = ['Piso', 'Plancha']
const dimensionOptions: Dimension[] = [...DIMENSIONES_PISO]
const motivoOptions: Merma['motivo'][] = [
  'Partida al picar',
  'Partida al pulir',
  'Defecto de material',
  'Recorte aprovechable',
  'Otro',
]

const distributionColor: Record<DistributionRow['key'], string> = {
  merma_produccion: 'hsl(0, 84%, 60%)',
  merma_fuera: 'hsl(20, 90%, 52%)',
  reutilizable: 'hsl(205, 85%, 55%)',
}

function resolvePersistedMotivo(
  kind: RegistroKind,
  motivo: Merma['motivo'],
): Merma['motivo'] {
  return kind === 'Reutilizable' ? 'Recorte aprovechable' : motivo
}

const motiveChartConfig = {
  valor: {
    label: 'Valor',
    color: 'hsl(0, 84%, 60%)',
  },
} satisfies ChartConfig

const reusableChartConfig = {
  valor: {
    label: 'Valor',
    color: 'hsl(205, 85%, 55%)',
  },
} satisfies ChartConfig

const breakdownChartConfig = {
  mermaTotal: {
    label: 'Merma total',
    color: 'hsl(0, 84%, 60%)',
  },
  reutilizable: {
    label: 'Reutilizable',
    color: 'hsl(205, 85%, 55%)',
  },
} satisfies ChartConfig

function isMetricView(value: string): value is MetricView {
  return value === 'losas' || value === 'm2'
}

function isKindFilter(value: string): value is KindFilter {
  return value === 'all' || value === 'MermaTotal' || value === 'Reutilizable'
}

function isRegistroKind(value: string): value is RegistroKind {
  return value === 'MermaTotal' || value === 'Reutilizable'
}

function isSourceFilter(value: string): value is SourceFilter {
  return value === 'all' || value === 'Produccion' || value === 'FueraProduccion'
}

function motivoMermaProduccion(accion: AccionLosa): string {
  if (accion === 'picar') return 'Partida al picar (produccion)'
  if (accion === 'escuadrar') return 'Partida al escuadrar (produccion)'
  if (accion === 'devastar') return 'Partida al devastar (produccion)'
  if (accion === 'resinar') return 'Partida al resinar (produccion)'
  if (accion === 'pulir') return 'Partida al pulir (produccion)'
  return 'Partida en proceso (produccion)'
}

function formatLosas(value: number): string {
  return Math.round(value).toLocaleString()
}

function shortLabel(value: string, maxLength = 24): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

function getTodayDateIso(): string {
  return new Date().toISOString().split('T')[0]
}

function resolveDimensionByTipo(tipo: TipoProducto, dimension: Dimension): Dimension {
  if (tipo === 'Plancha') {
    return PLANCHA_DIMENSIONES.includes(dimension as (typeof PLANCHA_DIMENSIONES)[number])
      ? dimension
      : PLANCHA_DIMENSIONES[0]
  }
  return DIMENSIONES_PISO.includes(dimension as (typeof DIMENSIONES_PISO)[number])
    ? dimension
    : DIMENSIONES_PISO[0]
}

function buildProduccionItems(produccion: ReturnType<typeof useProduccionStore>['produccion']): MermaVisualItem[] {
  const items: MermaVisualItem[] = []

  produccion.forEach((registro) => {
    ;(registro.detallesAcciones ?? []).forEach((detalle) => {
      const mermaLosas = detalle.losasMermaTotal ?? 0
      const reutilizableLosas = detalle.losasReutilizables ?? 0

      if (mermaLosas > 0) {
        items.push({
          id: `${registro.id}-${detalle.id}-merma`,
          fecha: registro.fecha,
          origenId: registro.origenId,
          origenNombre: registro.origenNombre,
          tipo: registro.tipo,
          dimension: registro.dimension,
          source: 'Produccion',
          kind: 'MermaTotal',
          motivo: motivoMermaProduccion(detalle.accion),
          cantidadLosas: mermaLosas,
          metrosCuadrados:
            (detalle.metrosMermaTotal ?? 0) > 0
              ? detalle.metrosMermaTotal ?? 0
              : losasAMetros(mermaLosas, registro.dimension),
        })
      }

      if (reutilizableLosas > 0) {
        items.push({
          id: `${registro.id}-${detalle.id}-reutilizable`,
          fecha: registro.fecha,
          origenId: registro.origenId,
          origenNombre: registro.origenNombre,
          tipo: registro.tipo,
          dimension: registro.dimension,
          source: 'Produccion',
          kind: 'Reutilizable',
          motivo: `Reutilizable en ${detalle.accion}`,
          cantidadLosas: reutilizableLosas,
          metrosCuadrados:
            (detalle.metrosReutilizables ?? 0) > 0
              ? detalle.metrosReutilizables ?? 0
              : losasAMetros(reutilizableLosas, registro.dimension),
        })
      }
    })
  })

  return items
}

export default function MermasPage() {
  const { produccion } = useProduccionStore()
  const [bloquesYLotes, setBloquesYLotes] = useState<BloqueOLote[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cantidadTouched, setCantidadTouched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [manualMermas, setManualMermas] = useState<MermaFueraProduccionRecord[]>([])
  const [formData, setFormData] = useState<MermaFueraProduccionForm>({
    fecha: getTodayDateIso(),
    origenId: '',
    tipo: 'Piso',
    dimension: '60x40',
    cantidadLosas: 0,
    motivo: 'Partida al picar',
    observaciones: '',
    kind: 'MermaTotal',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [metricView, setMetricView] = useState<MetricView>('losas')

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setSyncError(null)
      try {
        let sessionUser: AdminUser | null = null
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
          if (raw) {
            try {
              sessionUser = JSON.parse(raw) as AdminUser
            } catch {
              window.localStorage.removeItem(ADMIN_STORAGE_KEY)
            }
          }
        }

        const canReadBloques = hasPermission(sessionUser, 'bloques:read')
        const canReadMermas = hasPermission(sessionUser, 'mermas:read')

        const [bloquesData, mermasData] = await Promise.all([
          canReadBloques ? getBloques() : Promise.resolve<BloqueOLote[]>([]),
          canReadMermas ? getMermas() : Promise.resolve<Merma[]>([]),
        ])
        if (!alive) return
        setBloquesYLotes(bloquesData)
        setManualMermas(
          mermasData.map((item) => ({
            ...item,
            kind: item.motivo === 'Recorte aprovechable' ? 'Reutilizable' : 'MermaTotal',
          })),
        )
      } catch (error) {
        if (!alive) return
        setSyncError(error instanceof Error ? error.message : 'No se pudieron cargar mermas.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!bloquesYLotes.length) return
    setFormData((prev) => (prev.origenId ? prev : { ...prev, origenId: bloquesYLotes[0].id }))
  }, [bloquesYLotes])

  const resetForm = () => {
    setFormData({
      fecha: getTodayDateIso(),
      origenId: bloquesYLotes[0]?.id ?? '',
      tipo: 'Piso',
      dimension: '60x40',
      cantidadLosas: 0,
      motivo: 'Partida al picar',
      observaciones: '',
      kind: 'MermaTotal',
    })
    setCantidadTouched(false)
  }

  const handleRegisterMermaFueraProduccion = async (event: FormEvent) => {
    event.preventDefault()
    setSyncError(null)

    if (!formData.origenId) return

    const origen = bloquesYLotes.find((item) => item.id === formData.origenId)
    if (!origen) return

    const cantidadEntera = Math.trunc(formData.cantidadLosas)
    if (!Number.isInteger(cantidadEntera) || cantidadEntera <= 0) return
    const dimensionSeleccionada = resolveDimensionByTipo(formData.tipo, formData.dimension)

    setIsSaving(true)
    try {
      const motivoPersistido = resolvePersistedMotivo(formData.kind, formData.motivo)
      const created = await createMerma({
        fecha: formData.fecha || getTodayDateIso(),
        origenId: formData.origenId,
        origenNombre: getBloqueCodigo(origen),
        tipo: formData.tipo,
        dimension: dimensionSeleccionada,
        cantidadLosas: cantidadEntera,
        metrosCuadrados: Number(losasAMetros(cantidadEntera, dimensionSeleccionada).toFixed(2)),
        motivo: motivoPersistido,
        observaciones: formData.observaciones.trim(),
      })

      const nextRecord: MermaFueraProduccionRecord = {
        ...created,
        kind: motivoPersistido === 'Recorte aprovechable' ? 'Reutilizable' : 'MermaTotal',
      }

      setManualMermas((prev) => [nextRecord, ...prev])
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No se pudo guardar la merma.')
    } finally {
      setIsSaving(false)
    }
  }

  const metrosCuadradosForm = useMemo(
    () =>
      Number(
        losasAMetros(
          formData.cantidadLosas || 0,
          resolveDimensionByTipo(formData.tipo, formData.dimension),
        ).toFixed(2),
      ),
    [formData.cantidadLosas, formData.dimension, formData.tipo],
  )

  const mermasFueraProduccion = useMemo<MermaVisualItem[]>(() => {
    return manualMermas.map((item) => {
      return {
        id: item.id,
        fecha: item.fecha,
        origenId: item.origenId,
        origenNombre: item.origenNombre,
        tipo: item.tipo,
        dimension: item.dimension,
        source: 'FueraProduccion',
        kind: item.kind,
        motivo: item.motivo,
        cantidadLosas: item.cantidadLosas,
        metrosCuadrados: item.metrosCuadrados,
      }
    })
  }, [manualMermas])

  const mermasProduccion = useMemo(() => buildProduccionItems(produccion), [produccion])

  const allItems = useMemo(
    () => [...mermasProduccion, ...mermasFueraProduccion].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [mermasProduccion, mermasFueraProduccion],
  )

  const filteredItems = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()

    return allItems.filter((item) => {
      const matchesSearch =
        item.origenNombre.toLowerCase().includes(query) ||
        item.motivo.toLowerCase().includes(query) ||
        item.fecha.includes(query)
      const matchesKind = kindFilter === 'all' || item.kind === kindFilter
      const matchesSource = sourceFilter === 'all' || item.source === sourceFilter
      return matchesSearch && matchesKind && matchesSource
    })
  }, [allItems, searchTerm, kindFilter, sourceFilter])

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        if (item.kind === 'MermaTotal') {
          acc.mermaLosas += item.cantidadLosas
          acc.mermaM2 += item.metrosCuadrados
        } else {
          acc.reutilizableLosas += item.cantidadLosas
          acc.reutilizableM2 += item.metrosCuadrados
        }
        return acc
      },
      { mermaLosas: 0, mermaM2: 0, reutilizableLosas: 0, reutilizableM2: 0 },
    )
  }, [filteredItems])

  const distributionData = useMemo<DistributionRow[]>(() => {
    const mermaProduccion = filteredItems
      .filter((item) => item.source === 'Produccion' && item.kind === 'MermaTotal')
      .reduce((sum, item) => sum + (metricView === 'losas' ? item.cantidadLosas : item.metrosCuadrados), 0)

    const mermaFuera = filteredItems
      .filter((item) => item.source === 'FueraProduccion' && item.kind === 'MermaTotal')
      .reduce((sum, item) => sum + (metricView === 'losas' ? item.cantidadLosas : item.metrosCuadrados), 0)

    const reutilizable = filteredItems
      .filter((item) => item.kind === 'Reutilizable')
      .reduce((sum, item) => sum + (metricView === 'losas' ? item.cantidadLosas : item.metrosCuadrados), 0)

    return [
      { categoria: 'Merma en produccion', key: 'merma_produccion', valor: Number(mermaProduccion.toFixed(2)) },
      { categoria: 'Merma fuera produccion', key: 'merma_fuera', valor: Number(mermaFuera.toFixed(2)) },
      { categoria: 'Reutilizable', key: 'reutilizable', valor: Number(reutilizable.toFixed(2)) },
    ]
  }, [filteredItems, metricView])

  const motivosMermaData = useMemo(() => {
    const grouped = filteredItems
      .filter((item) => item.kind === 'MermaTotal')
      .reduce<Record<string, number>>((acc, item) => {
        const value = metricView === 'losas' ? item.cantidadLosas : item.metrosCuadrados
        acc[item.motivo] = (acc[item.motivo] ?? 0) + value
        return acc
      }, {})

    return Object.entries(grouped)
      .map(([motivo, valor]) => ({
        motivo,
        motivoCorto: shortLabel(motivo, 18),
        valor: Number(valor.toFixed(2)),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)
  }, [filteredItems, metricView])

  const reutilizableByOrigenData = useMemo(() => {
    const grouped = filteredItems
      .filter((item) => item.kind === 'Reutilizable')
      .reduce<Record<string, { origen: string; valor: number }>>((acc, item) => {
        const value = metricView === 'losas' ? item.cantidadLosas : item.metrosCuadrados
        if (!acc[item.origenId]) {
          acc[item.origenId] = { origen: item.origenNombre, valor: 0 }
        }
        acc[item.origenId].valor += value
        return acc
      }, {})

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        origenCorto: shortLabel(item.origen, 20),
        valor: Number(item.valor.toFixed(2)),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)
  }, [filteredItems, metricView])

  const groupedByDate = useMemo(() => {
    return filteredItems.reduce<Record<string, TrendByDateRow>>((acc, item) => {
      const value = metricView === 'losas' ? item.cantidadLosas : item.metrosCuadrados

      if (!acc[item.fecha]) {
        acc[item.fecha] = {
          fecha: item.fecha,
          mermaTotal: 0,
          reutilizable: 0,
        }
      }

      if (item.kind === 'MermaTotal') {
        acc[item.fecha].mermaTotal += value
      } else {
        acc[item.fecha].reutilizable += value
      }

      return acc
    }, {})
  }, [filteredItems, metricView])

  const trendByDateData = useMemo(
    () =>
      Object.values(groupedByDate)
        .map((item) => ({
          fecha: item.fecha,
          mermaTotal: Number(item.mermaTotal.toFixed(2)),
          reutilizable: Number(item.reutilizable.toFixed(2)),
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [groupedByDate],
  )

  const origenBreakdownData = useMemo<OrigenBreakdownRow[]>(() => {
    const grouped = filteredItems.reduce<Record<string, OrigenBreakdownRow>>((acc, item) => {
      const value = metricView === 'losas' ? item.cantidadLosas : item.metrosCuadrados

      if (!acc[item.origenId]) {
        acc[item.origenId] = {
          origen: item.origenNombre,
          mermaTotal: 0,
          reutilizable: 0,
        }
      }

      if (item.kind === 'MermaTotal') {
        acc[item.origenId].mermaTotal += value
      } else {
        acc[item.origenId].reutilizable += value
      }

      return acc
    }, {})

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        origen: shortLabel(item.origen, 20),
        mermaTotal: Number(item.mermaTotal.toFixed(2)),
        reutilizable: Number(item.reutilizable.toFixed(2)),
      }))
      .filter((item) => item.mermaTotal > 0 || item.reutilizable > 0)
      .sort((a, b) => b.mermaTotal + b.reutilizable - (a.mermaTotal + a.reutilizable))
      .slice(0, 8)
  }, [filteredItems, metricView])

  const formatMetricValue = (value: number) =>
    metricView === 'losas'
      ? `${formatLosas(value)} losas`
      : `${Number(value).toFixed(2)} m²`
  const metricViewLabel = metricView === 'm2' ? 'm²' : 'losas'

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen visual" meta={`${filteredItems.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Merma total</span>
            <span className="font-semibold text-rose-700">
              {formatLosas(totals.mermaLosas)} / {totals.mermaM2.toFixed(2)} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Reutilizable</span>
            <span className="font-semibold text-sky-700">
              {formatLosas(totals.reutilizableLosas)} / {totals.reutilizableM2.toFixed(2)} m²
            </span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Distribucion" meta={`Vista en ${metricViewLabel}`}>
        <div className="space-y-2 text-[12px] text-slate-700">
          {distributionData.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span>{item.categoria}</span>
              <span className="font-semibold" style={{ color: distributionColor[item.key] }}>
                {formatMetricValue(item.valor)}
              </span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top motivos" meta="Merma total">
        <div className="space-y-2 text-sm text-slate-700">
          {motivosMermaData.length === 0 ? (
            <p className="text-xs text-slate-500">Sin datos.</p>
          ) : (
            motivosMermaData.slice(0, 4).map((item) => (
              <div key={item.motivo} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <span className="text-xs font-semibold text-slate-900">{item.motivo}</span>
                <span className="text-xs font-semibold text-rose-700">
                  {formatMetricValue(item.valor)}
                </span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Mermas</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Visualizacion de mermas y reutilizables. Las mermas fuera de produccion se registran aqui.
            </p>
            {syncError ? <p className="mt-2 text-sm text-destructive">{syncError}</p> : null}
            {loading ? <p className="mt-2 text-sm text-muted-foreground">Cargando mermas...</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              Registro manual: fuera produccion
            </Badge>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar fuera produccion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[88vh] w-[96vw] max-w-[680px] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar merma fuera de produccion</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegisterMermaFueraProduccion} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={formData.fecha}
                        onChange={(event) => setFormData({ ...formData, fecha: event.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Codigo</Label>
                      <Select
                        value={formData.origenId}
                        onValueChange={(value) => setFormData({ ...formData, origenId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar origen" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloquesYLotes.map((bloque) => (
                            <SelectItem key={bloque.id} value={bloque.id}>
                              {getBloqueCodigo(bloque)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) => {
                          const tipo = value as TipoProducto
                          setFormData({
                            ...formData,
                            tipo,
                            dimension: resolveDimensionByTipo(tipo, formData.dimension),
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tipoOptions.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dimension</Label>
                      <Select
                        value={formData.dimension}
                        onValueChange={(value) => setFormData({ ...formData, dimension: value as Dimension })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.tipo === 'Plancha' ? PLANCHA_DIMENSIONES : dimensionOptions).map(
                            (dimension) => (
                              <SelectItem key={dimension} value={dimension}>
                                {dimension}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Clasificacion</Label>
                      <Select
                        value={formData.kind}
                        onValueChange={(value) => {
                          if (!isRegistroKind(value)) return
                          setFormData({
                            ...formData,
                            kind: value,
                            motivo:
                              value === 'Reutilizable'
                                ? 'Recorte aprovechable'
                                : formData.motivo === 'Recorte aprovechable'
                                  ? 'Partida al picar'
                                  : formData.motivo,
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MermaTotal">Merma total</SelectItem>
                          <SelectItem value="Reutilizable">Reutilizable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Motivo</Label>
                      <Select
                        value={resolvePersistedMotivo(formData.kind, formData.motivo)}
                        onValueChange={(value) => setFormData({ ...formData, motivo: value as Merma['motivo'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.kind === 'Reutilizable'
                            ? (['Recorte aprovechable'] as Merma['motivo'][])
                            : motivoOptions
                          ).map((motivo) => (
                            <SelectItem key={motivo} value={motivo}>
                              {motivo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.kind === 'Reutilizable' ? (
                        <p className="text-xs text-slate-500">
                          Reutilizable siempre se guarda como recorte aprovechable.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cantidad de losas (entero)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0"
                      value={cantidadTouched || formData.cantidadLosas > 0 ? formData.cantidadLosas : ''}
                      onChange={(event) => {
                        const value = event.target.value
                        setCantidadTouched(value !== '')
                        setFormData({
                          ...formData,
                          cantidadLosas: value === '' ? 0 : Math.trunc(Number(value)),
                        })
                      }}
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Conversion automatica</span>
                      <span className="font-semibold text-slate-900">{metrosCuadradosForm.toFixed(2)} m²</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observaciones (opcional)</Label>
                    <Textarea
                      value={formData.observaciones}
                      onChange={(event) => setFormData({ ...formData, observaciones: event.target.value })}
                      placeholder="Detalle breve..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                      className="flex-1 bg-transparent"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSaving || !formData.origenId || formData.cantidadLosas <= 0}
                    >
                      {isSaving ? 'Guardando...' : 'Guardar registro'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_150px_170px_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</Label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por origen, motivo o fecha..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tipo</Label>
              <Select
                value={kindFilter}
                onValueChange={(value) => {
                  if (isKindFilter(value)) setKindFilter(value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="MermaTotal">Merma total</SelectItem>
                  <SelectItem value="Reutilizable">Reutilizable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Fuente</Label>
              <Select
                value={sourceFilter}
                onValueChange={(value) => {
                  if (isSourceFilter(value)) setSourceFilter(value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Produccion">Produccion</SelectItem>
                  <SelectItem value="FueraProduccion">Fuera produccion</SelectItem>
                </SelectContent>
              </Select>
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
              <ToggleGroupItem value="losas" className="px-3 text-xs">Losas</ToggleGroupItem>
              <ToggleGroupItem value="m2" className="px-3 text-xs">m²</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Panorama</p>
              <h2 className="text-lg font-semibold text-slate-900">Merma y reutilizable por flujo</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <BarChart3 className="h-4 w-4" />
              Vista en {metricViewLabel}
            </div>
          </div>

          <ChartContainer config={motiveChartConfig} className="mt-4 h-[220px] w-full sm:h-[300px]">
            <BarChart data={distributionData} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="categoria" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={metricView === 'm2'} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => {
                      return formatMetricValue(Number(value ?? 0))
                    }}
                  />
                }
              />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                {distributionData.map((item) => (
                  <Cell key={item.key} fill={distributionColor[item.key]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Motivos de merma total</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Top motivos</h3>

            {motivosMermaData.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Sin datos para mostrar.</p>
            ) : (
              <ChartContainer config={motiveChartConfig} className="mt-4 h-[220px] w-full sm:h-[260px]">
                <BarChart layout="vertical" data={motivosMermaData} margin={{ top: 4, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="motivoCorto" type="category" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 11 }} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          return formatMetricValue(Number(value ?? 0))
                        }}
                      />
                    }
                  />
                  <Bar dataKey="valor" fill="var(--color-valor)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Reutilizable</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Aprovechable por bloque</h3>

            {reutilizableByOrigenData.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Sin reutilizable para mostrar.</p>
            ) : (
              <ChartContainer config={reusableChartConfig} className="mt-4 h-[220px] w-full sm:h-[260px]">
                <BarChart layout="vertical" data={reutilizableByOrigenData} margin={{ top: 4, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="origenCorto" type="category" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 11 }} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          return formatMetricValue(Number(value ?? 0))
                        }}
                      />
                    }
                  />
                  <Bar dataKey="valor" fill="var(--color-valor)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Tendencia</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Merma y reutilizable por fecha</h3>

            {trendByDateData.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Sin datos para mostrar.</p>
            ) : (
              <ChartContainer config={breakdownChartConfig} className="mt-4 h-[220px] w-full sm:h-[270px]">
                <BarChart data={trendByDateData} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={20} />
                  <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={metricView === 'm2'} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent formatter={(value) => formatMetricValue(Number(value ?? 0))} />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="mermaTotal" name="Merma total" fill="var(--color-mermaTotal)" radius={[8, 8, 0, 0]} />
                  <Bar
                    dataKey="reutilizable"
                    name="Reutilizable"
                    fill="var(--color-reutilizable)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Bloques / lotes</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Merma vs reutilizable por origen</h3>

            {origenBreakdownData.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Sin datos para mostrar.</p>
            ) : (
              <ChartContainer config={breakdownChartConfig} className="mt-4 h-[220px] w-full sm:h-[270px]">
                <BarChart
                  layout="vertical"
                  data={origenBreakdownData}
                  margin={{ top: 4, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="origen" type="category" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 11 }} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent formatter={(value) => formatMetricValue(Number(value ?? 0))} />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="mermaTotal" name="Merma total" stackId="total" fill="var(--color-mermaTotal)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="reutilizable" name="Reutilizable" stackId="total" fill="var(--color-reutilizable)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
