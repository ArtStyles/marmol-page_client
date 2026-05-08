'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
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

const blockStatusBadgeClass: Record<'activo' | 'agotado' | 'vendido', string> = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  agotado: 'border-amber-200 bg-amber-50 text-amber-700',
  vendido: 'border-sky-200 bg-sky-50 text-sky-700',
}

const blockStatusLabel: Record<'activo' | 'agotado' | 'vendido', string> = {
  activo: 'Activo',
  agotado: 'Agotado',
  vendido: 'Vendido',
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

function formatMetric(value: number, suffix = ''): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`
}

function formatInteger(value: number): string {
  return Math.trunc(value).toLocaleString()
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[var(--agent-radius-panel-lg)] border border-slate-200/80 bg-white/95 p-5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.35)]">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-900">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function FieldItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function renderProductionCell(slabs: number, m2: number): React.ReactNode {
  return (
    <div className="space-y-1">
      <p className="font-medium text-slate-950">{formatInteger(slabs)} losas</p>
      <p className="text-xs text-slate-500">{formatMetric(m2, ' m2')}</p>
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

  if (!profile) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Ficha no disponible</DialogTitle>
          <DialogDescription className="mt-2">
            Selecciona un bloque o lote desde la tabla para abrir su ficha.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    )
  }

  const isBloque = profile.blockType === 'Bloque'
  const hasFloorProduction = profile.ficha.floorRows.some(
    (row) =>
      row.crudoSlabs > 0 ||
      row.escuadradoSlabs > 0 ||
      row.pulidoSlabs > 0 ||
      row.totalM2 > 0,
  )

  const dimensionValue = isBloque
    ? profile.summary.purchasedM2 > 0
      ? `${formatMetric(profile.summary.purchasedM2, ' m3')}`
      : '--'
    : profile.baseDimension
      ? profile.summary.purchasedEquivalentM2 != null
        ? `${profile.baseDimension} / ${formatMetric(profile.summary.purchasedEquivalentM2, ' m2')}`
        : profile.baseDimension
      : '--'

  const entryMetricValue = isBloque
    ? `${formatMetric(profile.summary.purchasedM2, ' m3')}`
    : profile.summary.purchasedEquivalentM2 != null
      ? `${formatInteger(profile.summary.purchasedM2)} losas / ${formatMetric(profile.summary.purchasedEquivalentM2, ' m2')}`
      : `${formatInteger(profile.summary.purchasedM2)} losas`

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 left-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.99))] p-0 sm:max-w-none">
        <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-4 py-4 sm:px-6 lg:px-8">
          <div className="pr-10 sm:pr-12">
            <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">
              Ficha de bloque - control de costo y rendimiento
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                {profile.code}
              </DialogTitle>
              {profile.blockType ? (
                <Badge
                  variant="outline"
                  className="h-7 border-slate-200 bg-white/90 px-2.5 text-xs text-slate-700"
                >
                  {profile.blockType}
                </Badge>
              ) : null}
              {profile.baseDimension ? (
                <Badge
                  variant="outline"
                  className="h-7 border-slate-200 bg-white/90 px-2.5 text-xs text-slate-700"
                >
                  Base {profile.baseDimension}
                </Badge>
              ) : null}
              {profile.blockStatus ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'h-7 px-2.5 text-xs',
                    blockStatusBadgeClass[profile.blockStatus],
                  )}
                >
                  {blockStatusLabel[profile.blockStatus]}
                </Badge>
              ) : null}
            </div>

            <DialogDescription className="mt-3 max-w-4xl text-sm leading-5 text-slate-600">
              Vista ajustada a la ficha operativa del bloque o lote, con el mismo orden de
              informacion de las fichas PDF.
            </DialogDescription>
          </div>
        </div>

        <ScrollArea className="min-h-0">
          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <SectionCard title="1. Datos del bloque">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <FieldItem label="Codigo del bloque" value={profile.code} />
                <FieldItem label="Dimension" value={dimensionValue} />
                <FieldItem label="Fecha de compra" value={formatDate(profile.entryDate)} />
                <FieldItem
                  label="Fecha de cierre"
                  value={profile.ficha.closureDate ? formatDate(profile.ficha.closureDate) : 'Abierto'}
                />
                <FieldItem
                  label="Cantera / origen"
                  value={profile.block?.canteraOrigen?.trim() || profile.provider || profile.originName}
                />
                <FieldItem label="Tipo de produccion" value={profile.ficha.productionType} />
              </div>
            </SectionCard>

            <SectionCard title="2. Costo inicial del bloque">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Costo del bloque</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMoney(profile.summary.initialCost)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Transporte hasta el taller</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMoney(profile.summary.transportCost)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-950">TOTAL INICIAL</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMoney(profile.summary.totalInitialCost)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <FieldItem label={isBloque ? 'Registro base' : 'Cantidad inicial'} value={entryMetricValue} />
                <FieldItem label="m2 vendibles" value={formatMetric(profile.summary.vendibleM2, ' m2')} />
              </div>
            </SectionCard>

            <SectionCard
              title="3. Registro de masas"
              description={isBloque ? monoHiloFormulaHint : 'No aplica para lotes.'}
            >
              {!isBloque ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  Los lotes no manejan registro de masas de mono hilo.
                </div>
              ) : profile.ficha.massRegisterRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  Todavia no hay masas registradas para este bloque.
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cod. masa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Dimension</TableHead>
                          <TableHead>Largo (m)</TableHead>
                          <TableHead>Losas est.</TableHead>
                          <TableHead>m2 estim.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.ficha.massRegisterRows.map((row) => (
                          <TableRow key={`${row.massId}-${row.dimension}`}>
                            <TableCell className="font-semibold text-slate-950">{row.massCode}</TableCell>
                            <TableCell>{row.productType}</TableCell>
                            <TableCell>{row.dimension}</TableCell>
                            <TableCell>{formatMetric(row.lengthM)}</TableCell>
                            <TableCell>{formatInteger(row.estimatedSlabs)}</TableCell>
                            <TableCell>{formatMetric(row.estimatedM2, ' m2')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <FieldItem
                      label="Total est. piso (m2)"
                      value={formatMetric(profile.summary.floorEstimatedM2, ' m2')}
                    />
                    <FieldItem
                      label="Total est. plancha (m2)"
                      value={formatMetric(profile.summary.slabEstimatedM2, ' m2')}
                    />
                    <FieldItem
                      label="TOTAL GRAL. ESTIMADO (m2)"
                      value={formatMetric(profile.summary.estimatedM2, ' m2')}
                    />
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard
              title="4. Control acumulativo de picado"
              description="Cada fila conserva la masa, fecha, dimension y responsable del registro real de picado."
            >
              {!isBloque ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  Esta seccion no aplica para lotes.
                </div>
              ) : profile.ficha.massControlRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  Todavia no hay registros acumulativos de picado para este bloque.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Masa</TableHead>
                        <TableHead>Dimension</TableHead>
                        <TableHead>Losas</TableHead>
                        <TableHead>m2</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Observacion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.ficha.massControlRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-slate-900">{formatDate(row.fecha)}</TableCell>
                          <TableCell className="font-semibold text-slate-950">{row.massCode}</TableCell>
                          <TableCell>{row.dimension}</TableCell>
                          <TableCell>{formatInteger(row.producedSlabs)}</TableCell>
                          <TableCell>{formatMetric(row.producedM2, ' m2')}</TableCell>
                          <TableCell className="whitespace-normal text-slate-700">{row.responsible}</TableCell>
                          <TableCell className="whitespace-normal text-slate-700">
                            {row.observation || '--'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="5. Produccion real de piso">
              {!hasFloorProduction ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  No hay produccion real de piso consolidada para este origen.
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dimension</TableHead>
                          <TableHead>Crudo</TableHead>
                          <TableHead>Escuadrado</TableHead>
                          <TableHead>Pulido</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.ficha.floorRows.map((row) => (
                          <TableRow key={`floor-${row.dimension}`}>
                            <TableCell className="font-semibold text-slate-950">{row.dimension}</TableCell>
                            <TableCell>{renderProductionCell(row.crudoSlabs, row.crudoM2)}</TableCell>
                            <TableCell>{renderProductionCell(row.escuadradoSlabs, row.escuadradoM2)}</TableCell>
                            <TableCell>{renderProductionCell(row.pulidoSlabs, row.pulidoM2)}</TableCell>
                            <TableCell className="font-semibold text-slate-950">
                              {formatMetric(row.totalM2, ' m2')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <FieldItem
                      label="Total piso (m2)"
                      value={formatMetric(profile.ficha.floorTotals.totalM2, ' m2')}
                    />
                    <FieldItem
                      label="Total Crudo (m2)"
                      value={formatMetric(profile.ficha.floorTotals.crudoM2, ' m2')}
                    />
                    <FieldItem
                      label="Total Escuadrado (m2)"
                      value={formatMetric(profile.ficha.floorTotals.escuadradoM2, ' m2')}
                    />
                    <FieldItem
                      label="Total Pulido (m2)"
                      value={formatMetric(profile.ficha.floorTotals.pulidoM2, ' m2')}
                    />
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard title="6. Produccion de planchas">
              {profile.ficha.slabRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  No hay produccion de planchas consolidada para este origen.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dimension</TableHead>
                        <TableHead>Cantidad de unidades</TableHead>
                        <TableHead>Equiv. m2</TableHead>
                        <TableHead>Observacion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.ficha.slabRows.map((row) => (
                        <TableRow key={`slab-${row.dimension}`}>
                          <TableCell className="font-semibold text-slate-950">{row.dimension}</TableCell>
                          <TableCell>{formatInteger(row.units)}</TableCell>
                          <TableCell>{formatMetric(row.m2, ' m2')}</TableCell>
                          <TableCell className="whitespace-normal text-sm text-slate-600">
                            {row.observation}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="7. Costos directos del bloque">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Mano de obra</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMoney(profile.summary.laborCost)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Resina</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {profile.summary.resinQty > 0
                          ? `${formatMetric(profile.summary.resinQty, ' L')}`
                          : 'No registrado'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Otros gastos directos (especificar)</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMoney(profile.summary.otherDirectCost)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {profile.ficha.otherDirectExpenseItems.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {profile.ficha.otherDirectExpenseItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                    >
                      <p className="text-slate-700">{item.label}</p>
                      <p className="font-semibold text-slate-950">{formatMoney(item.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="8. Resumen del bloque">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total invertido (real)</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMoney(profile.summary.totalInvestedRecorded)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total m2 estimados</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMetric(profile.summary.estimatedM2, ' m2')}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total m2 piso</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMetric(profile.summary.floorRealM2, ' m2')}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total m2 plancha (equivalente)</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMetric(profile.summary.slabRealM2, ' m2')}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-950">
                        TOTAL GENERAL REAL (m2)
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMetric(profile.summary.generalRealM2, ' m2')}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Diferencia (m2)</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMetric(profile.summary.differenceM2, ' m2')}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Porcentaje de rendimiento (%)</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {profile.summary.yieldRatio === null
                          ? '--'
                          : `${(profile.summary.yieldRatio * 100).toFixed(2)}%`}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Merma total (m2)</TableCell>
                      <TableCell className="text-right font-semibold text-slate-950">
                        {formatMetric(profile.summary.wasteLossM2, ' m2')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </SectionCard>

            <SectionCard title="9. Registro de merma">
              {profile.ficha.wasteRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  No hay mermas aprobadas o consolidadas para este origen.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dimension</TableHead>
                        <TableHead>Tipo de merma</TableHead>
                        <TableHead>m2</TableHead>
                        <TableHead>m2 recuperados</TableHead>
                        <TableHead>Perdida (m2)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.ficha.wasteRows.map((row) => (
                        <TableRow key={`${row.dimension}-${row.wasteType}`}>
                          <TableCell className="font-semibold text-slate-950">{row.dimension}</TableCell>
                          <TableCell className="whitespace-normal text-slate-700">{row.wasteType}</TableCell>
                          <TableCell>{formatMetric(row.totalM2, ' m2')}</TableCell>
                          <TableCell>{formatMetric(row.recoveredM2, ' m2')}</TableCell>
                          <TableCell className="font-semibold text-slate-950">
                            {formatMetric(row.lossM2, ' m2')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="10. Cierre de masas">
              {!isBloque ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  Esta seccion no aplica para lotes.
                </div>
              ) : profile.ficha.massClosureRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
                  No hay masas con registros acumulativos suficientes para cerrar.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Masa</TableHead>
                        <TableHead>Dim. inicial</TableHead>
                        <TableHead>Estimado</TableHead>
                        <TableHead>Real</TableHead>
                        <TableHead>Diferencia</TableHead>
                        <TableHead>Fecha cierre</TableHead>
                        <TableHead>Observacion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.ficha.massClosureRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-semibold text-slate-950">{row.massCode}</TableCell>
                          <TableCell>{row.initialDimension ?? '--'}</TableCell>
                          <TableCell>{formatInteger(row.estimatedSlabs)}</TableCell>
                          <TableCell className="whitespace-normal text-slate-700">
                            {formatInteger(row.realProducedSlabs)} losas / {formatMetric(row.realProducedM2, ' m2')}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-950">
                            {formatInteger(row.differenceSlabs)}
                          </TableCell>
                          <TableCell>{row.closureDate ? formatDate(row.closureDate) : 'Abierta'}</TableCell>
                          <TableCell className="whitespace-normal text-slate-700">
                            {row.observation}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
