'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InventoryOriginProfile } from '../lib/inventory-origin-profiles'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

const comparisonChartConfig = {
  estimatedM2: { label: 'm2 estimados', color: 'hsl(210, 100%, 44%)' },
  realM2: { label: 'm2 reales', color: 'hsl(160, 84%, 39%)' },
} satisfies ChartConfig

const blockStatusBadgeClass: Record<'activo' | 'agotado' | 'vendido', string> = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  agotado: 'border-amber-200 bg-amber-50 text-amber-700',
  vendido: 'border-sky-200 bg-sky-50 text-sky-700',
}

const locationLabel: Record<'almacen' | 'proceso' | 'consumida', string> = {
  almacen: 'Almacen',
  proceso: 'Proceso',
  consumida: 'Consumida',
}

type InventoryOriginDetailDialogProps = {
  profile: InventoryOriginProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  monoHiloFormulaHint: string
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

function formatMoney(value: number | null): string {
  if (value === null) return '--'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">{title}</h3>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  )
}

export function InventoryOriginDetailDialog({
  profile,
  open,
  onOpenChange,
  monoHiloFormulaHint,
}: InventoryOriginDetailDialogProps) {
  const isOpen = open && Boolean(profile)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 left-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-none border-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))] p-0 sm:max-w-none">
        {profile ? (
          <>
            <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-4 py-4 sm:px-6 lg:px-8">
              <div className="pr-10 sm:pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">
                    Ficha consolidada
                  </p>
                  {profile.blockType ? (
                    <Badge
                      variant="outline"
                      className="h-7 border-slate-200 bg-white/85 px-2.5 text-xs text-slate-700"
                    >
                      {profile.blockType}
                    </Badge>
                  ) : null}
                  {profile.baseDimension ? (
                    <Badge
                      variant="outline"
                      className="h-7 border-slate-200 bg-white/85 px-2.5 text-xs text-slate-700"
                    >
                      Base {profile.baseDimension}
                    </Badge>
                  ) : null}
                  {profile.blockStatus ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-7 px-2.5 text-xs capitalize',
                        blockStatusBadgeClass[profile.blockStatus],
                      )}
                    >
                      {profile.blockStatus}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-2 space-y-2">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                      {profile.code}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-slate-600 xl:justify-end">
                      <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          Fecha
                        </p>
                        <p className="mt-1 font-semibold leading-5 text-slate-950">
                          {formatDate(profile.entryDate)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          Proveedor
                        </p>
                        <p className="mt-1 font-semibold leading-5 text-slate-950">
                          {profile.provider}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          Stock
                        </p>
                        <p className="mt-1 font-semibold leading-5 text-slate-950">
                          {profile.totalStockSlabs.toLocaleString()} losas /{' '}
                          {profile.totalStockM2.toFixed(2)} m2
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogDescription className="max-w-4xl text-sm leading-5 text-slate-600">
                    Resumen de costo, proyeccion por masas, produccion real y stock
                    actual para {profile.originName}.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <ScrollArea className="min-h-0">
              <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard
                    label="Total invertido registrado"
                    value={formatMoney(profile.summary.totalInvestedRecorded)}
                    helper={`Inicial ${formatMoney(profile.summary.totalInitialCost)} + operativo ${formatMoney(profile.summary.totalOperationalRecorded)}`}
                  />
                  <SummaryCard
                    label="m2 estimados"
                    value={`${profile.summary.estimatedM2.toFixed(2)} m2`}
                    helper={`${profile.massCount} masas registradas`}
                  />
                  <SummaryCard
                    label="m2 reales"
                    value={`${profile.summary.realM2.toFixed(2)} m2`}
                    helper={`${profile.summary.productionEntries} registros de produccion`}
                  />
                  <SummaryCard
                    label="Diferencia"
                    value={`${profile.summary.differenceM2.toFixed(2)} m2`}
                    helper="m2 reales - m2 estimados"
                  />
                  <SummaryCard
                    label="% rendimiento"
                    value={
                      profile.summary.yieldRatio === null
                        ? '--'
                        : `${(profile.summary.yieldRatio * 100).toFixed(1)}%`
                    }
                    helper="m2 reales / m2 estimados"
                  />
                  <SummaryCard
                    label="Costo prom. por m2"
                    value={formatMoney(profile.summary.averageCostM2)}
                    helper="Total invertido registrado / m2 reales"
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                  <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                    <SectionTitle
                      eyebrow="Rendimiento"
                      title="Estimado vs real por formato"
                      description="La comparacion contempla formatos de piso y plancha."
                    />
                    {profile.comparisonRows.length === 0 ? (
                      <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                        Todavia no hay datos suficientes para comparar proyeccion y produccion real.
                      </div>
                    ) : (
                      <ChartContainer config={comparisonChartConfig} className="mt-5 h-[280px] w-full">
                        <BarChart data={profile.comparisonRows} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} barGap={10}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="dimension" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                          <YAxis tickLine={false} axisLine={false} width={46} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `${Number(value ?? 0).toFixed(2)} m2`} />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="estimatedM2" name="m2 estimados" fill="var(--color-estimatedM2)" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="realM2" name="m2 reales" fill="var(--color-realM2)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                      <SectionTitle eyebrow="Costo inicial" title="Base del bloque" />
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span>Costo del bloque</span>
                          <span className="font-semibold text-slate-950">{formatMoney(profile.summary.initialCost)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Transporte hasta taller</span>
                          <span className="font-semibold text-slate-950">{formatMoney(profile.summary.transportCost)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                          <span>Total inicial</span>
                          <span className="font-semibold text-slate-950">{formatMoney(profile.summary.totalInitialCost)}</span>
                        </div>
                        <div className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">m2 comprados</p>
                            <p className="mt-1 font-semibold text-slate-950">{profile.summary.purchasedM2.toFixed(2)} m2</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">m2 vendibles</p>
                            <p className="mt-1 font-semibold text-slate-950">{profile.summary.vendibleM2.toFixed(2)} m2</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                      <SectionTitle eyebrow="Costos registrados" title="Operativo disponible" />
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span>Mano de obra total</span>
                          <span className="font-semibold text-slate-950">{formatMoney(profile.summary.laborCost)}</span>
                        </div>
                        <p className="text-xs text-slate-500">{profile.summary.laborEntries} registros de pago vinculados a este origen.</p>
                        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                          <span>Resina registrada</span>
                          <span className="font-semibold text-slate-950">{profile.summary.resinQty.toFixed(2)} L</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {profile.summary.resinEntries > 0
                            ? `${profile.summary.resinEntries} registros de consumo de resina en produccion.`
                            : 'Sin consumo de resina registrado para este origen.'}
                        </p>
                      </div>
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
                        Corriente, agua, desgaste y otros directos todavia no tienen captura individual por bloque dentro del sistema.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[var(--agent-radius-panel-lg)] border border-sky-200/70 bg-sky-50/75 p-5">
                  <SectionTitle eyebrow="Proyeccion por masas" title="Formula activa del taller" description={monoHiloFormulaHint} />
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <SummaryCard label="Masas registradas" value={profile.massCount.toLocaleString()} helper="Conteo total de piezas mono hilo" />
                    <SummaryCard label="Largo promedio" value={`${profile.averageMassLengthM.toFixed(2)} m`} helper="Promedio por masa" />
                    <SummaryCard label="Largo total" value={`${profile.totalMassLengthM.toFixed(2)} m`} helper="Suma usada para proyeccion" />
                  </div>
                </div>

                <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                  <SectionTitle eyebrow="Tabla de proyeccion" title="Resumen por dimension" description="Se mantienen visibles los formatos de plancha 160x60 y 160x65." />
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dimension</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Masas</TableHead>
                          <TableHead>Largo prom.</TableHead>
                          <TableHead>Largo total</TableHead>
                          <TableHead>Losas est.</TableHead>
                          <TableHead>m2 est.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.projectionRows.map((row) => (
                          <TableRow key={`projection-${row.dimension}`}>
                            <TableCell className="font-semibold text-slate-950">{row.dimension}</TableCell>
                            <TableCell>{row.productType}</TableCell>
                            <TableCell>{row.massCount.toLocaleString()}</TableCell>
                            <TableCell>{row.averageLengthM.toFixed(2)} m</TableCell>
                            <TableCell>{row.totalLengthM.toFixed(2)} m</TableCell>
                            <TableCell>{row.estimatedSlabs.toLocaleString()}</TableCell>
                            <TableCell>{row.estimatedM2.toFixed(2)} m2</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                  <SectionTitle eyebrow="Produccion real" title="Salida consolidada por dimension y estado" />
                  {profile.productionRows.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                      No hay produccion diaria consolidada para este origen.
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dimension</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Losas reales</TableHead>
                            <TableHead>m2 reales</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.productionRows.map((row) => (
                            <TableRow key={`${row.dimension}-${row.state}`}>
                              <TableCell className="font-semibold text-slate-950">{row.dimension}</TableCell>
                              <TableCell>{row.state}</TableCell>
                              <TableCell>{row.slabs.toLocaleString()}</TableCell>
                              <TableCell>{row.m2.toFixed(2)} m2</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                    <SectionTitle eyebrow="Stock actual" title="Resumen por estado" />
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Estado</TableHead>
                            <TableHead>Losas</TableHead>
                            <TableHead>m2</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.stateRows.map((row) => (
                            <TableRow key={`state-${row.state}`}>
                              <TableCell className="font-semibold text-slate-950">{row.state}</TableCell>
                              <TableCell>{row.slabs.toLocaleString()}</TableCell>
                              <TableCell>{row.m2.toFixed(2)} m2</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                    <SectionTitle eyebrow="Stock por formato" title="Piso y plancha en la misma ficha" />
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dimension</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Losas</TableHead>
                            <TableHead>m2</TableHead>
                            <TableHead>Precio prom.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.stockByDimensionRows.map((row) => (
                            <TableRow key={`stock-${row.dimension}`}>
                              <TableCell className="font-semibold text-slate-950">{row.dimension}</TableCell>
                              <TableCell>{row.productType}</TableCell>
                              <TableCell>{row.slabs.toLocaleString()}</TableCell>
                              <TableCell>{row.m2.toFixed(2)} m2</TableCell>
                              <TableCell>{formatMoney(row.averagePriceM2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                  <SectionTitle eyebrow="Detalle de masas" title="Piezas que sostienen la proyeccion" />
                  {profile.massRows.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                      No hay masas mono hilo registradas para este bloque o lote.
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Masa</TableHead>
                            <TableHead>Medidas</TableHead>
                            <TableHead>Ubicacion</TableHead>
                            <TableHead>Estimado / disponible</TableHead>
                            <TableHead>Observacion</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.massRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-normal">
                                <p className="font-semibold text-slate-950">{row.code}</p>
                                <p className="text-xs text-slate-500">{formatDate(row.date)}</p>
                              </TableCell>
                              <TableCell className="whitespace-normal">
                                {row.lengthCm.toFixed(2)} x {row.widthCm.toFixed(2)} x {row.depthCm.toFixed(2)} cm
                              </TableCell>
                              <TableCell>{locationLabel[row.location]}</TableCell>
                              <TableCell className="whitespace-normal text-xs text-slate-600">
                                {row.estimatedByDimension.length === 0
                                  ? 'Sin estimados'
                                  : row.estimatedByDimension.map((dimensionRow) => (
                                      <p key={`${row.id}-${dimensionRow.dimension}`}>
                                        {dimensionRow.dimension}: {dimensionRow.estimatedSlabs} / {dimensionRow.availableSlabs} ({dimensionRow.estimatedWastePercent.toFixed(1)}%)
                                      </p>
                                    ))}
                              </TableCell>
                              <TableCell className="whitespace-normal text-xs text-slate-600">{row.observation || '--'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.4)]">
                  <SectionTitle eyebrow="Observaciones" title="Lectura rapida del bloque" />
                  <div className="mt-4 space-y-3">
                    {profile.notes.map((note, index) => (
                      <div key={`note-${profile.originId}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

          </>
        ) : (
          <div className="px-6 py-10">
            <DialogTitle>Ficha no disponible</DialogTitle>
            <DialogDescription className="mt-2">
              Selecciona un bloque o lote desde la tabla para abrir su resumen.
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

