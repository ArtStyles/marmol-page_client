'use client'

import React, { useMemo, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { useProduccionStore } from '@/hooks/use-produccion'
import { estadosInventario, tiposProducto } from '@/lib/data'
import { losasAMetros, type Producto } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { BarChart3, Search } from 'lucide-react'

type EstadoRow = {
  estado: Producto['estado']
  losas: number
  m2: number
}

type MetricView = 'both' | 'losas' | 'm2'

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

const estadoOrden: Producto['estado'][] = ['Picado', 'Pulido', 'Escuadrado']

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
  Pulido: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Escuadrado: 'border-amber-200 bg-amber-50 text-amber-700',
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

export default function InventarioPage() {
  const { productos } = useInventarioStore()
  const { produccion } = useProduccionStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [metricView, setMetricView] = useState<MetricView>('both')

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
      return matchesSearch && matchesTipo && matchesEstado
    })
  }, [productos, searchTerm, tipoFilter, estadoFilter])

  const generalChartData = useMemo(() => buildEstadoRows(filteredProductos), [filteredProductos])

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
          <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
            Solo lectura
          </Badge>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
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
          </div>
        </div>

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

