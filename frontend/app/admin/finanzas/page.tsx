'use client'

import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { useFinancialSummary } from '@/hooks/use-financial-summary'
import { ArrowUpRight, DollarSign, TrendingUp, Wallet } from 'lucide-react'

const formatMoney = (value: number) => {
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(value))
  return `${sign}$${absolute.toLocaleString()}`
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

export default function FinanzasPage() {
  const { summary, loading, error } = useFinancialSummary({ scope: 'finanzas' })

  const distribucionFinanciera = summary
    ? [
        {
          label: 'Reserva fijos + mantenimiento (11%)',
          value: summary.rentabilidad.reservaFijosMantenimiento,
          helper: 'Reserva del ingreso operativo para estructura fija.',
          gradient: 'from-violet-400 to-violet-500',
        },
        {
          label: 'Mano de obra (obreros)',
          value: summary.rentabilidad.manoObraObreros,
          helper: `${formatMoney(summary.rentabilidad.manoObraPendiente)} pendiente de pago`,
          gradient: 'from-emerald-400 to-emerald-500',
        },
        {
          label: 'Costo del bloque asignado',
          value: summary.materiales.costoBloqueAsignado,
          helper: `Costo prom. ${formatMoney(summary.materiales.costoMaterialM2)} por m2`,
          gradient: 'from-amber-400 to-amber-500',
        },
        {
          label: 'Transporte materia prima',
          value: summary.materiales.transporteMateriaPrima,
          helper: 'Derivado del modulo de bloques.',
          gradient: 'from-sky-400 to-sky-500',
        },
        {
          label: 'Corriente',
          value: summary.rentabilidad.gastoCorriente,
          helper: '6% del ingreso operativo.',
          gradient: 'from-indigo-400 to-indigo-500',
        },
        {
          label: 'Agua',
          value: summary.rentabilidad.gastoAgua,
          helper: '2% del ingreso operativo.',
          gradient: 'from-cyan-400 to-cyan-500',
        },
        {
          label: 'Otros',
          value: summary.rentabilidad.gastoOtros,
          helper: '3% del ingreso operativo.',
          gradient: 'from-slate-500 to-slate-600',
        },
        {
          label: 'Gasto manual registrado',
          value: summary.rentabilidad.gastoManualRegistrado,
          helper: `${summary.gastos.cantidadActivos} movimientos activos en ledger`,
          gradient: 'from-rose-400 to-rose-500',
        },
        {
          label: 'Reinversion (40%)',
          value: summary.rentabilidad.reinversion,
          helper: 'Capital reservado para crecer operacion.',
          gradient: 'from-cyan-500 to-cyan-600',
        },
        {
          label: 'Pago directivos (60%)',
          value: summary.rentabilidad.pagoDirectivos,
          helper: 'Distribucion despues de ganancia neta positiva.',
          gradient: 'from-slate-700 to-slate-900',
        },
      ]
    : []

  const maxVenta = summary?.ventasRecientes.length
    ? Math.max(...summary.ventasRecientes.map((item) => item.total), 1)
    : 1

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen financiero" meta={summary?.fechas.ultimaVenta ?? 'Sin datos'}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Ingresos operativos</span>
            <span className="font-semibold">{formatMoney(summary?.operacion.ingresosOperativos ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Reserva 11%</span>
            <span className="font-semibold">{formatMoney(summary?.rentabilidad.reservaFijosMantenimiento ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Mano de obra obreros</span>
            <span className="font-semibold">{formatMoney(summary?.rentabilidad.manoObraObreros ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Costo del bloque asignado</span>
            <span className="font-semibold">{formatMoney(summary?.materiales.costoBloqueAsignado ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Servicios + gasto manual</span>
            <span className="font-semibold">{formatMoney(summary?.rentabilidad.gastosServicios ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ganancia neta</span>
            <span className="font-semibold">{formatMoney(summary?.rentabilidad.gananciaNeta ?? 0)}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Indicadores clave" meta="Rentabilidad">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Margen operativo</span>
            <span className="font-semibold">{formatPercent(summary?.rentabilidad.margenOperativo ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ticket promedio</span>
            <span className="font-semibold">{formatMoney(summary?.rentabilidad.ticketPromedio ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ingreso por m2</span>
            <span className="font-semibold">{formatMoney(summary?.rentabilidad.ingresoPorM2 ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Merma</span>
            <span className="font-semibold">{formatPercent(summary?.operacion.mermaRatio ?? 0)}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Alertas" meta="Control">
        <div className="space-y-2 text-sm text-slate-700">
          {summary?.alertas.length ? (
            summary.alertas.map((alerta) => (
              <div key={alerta} className="rounded-xl bg-white/70 px-3 py-2 text-xs">
                {alerta}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">Sin alertas en el periodo.</p>
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="rounded-[var(--agent-radius-panel-lg)] border border-white/60 bg-white/70 p-6 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Balance financiero</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Modelo 11% + descuentos operativos
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                El backend consolida inventario, produccion, ventas, pagos y ledger de gastos para evitar
                doble conteo entre materia prima, transporte, nomina y gastos manuales.
              </p>
              {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
              {loading ? <p className="mt-2 text-sm text-slate-500">Cargando indicadores financieros...</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">Auto-calculado</span>
              <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">Sin doble conteo</span>
              <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                Ledger activo: {summary?.gastos.cantidadActivos ?? 0}
              </span>
              {summary?.fechas.ultimaVenta ? (
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                  Ventas hasta {summary.fechas.ultimaVenta}
                </span>
              ) : null}
              {summary?.fechas.ultimaProduccion ? (
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                  Produccion hasta {summary.fechas.ultimaProduccion}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ingresos totales</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <DollarSign className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.operacion.ingresosTotales ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Ventas operativas cerradas</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Reserva 11%</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.rentabilidad.reservaFijosMantenimiento ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Fijos + mantenimiento</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Base despues de reserva</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.rentabilidad.baseDespuesReserva ?? 0)}
            </p>
            <p className="text-xs text-slate-500">
              Referencia salarios fijos {formatMoney(summary?.nomina.salariosFijosReferencia ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ganancia neta</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p
              className={`mt-3 text-2xl font-semibold ${
                (summary?.rentabilidad.gananciaNeta ?? 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatMoney(summary?.rentabilidad.gananciaNeta ?? 0)}
            </p>
            <p className="text-xs text-slate-500">
              Margen neto {formatPercent(summary?.rentabilidad.margenNeto ?? 0)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Mano de obra obreros</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.rentabilidad.manoObraObreros ?? 0)}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Pagada {formatMoney(summary?.rentabilidad.manoObraPagada ?? 0)}</span>
              <span>Pendiente {formatMoney(summary?.rentabilidad.manoObraPendiente ?? 0)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Costo del bloque</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.materiales.costoBloqueAsignado ?? 0)}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{summary?.materiales.metrosReferenciaCosteo.toFixed(1) ?? '0.0'} m2 referencia</span>
              <span>{summary?.operacion.totalMetrosVendidos.toFixed(1) ?? '0.0'} m2 vendidos</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Merma estimada {formatMoney(summary?.materiales.costoMerma ?? 0)} (
              {formatPercent(summary?.operacion.mermaRatio ?? 0)})
            </p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Transporte</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.materiales.transporteMateriaPrima ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Derivado por bloques/lotes.</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Corriente</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.rentabilidad.gastoCorriente ?? 0)}
            </p>
            <p className="text-xs text-slate-500">6% del ingreso operativo.</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Agua</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.rentabilidad.gastoAgua ?? 0)}
            </p>
            <p className="text-xs text-slate-500">2% del ingreso operativo.</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Gasto manual</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.rentabilidad.gastoManualRegistrado ?? 0)}
            </p>
            <p className="text-xs text-slate-500">
              Ledger manual {formatMoney(summary?.gastos.totalManualActivo ?? 0)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-cyan-200/70 bg-cyan-50/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-700">Reinversion</p>
            <p className="mt-3 text-2xl font-semibold text-cyan-900">
              {formatMoney(summary?.rentabilidad.reinversion ?? 0)}
            </p>
            <p className="text-xs text-cyan-700">40% de la ganancia neta para aumentar inversion.</p>
          </div>

          <div className="rounded-xl border border-slate-300/70 bg-slate-100/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600">Pago directivos y duenos</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.rentabilidad.pagoDirectivos ?? 0)}
            </p>
            <p className="text-xs text-slate-600">60% de la ganancia neta para distribucion de socios.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Distribucion financiera</p>
              <span className="text-xs text-slate-500">
                Base {formatMoney(summary?.operacion.ingresosOperativos ?? 0)}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {distribucionFinanciera.map((item) => {
                const base = summary?.operacion.ingresosOperativos ?? 0
                const percent = base > 0 ? (Math.max(0, item.value) / base) * 100 : 0
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>{item.label}</span>
                      <span className="font-semibold text-slate-900">{formatMoney(item.value)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200/70">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${item.gradient}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">{item.helper}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Tendencia de ventas</p>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
                Ultimos movimientos
              </Badge>
            </div>
            {summary?.ventasRecientes.length ? (
              <div className="mt-4 flex items-end gap-2">
                {summary.ventasRecientes.map((venta) => (
                  <div key={venta.fecha} className="flex flex-col items-center gap-2">
                    <div className="relative h-24 w-8 overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="absolute bottom-0 left-0 w-full rounded-full bg-gradient-to-t from-slate-900/80 to-slate-500/70"
                        style={{ height: `${(venta.total / maxVenta) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{venta.fecha.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Sin ventas completadas.</p>
            )}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                <span>Ticket promedio</span>
                <span className="font-semibold text-slate-900">
                  {formatMoney(summary?.rentabilidad.ticketPromedio ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                <span>Ingreso por m2</span>
                <span className="font-semibold text-slate-900">
                  {formatMoney(summary?.rentabilidad.ingresoPorM2 ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                <span>Conversion produccion</span>
                <span className="font-semibold text-slate-900">
                  {formatPercent(summary?.operacion.ratioVentaProduccion ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Eficiencia de materiales</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatPercent(1 - (summary?.operacion.mermaRatio ?? 0))}
            </p>
            <p className="text-xs text-slate-500">
              {summary?.operacion.totalMermasM2.toFixed(2) ?? '0.00'} m2 perdidos de{' '}
              {summary?.materiales.metrosReferenciaCosteo.toFixed(1) ?? '0.0'} m2 referencia
            </p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Costo promedio m2</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.materiales.costoMaterialM2 ?? 0)}
            </p>
            <p className="text-xs text-slate-500">
              Inventario comprado {formatMoney(summary?.materiales.inventarioComprado ?? 0)}
            </p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Nomina pagada</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.nomina.pagado ?? 0)}
            </p>
            <p className="text-xs text-slate-500">
              Pendiente {formatMoney(summary?.nomina.pendiente ?? 0)} | Bonos {formatMoney(summary?.nomina.bonos ?? 0)}
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
