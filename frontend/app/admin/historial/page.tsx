'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { DataTable, type Column } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  getHistorialPagos,
  getInventarioMovimientos,
  getLogs,
  getMonoHiloMasas,
  getProduccion,
  getVentas,
} from '@/lib/resources-api'
import type {
  HistorialPago,
  InventarioMovimiento,
  MonoHiloMasa,
  ProduccionDiaria,
  SystemLog,
  Venta,
} from '@/lib/types'

type AuditLevel = SystemLog['nivel']
type AuditSource = 'produccion' | 'mono_hilo' | 'inventario' | 'ventas' | 'pagos' | 'logs'
type SourceStatus = 'loaded' | 'failed'

interface AuditEvent {
  id: string
  fecha: string
  fuente: AuditSource
  actor: string
  modulo: string
  accion: string
  descripcion: string
  nivel: AuditLevel
  referencia: string
  sortAt: number
  isAnulacion: boolean
}

const SOURCE_LABELS: Record<AuditSource, string> = {
  produccion: 'Produccion',
  mono_hilo: 'Masas',
  inventario: 'Inventario',
  ventas: 'Ventas',
  pagos: 'Pagos',
  logs: 'Logs',
}

const SOURCE_STATUS_LABELS: Record<AuditSource, string> = {
  produccion: 'Produccion diaria',
  mono_hilo: 'Masas mono hilo',
  inventario: 'Movimientos de inventario',
  ventas: 'Ventas',
  pagos: 'Historial de pagos',
  logs: 'Logs manuales',
}

const SOURCE_BADGE_STYLES: Record<AuditSource, string> = {
  produccion: 'border-sky-200 bg-sky-50 text-sky-700',
  mono_hilo: 'border-violet-200 bg-violet-50 text-violet-700',
  inventario: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ventas: 'border-orange-200 bg-orange-50 text-orange-700',
  pagos: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  logs: 'border-slate-200 bg-slate-50 text-slate-700',
}

const LEVEL_BADGE_STYLES: Record<AuditLevel, string> = {
  info: 'bg-blue-100 text-blue-800',
  alerta: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_FORMATTER = new Intl.DateTimeFormat('es-CU', { dateStyle: 'medium' })
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-CU', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const NUMBER_FORMATTER = new Intl.NumberFormat('es-CU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const NO_ACTOR_LABEL = 'Sin usuario persistido'

export default function HistorialPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceStatus, setSourceStatus] = useState<Record<AuditSource, SourceStatus>>({
    produccion: 'failed',
    mono_hilo: 'failed',
    inventario: 'failed',
    ventas: 'failed',
    pagos: 'failed',
    logs: 'failed',
  })

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setError(null)
      setWarnings([])

      const [produccionResult, masasResult, inventarioResult, ventasResult, pagosResult, logsResult] =
        await Promise.allSettled([
          getProduccion(),
          getMonoHiloMasas(),
          getInventarioMovimientos(),
          getVentas(),
          getHistorialPagos(),
          getLogs(),
        ])

      if (!alive) return

      const nextSourceStatus: Record<AuditSource, SourceStatus> = {
        produccion: produccionResult.status === 'fulfilled' ? 'loaded' : 'failed',
        mono_hilo: masasResult.status === 'fulfilled' ? 'loaded' : 'failed',
        inventario: inventarioResult.status === 'fulfilled' ? 'loaded' : 'failed',
        ventas: ventasResult.status === 'fulfilled' ? 'loaded' : 'failed',
        pagos: pagosResult.status === 'fulfilled' ? 'loaded' : 'failed',
        logs: logsResult.status === 'fulfilled' ? 'loaded' : 'failed',
      }

      const nextWarnings: string[] = []
      const produccion =
        produccionResult.status === 'fulfilled'
          ? produccionResult.value
          : pushSourceWarning(nextWarnings, 'produccion', produccionResult.reason)
      const masas =
        masasResult.status === 'fulfilled'
          ? masasResult.value
          : pushSourceWarning(nextWarnings, 'mono_hilo', masasResult.reason)
      const inventario =
        inventarioResult.status === 'fulfilled'
          ? inventarioResult.value
          : pushSourceWarning(nextWarnings, 'inventario', inventarioResult.reason)
      const ventas =
        ventasResult.status === 'fulfilled'
          ? ventasResult.value
          : pushSourceWarning(nextWarnings, 'ventas', ventasResult.reason)
      const pagos =
        pagosResult.status === 'fulfilled'
          ? pagosResult.value
          : pushSourceWarning(nextWarnings, 'pagos', pagosResult.reason)
      const logs =
        logsResult.status === 'fulfilled'
          ? logsResult.value
          : pushSourceWarning(nextWarnings, 'logs', logsResult.reason)

      setSourceStatus(nextSourceStatus)
      setWarnings(nextWarnings)
      setEvents(buildAuditTimeline({ produccion, masas, inventario, ventas, pagos, logs }))

      if (Object.values(nextSourceStatus).every((status) => status === 'failed')) {
        setError('No se pudo cargar ninguna fuente del historial operativo.')
      }

      setLoading(false)
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const filteredEvents = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase()
    if (normalizedTerm.length === 0) return events

    return events.filter((event) =>
      [
        event.actor,
        event.accion,
        event.modulo,
        event.descripcion,
        event.referencia,
        SOURCE_LABELS[event.fuente],
        event.fecha,
      ].some((field) => field.toLowerCase().includes(normalizedTerm)),
    )
  }, [events, searchTerm])

  const totalEvents = events.length
  const totalAnulaciones = events.filter((event) => event.isAnulacion).length
  const totalProduccion = events.filter((event) => event.fuente === 'produccion').length
  const totalInventario = events.filter((event) => event.fuente === 'inventario').length
  const totalVentas = events.filter((event) => event.fuente === 'ventas').length
  const totalPagos = events.filter((event) => event.fuente === 'pagos').length
  const totalMasas = events.filter((event) => event.fuente === 'mono_hilo').length
  const totalLogs = events.filter((event) => event.fuente === 'logs').length
  const recentEvents = filteredEvents.slice(0, 4)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen auditoria" meta={`${totalEvents} eventos`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Produccion</span>
            <span className="font-semibold">{totalProduccion}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Inventario</span>
            <span className="font-semibold">{totalInventario}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ventas</span>
            <span className="font-semibold">{totalVentas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pagos</span>
            <span className="font-semibold">{totalPagos}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Masas</span>
            <span className="font-semibold">{totalMasas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Anulaciones</span>
            <span className="font-semibold">{totalAnulaciones}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Logs</span>
            <span className="font-semibold">{totalLogs}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Cobertura" meta="Fuentes cargadas">
        <div className="space-y-3 text-sm text-slate-700">
          {Object.entries(SOURCE_STATUS_LABELS).map(([source, label]) => {
            const status = sourceStatus[source as AuditSource]
            return (
              <div key={source} className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <Badge
                  variant="outline"
                  className={
                    status === 'loaded'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }
                >
                  {status === 'loaded' ? 'Cargada' : 'Fallida'}
                </Badge>
              </div>
            )
          })}
          {warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-800">
              {warnings.join(' ')}
            </div>
          ) : null}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Ultimos eventos" meta="Reciente">
        <div className="space-y-2 text-sm text-slate-700">
          {recentEvents.length === 0 ? (
            <p className="text-xs text-slate-500">Sin eventos recientes.</p>
          ) : (
            recentEvents.map((event) => (
              <div
                key={event.id}
                className={`rounded-2xl border bg-white/85 px-3 py-2 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.45)] ${
                  event.nivel === 'error'
                    ? 'border-red-200/80'
                    : event.nivel === 'alerta'
                      ? 'border-amber-200/80'
                      : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-900">{event.accion}</p>
                    <p className="text-[10px] text-slate-500">{formatAuditDate(event.fecha)}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${SOURCE_BADGE_STYLES[event.fuente]}`}>
                    {SOURCE_LABELS[event.fuente]}
                  </Badge>
                </div>
                <div className="mt-2 border-t border-slate-200/70 pt-2">
                  <p className="line-clamp-2 text-[11px] text-slate-600">{event.descripcion}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const columns: Column<AuditEvent>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (event) => (
        <div className="space-y-1 text-right">
          <p>{formatAuditDate(event.fecha)}</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{event.referencia}</p>
        </div>
      ),
    },
    {
      key: 'fuente',
      header: 'Fuente',
      render: (event) => (
        <Badge variant="outline" className={SOURCE_BADGE_STYLES[event.fuente]}>
          {SOURCE_LABELS[event.fuente]}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (event) => (
        <span className={event.actor === NO_ACTOR_LABEL ? 'text-xs font-medium text-amber-700' : ''}>
          {event.actor}
        </span>
      ),
    },
    { key: 'modulo', header: 'Modulo' },
    { key: 'accion', header: 'Accion' },
    {
      key: 'descripcion',
      header: 'Detalle',
      render: (event) => (
        <p className="max-w-[30rem] whitespace-normal text-right text-xs font-medium leading-relaxed text-slate-700">
          {event.descripcion}
        </p>
      ),
    },
    {
      key: 'nivel',
      header: 'Nivel',
      render: (event) => <Badge className={LEVEL_BADGE_STYLES[event.nivel]}>{event.nivel}</Badge>,
    },
  ]

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Historial del Sistema</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Auditoria consolidada de produccion, mono hilo, inventario, ventas, pagos y logs persistidos.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            {loading ? (
              <p className="mt-2 text-sm text-muted-foreground">Cargando auditoria operativa...</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por actor, referencia, modulo o accion..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <DataTable
          data={filteredEvents}
          columns={columns}
          emptyMessage="No hay eventos persistidos en el historial operativo"
        />
      </div>
    </AdminShell>
  )
}

function pushSourceWarning(
  warnings: string[],
  source: AuditSource,
  reason: unknown,
): [] {
  const message = reason instanceof Error ? reason.message : 'Error desconocido'
  warnings.push(`No se pudo cargar ${SOURCE_STATUS_LABELS[source].toLowerCase()}: ${message}.`)
  return []
}

function buildAuditTimeline(input: {
  produccion: ProduccionDiaria[]
  masas: MonoHiloMasa[]
  inventario: InventarioMovimiento[]
  ventas: Venta[]
  pagos: HistorialPago[]
  logs: SystemLog[]
}): AuditEvent[] {
  const inventarioById = new Map(input.inventario.map((item) => [item.id, item]))

  return [
    ...buildProduccionEvents(input.produccion),
    ...buildMonoHiloMassEvents(input.masas),
    ...buildInventarioEvents(input.inventario),
    ...buildVentaEvents(input.ventas, inventarioById),
    ...buildPagoEvents(input.pagos),
    ...buildLogEvents(input.logs),
  ].sort((left, right) => right.sortAt - left.sortAt || right.id.localeCompare(left.id))
}

function buildProduccionEvents(produccion: ProduccionDiaria[]): AuditEvent[] {
  return produccion.flatMap((item) => {
    const events: AuditEvent[] = []
    const isMonoHilo = item.workflowTipo === 'mono_hilo'

    events.push(
      createAuditEvent({
        id: `produccion-registro-${item.id}`,
        fecha: item.createdAt ?? item.fecha,
        fuente: 'produccion',
        actor: item.creadoPorNombre,
        modulo: 'Produccion diaria',
        accion: isMonoHilo ? 'Registro mono hilo' : 'Registro de produccion',
        descripcion: isMonoHilo ? describeMonoHiloRegistro(item) : describeProduccionRegular(item),
        nivel: 'info',
        referencia: item.id,
      }),
    )

    if (!isMonoHilo && item.aprobacionTallerFecha) {
      const approved = item.aprobacionTallerEstado === 'aprobado'
      events.push(
        createAuditEvent({
          id: `produccion-taller-${item.id}`,
          fecha: item.aprobacionTallerFecha,
          fuente: 'produccion',
          actor: item.aprobacionTallerPorNombre,
          modulo: 'Produccion diaria',
          accion: approved ? 'Aprobacion de taller' : 'Rechazo de taller',
          descripcion: describeTallerDecision(item),
          nivel: approved ? 'info' : 'alerta',
          referencia: item.id,
        }),
      )
    }

    if (!isMonoHilo && item.aprobacionAlmacenFecha && item.aprobacionAlmacenEstado === 'aprobado') {
      events.push(
        createAuditEvent({
          id: `produccion-almacen-${item.id}`,
          fecha: item.aprobacionAlmacenFecha,
          fuente: 'produccion',
          actor: item.aprobacionAlmacenPorNombre,
          modulo: 'Produccion diaria',
          accion: 'Entrada a almacen aprobada',
          descripcion: describeAlmacenDecision(item),
          nivel: 'info',
          referencia: item.id,
        }),
      )
    }

    if (isMonoHilo && item.estadoRegistro === 'anulado' && item.anuladoFecha) {
      events.push(
        createAuditEvent({
          id: `produccion-anulacion-${item.id}`,
          fecha: item.anuladoFecha,
          fuente: 'produccion',
          actor: item.anuladoPorNombre,
          modulo: 'Produccion diaria',
          accion: 'Anulacion de registro mono hilo',
          descripcion: describeMonoHiloAnulacion(item),
          nivel: 'alerta',
          referencia: item.id,
          isAnulacion: true,
        }),
      )
    }

    return events
  })
}

function buildMonoHiloMassEvents(masas: MonoHiloMasa[]): AuditEvent[] {
  const creationEvents = masas
    .filter((masa) => !masa.produccionId)
    .map((masa) =>
      createAuditEvent({
        id: `masa-registro-${masa.id}`,
        fecha: masa.fechaRegistro,
        fuente: 'mono_hilo',
        actor: masa.creadoPorNombre,
        modulo: 'Mono hilo',
        accion: 'Registro de masa mono hilo',
        descripcion: describeMasaRegistrada(masa),
        nivel: 'info',
        referencia: masa.codigo,
      }),
    )

  const cancellationEvents = masas
    .filter((masa) => masa.estado === 'anulada')
    .map((masa) =>
      createAuditEvent({
        id: `masa-anulacion-${masa.id}`,
        fecha: masa.anuladoFecha ?? masa.fechaRegistro,
        fuente: 'mono_hilo',
        actor: masa.anuladoPorNombre,
        modulo: 'Mono hilo',
        accion: 'Masa anulada',
        descripcion: describeMasaAnulada(masa),
        nivel: 'alerta',
        referencia: masa.codigo,
        isAnulacion: true,
      }),
    )

  return [...creationEvents, ...cancellationEvents]
}

function buildInventarioEvents(movimientos: InventarioMovimiento[]): AuditEvent[] {
  return movimientos.flatMap((movimiento) => {
    const events: AuditEvent[] = [
      createAuditEvent({
        id: `inventario-solicitud-${movimiento.id}`,
        fecha: movimiento.fechaSolicitud,
        fuente: 'inventario',
        actor: movimiento.solicitadoPorNombre,
        modulo: 'Inventario',
        accion: describeInventarioRequestAction(movimiento),
        descripcion: describeInventarioRequest(movimiento),
        nivel: 'info',
        referencia: movimiento.id,
      }),
    ]

    if (movimiento.estado === 'aprobado' && movimiento.fechaResolucion) {
      events.push(
        createAuditEvent({
          id: `inventario-aprobacion-${movimiento.id}`,
          fecha: movimiento.fechaResolucion,
          fuente: 'inventario',
          actor: movimiento.aprobadoPorNombre,
          modulo: 'Inventario',
          accion: 'Movimiento de inventario aprobado',
          descripcion: describeInventarioResolution(movimiento),
          nivel: 'info',
          referencia: movimiento.id,
        }),
      )
    }

    if (movimiento.estado === 'rechazado' && movimiento.fechaResolucion) {
      events.push(
        createAuditEvent({
          id: `inventario-rechazo-${movimiento.id}`,
          fecha: movimiento.fechaResolucion,
          fuente: 'inventario',
          actor: movimiento.aprobadoPorNombre,
          modulo: 'Inventario',
          accion: 'Movimiento de inventario rechazado',
          descripcion: describeInventarioResolution(movimiento),
          nivel: 'alerta',
          referencia: movimiento.id,
        }),
      )
    }

    return events
  })
}

function buildVentaEvents(
  ventas: Venta[],
  inventarioById: Map<string, InventarioMovimiento>,
): AuditEvent[] {
  return ventas.map((venta) => {
    const movimiento = venta.movimientoInventarioId
      ? inventarioById.get(venta.movimientoInventarioId)
      : undefined

    return createAuditEvent({
      id: `venta-${venta.id}`,
      fecha: venta.createdAt ?? movimiento?.fechaSolicitud ?? venta.fecha,
      fuente: 'ventas',
      actor: venta.creadoPorNombre ?? movimiento?.solicitadoPorNombre,
      modulo: 'Ventas',
      accion: 'Venta registrada',
      descripcion: describeVenta(venta),
      nivel: venta.estado === 'cancelada' ? 'alerta' : 'info',
      referencia: venta.id,
    })
  })
}

function buildPagoEvents(pagos: HistorialPago[]): AuditEvent[] {
  return pagos.map((pago) =>
    createAuditEvent({
      id: `pago-${pago.id}`,
      fecha: pago.createdAt ?? pago.fecha,
      fuente: 'pagos',
      actor: pago.creadoPorNombre,
      modulo: 'Pagos',
      accion: 'Pago registrado',
      descripcion: describePago(pago),
      nivel: 'info',
      referencia: pago.id,
    }),
  )
}

function buildLogEvents(logs: SystemLog[]): AuditEvent[] {
  return logs.map((log) =>
    createAuditEvent({
      id: `log-${log.id}`,
      fecha: log.fecha,
      fuente: 'logs',
      actor: log.usuario,
      modulo: log.modulo || 'Sistema',
      accion: log.accion || 'Evento manual',
      descripcion: log.descripcion || 'Sin detalle registrado.',
      nivel: log.nivel,
      referencia: log.id,
    }),
  )
}

function createAuditEvent(
  input: Omit<AuditEvent, 'sortAt' | 'isAnulacion' | 'actor'> & {
    actor?: string
    isAnulacion?: boolean
  },
): AuditEvent {
  return {
    ...input,
    actor: normalizeActor(input.actor),
    sortAt: parseAuditDate(input.fecha),
    isAnulacion: input.isAnulacion ?? false,
  }
}

function normalizeActor(actor?: string): string {
  const trimmed = actor?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : NO_ACTOR_LABEL
}

function describeProduccionRegular(item: ProduccionDiaria): string {
  const acciones = [
    item.cantidadPicar > 0 ? `Picar ${item.cantidadPicar}` : null,
    item.cantidadEscuadrar > 0 ? `Escuadrar ${item.cantidadEscuadrar}` : null,
    item.cantidadDevastar > 0 ? `Devastar ${item.cantidadDevastar}` : null,
    item.cantidadResinar > 0 ? `Resinar ${item.cantidadResinar}` : null,
    item.cantidadPulir > 0 ? `Pulir ${item.cantidadPulir}` : null,
  ].filter(Boolean)

  return [
    item.origenNombre,
    `${item.tipo} ${item.dimension}`,
    `${item.totalLosas} losas`,
    `${formatSquareMeters(item.totalM2)} m2`,
    acciones.length > 0 ? acciones.join(' · ') : 'Sin acciones detalladas',
  ].join(' · ')
}

function describeMonoHiloRegistro(item: ProduccionDiaria): string {
  const detalle = item.monoHiloDetalle
  const masas = detalle?.masas ?? []
  const participantes = detalle?.trabajadores ?? []

  return [
    `Bloque ${item.origenNombre}`,
    `${masas.length} masas`,
    detalle?.equipoNombre ? `Equipo ${detalle.equipoNombre}` : null,
    participantes.length > 0 ? `${participantes.length} obreros` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeMonoHiloAnulacion(item: ProduccionDiaria): string {
  const masas = item.monoHiloDetalle?.masas ?? []
  return [
    `Bloque ${item.origenNombre}`,
    `${masas.length} masas afectadas`,
    item.anulacionMotivo ? `Motivo: ${item.anulacionMotivo}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeMasaRegistrada(masa: MonoHiloMasa): string {
  return [
    `Bloque ${masa.bloqueCodigo}`,
    `${masa.codigo} (${formatMasaMedidas(masa)})`,
    `Ubicacion ${masa.ubicacion}`,
  ].join(' · ')
}

function describeMasaAnulada(masa: MonoHiloMasa): string {
  return [
    `Bloque ${masa.bloqueCodigo}`,
    `${masa.codigo} (${formatMasaMedidas(masa)})`,
    masa.produccionId ? `Registro ${masa.produccionId}` : null,
    masa.anulacionMotivo ? `Motivo: ${masa.anulacionMotivo}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeTallerDecision(item: ProduccionDiaria): string {
  const approved = item.aprobacionTallerEstado === 'aprobado'
  return [
    item.origenNombre,
    `${item.totalLosas} losas`,
    approved ? 'Aprobado por taller' : 'Rechazado por taller',
    !approved && item.aprobacionTallerMotivoRechazo
      ? `Motivo: ${item.aprobacionTallerMotivoRechazo}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeAlmacenDecision(item: ProduccionDiaria): string {
  return [
    item.origenNombre,
    `${item.totalLosas} losas`,
    item.aprobacionAlmacenMotivo ? `Motivo: ${item.aprobacionAlmacenMotivo}` : null,
    item.movimientoInventarioIds?.length
      ? `${item.movimientoInventarioIds.length} movimientos aplicados`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeInventarioRequestAction(movimiento: InventarioMovimiento): string {
  const actionPrefix = movimiento.tipo === 'entrada' ? 'Solicitud de entrada' : 'Solicitud de salida'
  return `${actionPrefix} por ${formatOriginLabel(movimiento.origen)}`
}

function describeInventarioRequest(movimiento: InventarioMovimiento): string {
  const { totalLosas, totalM2, productos } = summarizeInventarioDetalles(movimiento)
  return [
    `${productos} partidas`,
    `${totalLosas} losas`,
    `${formatSquareMeters(totalM2)} m2`,
    `Origen ${formatOriginLabel(movimiento.origen)}`,
    movimiento.motivo ? `Motivo: ${movimiento.motivo}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeInventarioResolution(movimiento: InventarioMovimiento): string {
  const { totalLosas, totalM2 } = summarizeInventarioDetalles(movimiento)
  return [
    `${totalLosas} losas`,
    `${formatSquareMeters(totalM2)} m2`,
    movimiento.estado === 'aprobado' ? 'Movimiento aprobado' : 'Movimiento rechazado',
    movimiento.motivoRechazo ? `Motivo: ${movimiento.motivoRechazo}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describeVenta(venta: Venta): string {
  const detalles = venta.detallesProductos ?? []
  const origenes = Array.from(new Set(detalles.map((item) => item.origenNombre))).slice(0, 3)
  return [
    `Cliente ${venta.clienteNombre}`,
    `${formatSquareMeters(venta.cantidadM2)} m2`,
    `Total ${formatMoney(venta.total)}`,
    origenes.length > 0 ? `Origenes: ${origenes.join(', ')}` : null,
    `Estado ${formatVentaEstado(venta.estado)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function describePago(pago: HistorialPago): string {
  const origenPago = pago.produccionIds.length > 0 ? `${pago.produccionIds.length} producciones` : 'Salario fijo'
  const totalBonos = pago.montoBonos + pago.bonoExtra
  return [
    pago.trabajadorNombre,
    origenPago,
    `Total ${formatMoney(pago.totalPagado)}`,
    `Acciones ${formatMoney(pago.montoAcciones)}`,
    totalBonos > 0 ? `Bonos ${formatMoney(totalBonos)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function summarizeInventarioDetalles(movimiento: InventarioMovimiento): {
  totalLosas: number
  totalM2: number
  productos: number
} {
  return movimiento.detalles.reduce(
    (summary, detalle) => ({
      totalLosas: summary.totalLosas + detalle.cantidadLosas,
      totalM2: summary.totalM2 + detalle.metrosCuadrados,
      productos: summary.productos + 1,
    }),
    { totalLosas: 0, totalM2: 0, productos: 0 },
  )
}

function formatOriginLabel(origen: InventarioMovimiento['origen']): string {
  const labels: Record<InventarioMovimiento['origen'], string> = {
    produccion: 'produccion',
    venta: 'venta',
    merma: 'merma',
    proceso: 'proceso',
    ajuste: 'ajuste',
  }

  return labels[origen]
}

function formatVentaEstado(estado: Venta['estado']): string {
  const labels: Record<Venta['estado'], string> = {
    pendiente: 'pendiente',
    completada: 'completada',
    cancelada: 'cancelada',
    pendiente_aprobacion_almacen: 'pendiente de almacen',
  }

  return labels[estado]
}

function formatMoney(value: number): string {
  return NUMBER_FORMATTER.format(value)
}

function formatSquareMeters(value: number): string {
  return NUMBER_FORMATTER.format(value)
}

function formatMasaMedidas(masa: MonoHiloMasa): string {
  return `${masa.largoCm}x${masa.anchoCm}x${masa.profundidadCm} cm`
}

function formatAuditDate(value: string): string {
  if (!value) return 'Sin fecha'
  if (DATE_ONLY_PATTERN.test(value)) {
    return DATE_FORMATTER.format(parseLocalDate(value))
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return value
  return DATE_TIME_FORMATTER.format(parsedDate)
}

function parseAuditDate(value: string): number {
  if (!value) return 0
  if (DATE_ONLY_PATTERN.test(value)) {
    return parseLocalDate(value).getTime()
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map((segment) => Number(segment))
  return new Date(year, month - 1, day)
}
