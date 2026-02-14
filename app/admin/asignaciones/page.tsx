'use client'

import { useMemo, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProduccionStore } from '@/hooks/use-produccion'
import {
  losasAMetros,
  type AccionLosa,
  type Dimension,
  type ProduccionDiaria,
  type TipoProducto,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

type AsignacionItem = {
  id: string
  fecha: string
  trabajadorId: string
  trabajadorNombre: string
  origenId: string
  origenNombre: string
  tipo: TipoProducto
  dimension: Dimension
  accion: AccionLosa
  equipoId: string
  equipoNombre: string
  cantidadLosas: number
  totalM2: number
}

type AccionResumen = {
  losas: number
  m2: number
}

type ProduccionLoteGroup = {
  origenId: string
  origenNombre: string
  items: AsignacionItem[]
}

type ProduccionWorkerGroup = {
  trabajadorId: string
  trabajadorNombre: string
  lotes: ProduccionLoteGroup[]
  resumenAcciones: Record<AccionLosa, AccionResumen>
}

const actionOrder: AccionLosa[] = ['picar', 'pulir', 'escuadrar']

const actionLabels: Record<AccionLosa, string> = {
  picar: 'Picar',
  pulir: 'Pulir',
  escuadrar: 'Escuadrar',
}

const actionColors: Record<AccionLosa, string> = {
  picar: 'bg-blue-100 text-blue-800',
  pulir: 'bg-green-100 text-green-800',
  escuadrar: 'bg-amber-100 text-amber-800',
}

function createResumenAcciones(): Record<AccionLosa, AccionResumen> {
  return {
    picar: { losas: 0, m2: 0 },
    pulir: { losas: 0, m2: 0 },
    escuadrar: { losas: 0, m2: 0 },
  }
}

function actionSortIndex(accion: AccionLosa): number {
  return actionOrder.indexOf(accion)
}

function buildAsignacionesFromProduccion(registros: ProduccionDiaria[]): AsignacionItem[] {
  const items: AsignacionItem[] = []

  registros.forEach((registro) => {
    const detalles = registro.detallesAcciones ?? []

    if (detalles.length > 0) {
      detalles.forEach((detalle) => {
        items.push({
          id: `${registro.id}-${detalle.id}`,
          fecha: registro.fecha,
          trabajadorId: detalle.trabajadorId,
          trabajadorNombre: detalle.trabajadorNombre,
          origenId: registro.origenId,
          origenNombre: registro.origenNombre,
          tipo: registro.tipo,
          dimension: registro.dimension,
          accion: detalle.accion,
          equipoId: detalle.equipoId,
          equipoNombre: detalle.equipoNombre,
          cantidadLosas: detalle.cantidadLosas,
          totalM2:
            detalle.metrosCuadrados > 0
              ? detalle.metrosCuadrados
              : losasAMetros(detalle.cantidadLosas, registro.dimension),
        })
      })
      return
    }

    const legacyActions: Array<{ accion: AccionLosa; cantidad: number }> = [
      { accion: 'picar', cantidad: registro.cantidadPicar },
      { accion: 'pulir', cantidad: registro.cantidadPulir },
      { accion: 'escuadrar', cantidad: registro.cantidadEscuadrar },
    ]

    legacyActions
      .filter((entry) => entry.cantidad > 0)
      .forEach((entry) => {
        items.push({
          id: `${registro.id}-${entry.accion}-legacy`,
          fecha: registro.fecha,
          trabajadorId: 'sin-asignar',
          trabajadorNombre: 'Sin detalle',
          origenId: registro.origenId,
          origenNombre: registro.origenNombre,
          tipo: registro.tipo,
          dimension: registro.dimension,
          accion: entry.accion,
          equipoId: 'sin-equipo',
          equipoNombre: 'Sin equipo',
          cantidadLosas: entry.cantidad,
          totalM2: losasAMetros(entry.cantidad, registro.dimension),
        })
      })
  })

  return items.sort((a, b) => {
    const dateDiff = b.fecha.localeCompare(a.fecha)
    if (dateDiff !== 0) return dateDiff

    const workerDiff = a.trabajadorNombre.localeCompare(b.trabajadorNombre)
    if (workerDiff !== 0) return workerDiff

    return actionSortIndex(a.accion) - actionSortIndex(b.accion)
  })
}

export default function AsignacionesPage() {
  const { produccion } = useProduccionStore()
  const [searchTerm, setSearchTerm] = useState('')

  const asignaciones = useMemo(
    () => buildAsignacionesFromProduccion(produccion),
    [produccion],
  )

  const filteredAsignaciones = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()
    if (!query) return asignaciones

    return asignaciones.filter((item) => {
      return (
        item.trabajadorNombre.toLowerCase().includes(query) ||
        item.origenNombre.toLowerCase().includes(query) ||
        item.accion.toLowerCase().includes(query) ||
        item.equipoNombre.toLowerCase().includes(query) ||
        item.fecha.includes(query)
      )
    })
  }, [asignaciones, searchTerm])

  const fechaReferencia = asignaciones[0]?.fecha ?? new Date().toISOString().split('T')[0]

  const asignacionesReferencia = useMemo(
    () => asignaciones.filter((item) => item.fecha === fechaReferencia),
    [asignaciones, fechaReferencia],
  )

  const trabajadoresActivos = new Set(asignacionesReferencia.map((item) => item.trabajadorId)).size

  const resumenAcciones = useMemo(() => {
    return asignacionesReferencia.reduce<Record<AccionLosa, AccionResumen>>(
      (acc, item) => {
        acc[item.accion].losas += item.cantidadLosas
        acc[item.accion].m2 += item.totalM2
        return acc
      },
      createResumenAcciones(),
    )
  }, [asignacionesReferencia])

  const topTrabajadores = useMemo(() => {
    const grouped = asignacionesReferencia.reduce<Record<string, { nombre: string; m2: number }>>(
      (acc, item) => {
        if (!acc[item.trabajadorId]) {
          acc[item.trabajadorId] = { nombre: item.trabajadorNombre, m2: 0 }
        }
        acc[item.trabajadorId].m2 += item.totalM2
        return acc
      },
      {},
    )

    return Object.values(grouped)
      .sort((a, b) => b.m2 - a.m2)
      .slice(0, 3)
  }, [asignacionesReferencia])

  const groupedAsignaciones = useMemo(() => {
    const grouped = filteredAsignaciones.reduce<ProduccionWorkerGroup[]>((acc, item) => {
      let worker = acc.find((entry) => entry.trabajadorId === item.trabajadorId)

      if (!worker) {
        worker = {
          trabajadorId: item.trabajadorId,
          trabajadorNombre: item.trabajadorNombre,
          lotes: [],
          resumenAcciones: createResumenAcciones(),
        }
        acc.push(worker)
      }

      worker.resumenAcciones[item.accion].losas += item.cantidadLosas
      worker.resumenAcciones[item.accion].m2 += item.totalM2

      let lote = worker.lotes.find((entry) => entry.origenId === item.origenId)
      if (!lote) {
        lote = {
          origenId: item.origenId,
          origenNombre: item.origenNombre,
          items: [],
        }
        worker.lotes.push(lote)
      }

      lote.items.push(item)

      return acc
    }, [])

    return grouped
      .map((worker) => ({
        ...worker,
        lotes: worker.lotes
          .map((lote) => ({
            ...lote,
            items: [...lote.items].sort((a, b) => {
              const dateDiff = b.fecha.localeCompare(a.fecha)
              if (dateDiff !== 0) return dateDiff

              const actionDiff = actionSortIndex(a.accion) - actionSortIndex(b.accion)
              if (actionDiff !== 0) return actionDiff

              return a.equipoNombre.localeCompare(b.equipoNombre)
            }),
          }))
          .sort((a, b) => a.origenNombre.localeCompare(b.origenNombre)),
      }))
      .sort((a, b) => a.trabajadorNombre.localeCompare(b.trabajadorNombre))
  }, [filteredAsignaciones])

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen automatico" meta={fechaReferencia}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>m2 fecha referencia</span>
            <span className="font-semibold">
              {asignacionesReferencia.reduce((sum, item) => sum + item.totalM2, 0).toFixed(2)} m2
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Trabajadores</span>
            <span className="font-semibold">{trabajadoresActivos}</span>
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
                {resumenAcciones[accion].losas} losas / {resumenAcciones[accion].m2.toFixed(2)} m2
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
                  <p className="text-[11px] text-slate-500">{item.m2.toFixed(2)} m2</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{item.m2.toFixed(2)} m2</span>
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
              Esta vista se genera automaticamente desde Produccion diaria. Por ahora usa datos mock hasta conectar API.
            </p>
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
              Mock temporal
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
                {groupedAsignaciones.map((worker) => (
                  <div
                    key={worker.trabajadorId}
                    className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-200/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Trabajador</p>
                        <p className="text-base font-semibold text-slate-900">{worker.trabajadorNombre}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Picar</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {worker.resumenAcciones.picar.losas} / {worker.resumenAcciones.picar.m2.toFixed(2)} m2
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-right text-emerald-700">
                          <p className="text-[10px] uppercase tracking-[0.2em]">Pulir</p>
                          <p className="text-sm font-semibold">
                            {worker.resumenAcciones.pulir.losas} / {worker.resumenAcciones.pulir.m2.toFixed(2)} m2
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Escuadrar</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {worker.resumenAcciones.escuadrar.losas} / {worker.resumenAcciones.escuadrar.m2.toFixed(2)} m2
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200/60">
                      {worker.lotes.map((lote) => (
                        <div key={`${worker.trabajadorId}-${lote.origenId}`} className="px-4 py-3">
                          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,2.4fr)] lg:items-center">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Bloque/Lote</p>
                              <p className="text-sm font-semibold text-slate-900">{lote.origenNombre}</p>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                              <div className="grid grid-cols-[90px_1fr_80px_80px] border-b border-slate-200/70 px-2.5 py-1">
                                <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Accion</span>
                                <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Equipo</span>
                                <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Losas</span>
                                <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">M2</span>
                              </div>

                              {lote.items.map((item, index) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    'grid grid-cols-[90px_1fr_80px_80px] items-center gap-2 px-2.5 py-1.5',
                                    index < lote.items.length - 1 && 'border-b border-slate-200/70',
                                  )}
                                >
                                  <Badge className={`w-fit ${actionColors[item.accion]}`}>{actionLabels[item.accion]}</Badge>
                                  <div>
                                    <p className="text-xs font-medium text-slate-800">{item.equipoNombre}</p>
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                      {item.tipo} / {item.dimension}
                                    </p>
                                  </div>
                                  <span className="text-right text-sm font-semibold text-slate-800">{item.cantidadLosas}</span>
                                  <span className="text-right text-sm font-semibold text-emerald-700">{item.totalM2.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
