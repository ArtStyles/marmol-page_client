'use client'

import { useEffect, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ChevronDown, Search } from 'lucide-react'
import { useAsignacionesPageState } from '../hooks/use-asignaciones-page-state'
import {
  actionColors,
  actionLabels,
  actionOrder,
  formatLosas,
  formatMoney,
} from '../lib/asignaciones-helpers'

export default function AsignacionesPage() {
  const {
    asignaciones,
    asignacionesReferencia,
    error,
    fechaReferencia,
    groupedAsignaciones,
    loading,
    resumenAcciones,
    searchTerm,
    setSearchTerm,
    topTrabajadores,
    totalPagoReferencia,
    trabajadoresActivos,
  } = useAsignacionesPageState()
  const [expandedWorkers, setExpandedWorkers] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setExpandedWorkers((previous) => {
      const next = groupedAsignaciones.reduce<Record<string, boolean>>((acc, worker) => {
        acc[worker.trabajadorId] = previous[worker.trabajadorId] ?? false
        return acc
      }, {})

      const sameKeys = Object.keys(previous).length === Object.keys(next).length
      const sameValues = Object.entries(next).every(([workerId, isExpanded]) => previous[workerId] === isExpanded)

      if (sameKeys && sameValues) {
        return previous
      }

      return next
    })
  }, [groupedAsignaciones])

  const toggleWorkerDetails = (workerId: string) => {
    setExpandedWorkers((previous) => ({
      ...previous,
      [workerId]: !previous[workerId],
    }))
  }

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen automatico" meta={fechaReferencia}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>m² fecha referencia</span>
            <span className="font-semibold">
              {asignacionesReferencia.reduce((sum, item) => sum + item.totalM2, 0).toFixed(2)} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Trabajadores</span>
            <span className="font-semibold">{trabajadoresActivos}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ganancia estimada</span>
            <span className="font-semibold text-emerald-700">{formatMoney(totalPagoReferencia)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Registros</span>
            <span className="font-semibold">{asignacionesReferencia.length}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Acciones" meta="Fecha referencia">
        <div className="space-y-2 text-sm text-slate-700">
          {actionOrder.map((accion) => (
            <div
              key={accion}
              className={cn(
                'flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2',
                accion === 'pulir' && 'border border-emerald-200/60 bg-emerald-50/70',
              )}
            >
              <span>{actionLabels[accion]}</span>
              <span className={cn('text-xs font-semibold text-slate-900', accion === 'pulir' && 'text-emerald-700')}>
                {formatLosas(resumenAcciones[accion].losas)} losas eq / {resumenAcciones[accion].m2.toFixed(2)} m²
              </span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top trabajadores" meta={fechaReferencia}>
        <div className="space-y-2 text-sm text-slate-700">
          {topTrabajadores.length === 0 ? (
            <p className="text-xs text-slate-500">Sin asignaciones en la fecha de referencia.</p>
          ) : (
            topTrabajadores.map((item) => (
              <div key={item.nombre} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.nombre}</p>
                  <p className="text-[11px] text-slate-500">{item.m2.toFixed(2)} m²</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{formatMoney(item.pago)}</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Asignaciones por trabajador</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Vista automatica desde Produccion diaria. El resultado y el pago se reparten por partes iguales en cada equipo.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            {loading ? <p className="mt-2 text-sm text-slate-500">Cargando asignaciones...</p> : null}
          </div>
          <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
            Auto desde Produccion diaria
          </Badge>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</Label>
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por trabajador, origen, accion, equipo o fecha..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-[0.2em]">
              Reparto por equipo
            </Badge>
          </div>
        </div>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            {groupedAsignaciones.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No hay asignaciones automaticas para los filtros aplicados.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedAsignaciones.map((worker) => {
                  const isExpanded = expandedWorkers[worker.trabajadorId] ?? false

                  return (
                    <div
                      key={worker.trabajadorId}
                      className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                    >
                      <div
                        className={cn(
                          'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
                          isExpanded && 'border-b border-slate-200/70',
                        )}
                      >
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Trabajador</p>
                          <p className="text-base font-semibold text-slate-900">{worker.trabajadorNombre}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {actionOrder.map((accion) => (
                            <div
                              key={`${worker.trabajadorId}-${accion}`}
                              className={cn(
                                'rounded-lg border px-2.5 py-1 text-right',
                                accion === 'pulir'
                                  ? 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700'
                                  : accion === 'resinar'
                                    ? 'border-cyan-200/70 bg-cyan-50/70 text-cyan-700'
                                    : accion === 'devastar'
                                      ? 'border-violet-200/70 bg-violet-50/70 text-violet-700'
                                      : 'border-slate-200 bg-white text-slate-900',
                              )}
                            >
                              <p className={cn('text-[10px] uppercase tracking-[0.2em]', accion === 'pulir' || accion === 'resinar' || accion === 'devastar' ? '' : 'text-slate-500')}>
                                {actionLabels[accion]}
                              </p>
                              <p className="text-sm font-semibold">
                                {formatLosas(worker.resumenAcciones[accion].losas)} / {worker.resumenAcciones[accion].m2.toFixed(2)} m²
                              </p>
                            </div>
                          ))}
                          <div className="rounded-lg border border-cyan-200/70 bg-cyan-50/70 px-2.5 py-1 text-right text-cyan-700">
                            <p className="text-[10px] uppercase tracking-[0.2em]">Ganancia est.</p>
                            <p className="text-sm font-semibold">{formatMoney(worker.totalPagoEstimado)}</p>
                          </div>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`worker-details-${worker.trabajadorId}`}
                            onClick={() => toggleWorkerDetails(worker.trabajadorId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            {isExpanded ? 'Ocultar' : 'Detalle'}
                            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')} />
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div id={`worker-details-${worker.trabajadorId}`} className="divide-y divide-slate-200/60">
                          {worker.lotes.map((lote) => (
                            <div key={`${worker.trabajadorId}-${lote.origenId}`} className="px-4 py-3">
                              <div className="grid gap-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,2.4fr)] lg:items-center">
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Bloque/Lote</p>
                                  <p className="text-sm font-semibold text-slate-900">{lote.origenNombre}</p>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                                  <div className="grid grid-cols-[90px_1fr_92px_92px_118px] border-b border-slate-200/70 px-2.5 py-1">
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Accion</span>
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Equipo</span>
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Losas eq</span>
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">M² eq</span>
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Ganancia est.</span>
                                  </div>

                                  {lote.items.map((item, index) => (
                                    <div
                                      key={item.id}
                                      className={cn(
                                        'grid grid-cols-[90px_1fr_92px_92px_118px] items-center gap-2 px-2.5 py-1.5',
                                        index < lote.items.length - 1 && 'border-b border-slate-200/70',
                                      )}
                                    >
                                      <Badge className={`w-fit ${actionColors[item.accion]}`}>{actionLabels[item.accion]}</Badge>
                                      <div>
                                        <p className="text-xs font-medium text-slate-800">{item.equipoNombre}</p>
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                          Equipo de {item.integrantesEquipo} persona(s) | {item.tipo} / {item.dimension} | Tarifa {formatMoney(item.tarifaAplicada)}
                                        </p>
                                      </div>
                                      <span className="text-right text-sm font-semibold text-slate-800">
                                        {formatLosas(item.cantidadLosas)}
                                        <span className="block text-[10px] font-normal text-slate-500">
                                          pagables {formatLosas(item.losasPagables)}
                                        </span>
                                      </span>
                                      <span className="text-right text-sm font-semibold text-emerald-700">{item.totalM2.toFixed(2)}</span>
                                      <span className="text-right text-sm font-semibold text-cyan-700">{formatMoney(item.pagoEstimado)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
