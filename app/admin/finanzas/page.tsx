'use client'

import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { bloquesYLotes, mermas, produccionDiaria, ventas } from '@/lib/data'
import { losasAMetros } from '@/lib/types'
import { ArrowUpRight, DollarSign, TrendingUp, Wallet } from 'lucide-react'

export default function FinanzasPage() {
  const ventasCompletadas = ventas.filter((venta) => venta.estado === 'completada')
  const totalSubtotal = ventasCompletadas.reduce((sum, venta) => sum + venta.subtotal, 0)
  const totalDescuentos = ventasCompletadas.reduce(
    (sum, venta) => sum + venta.subtotal * (venta.descuento / 100),
    0,
  )
  const ingresosOperativos = totalSubtotal - totalDescuentos
  const totalFondosOperativos = ventasCompletadas.reduce(
    (sum, venta) => sum + (venta.fondoOperativo ?? 0),
    0,
  )
  const ingresosTotales = ventasCompletadas.reduce((sum, venta) => sum + venta.total, 0)
  const totalMetrosVendidos = ventasCompletadas.reduce((sum, venta) => sum + venta.cantidadM2, 0)

  const totalCostoBloques = bloquesYLotes.reduce((sum, bloque) => sum + bloque.costo, 0)
  const totalMetrosComprados = bloquesYLotes.reduce((sum, bloque) => sum + bloque.metrosComprados, 0)
  const costoMaterialM2 = totalMetrosComprados ? totalCostoBloques / totalMetrosComprados : 0
  const costoMaterialEstimado = totalMetrosVendidos * costoMaterialM2

  const nominaTotal = produccionDiaria.reduce((sum, registro) => sum + registro.pagoFinal, 0)
  const nominaPagada = produccionDiaria
    .filter((registro) => registro.pagado)
    .reduce((sum, registro) => sum + registro.pagoFinal, 0)
  const nominaPendiente = nominaTotal - nominaPagada
  const bonosTotal = produccionDiaria.reduce((sum, registro) => sum + registro.bono, 0)

  const utilidadOperativa = ingresosOperativos - costoMaterialEstimado - nominaTotal
  const utilidadDisponible = utilidadOperativa - totalFondosOperativos
  const margenOperativo = ingresosOperativos ? utilidadOperativa / ingresosOperativos : 0
  const margenNeto = ingresosOperativos ? utilidadDisponible / ingresosOperativos : 0
  const ticketPromedio = ventasCompletadas.length ? ingresosOperativos / ventasCompletadas.length : 0
  const ingresoPorM2 = totalMetrosVendidos ? ingresosOperativos / totalMetrosVendidos : 0

  const totalMermas = mermas.reduce((sum, merma) => sum + merma.metrosCuadrados, 0)
  const costoMerma = totalMermas * costoMaterialM2
  const mermaRatio = totalMetrosComprados ? totalMermas / totalMetrosComprados : 0

  const produccionTotalM2 = produccionDiaria.reduce(
    (sum, registro) => sum + losasAMetros(registro.cantidadLosas, registro.dimension),
    0,
  )
  const ratioVentaProduccion = produccionTotalM2 ? totalMetrosVendidos / produccionTotalM2 : 0

  const serieVentas = [...ventasCompletadas]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-7)
    .map((venta) => ({ fecha: venta.fecha, total: venta.total }))
  const maxVenta = serieVentas.length ? Math.max(...serieVentas.map((item) => item.total), 1) : 1

  const fechaUltimaVenta = [...ventasCompletadas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.fecha
  const fechaUltimaProduccion = [...produccionDiaria]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.fecha

  const formatMoney = (value: number) => {
    const sign = value < 0 ? '-' : ''
    const absolute = Math.abs(Math.round(value))
    return `${sign}$${absolute.toLocaleString()}`
  }

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  const distribucionFinanciera = [
    {
      label: 'Materiales',
      value: costoMaterialEstimado,
      helper: `Costo prom. ${formatMoney(costoMaterialM2)} por m2`,
      gradient: 'from-amber-400 to-amber-500',
    },
    {
      label: 'Nomina',
      value: nominaTotal,
      helper: `${formatMoney(nominaPendiente)} pendiente`,
      gradient: 'from-emerald-400 to-emerald-500',
    },
    {
      label: 'Fondo operativo',
      value: totalFondosOperativos,
      helper: `Reserva ${formatPercent(ingresosOperativos ? totalFondosOperativos / ingresosOperativos : 0)}`,
      gradient: 'from-sky-400 to-sky-500',
    },
    {
      label: 'Utilidad disponible',
      value: utilidadDisponible,
      helper: `Margen ${formatPercent(margenNeto)}`,
      gradient:
        utilidadDisponible >= 0 ? 'from-slate-700 to-slate-900' : 'from-rose-400 to-rose-500',
    },
  ]

  const alertas = [
    margenNeto < 0 ? 'Margen neto negativo. Revisar costos y precios.' : null,
    nominaTotal && nominaPendiente / nominaTotal > 0.35
      ? 'Nomina pendiente alta. Priorizar pagos de personal.'
      : null,
    mermaRatio > 0.05 ? 'Merma elevada. Ajustar procesos de corte y pulido.' : null,
  ].filter(Boolean) as string[]

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen financiero" meta={fechaUltimaVenta ?? 'Sin datos'}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Ingresos operativos</span>
            <span className="font-semibold">{formatMoney(ingresosOperativos)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Utilidad disponible</span>
            <span className="font-semibold">{formatMoney(utilidadDisponible)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Fondo operativo</span>
            <span className="font-semibold">{formatMoney(totalFondosOperativos)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Nomina pendiente</span>
            <span className="font-semibold">{formatMoney(nominaPendiente)}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Indicadores clave" meta="Rentabilidad">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Margen operativo</span>
            <span className="font-semibold">{formatPercent(margenOperativo)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ticket promedio</span>
            <span className="font-semibold">{formatMoney(ticketPromedio)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ingreso por m2</span>
            <span className="font-semibold">{formatMoney(ingresoPorM2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Merma</span>
            <span className="font-semibold">{formatPercent(mermaRatio)}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Alertas" meta="Control">
        <div className="space-y-2 text-sm text-slate-700">
          {alertas.length ? (
            alertas.map((alerta) => (
              <div key={alerta} className="rounded-2xl bg-white/70 px-3 py-2 text-xs">
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
        <div className="rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                Balance financiero
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Ventas, utilidad y fondos operativos
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Seccion dedicada a indicadores financieros, costos y liquidez del taller.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                Auto-calculado
              </span>
              <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                Listo para API
              </span>
              {fechaUltimaVenta && (
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                  Ventas hasta {fechaUltimaVenta}
                </span>
              )}
              {fechaUltimaProduccion && (
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                  Produccion hasta {fechaUltimaProduccion}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ingresos totales</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <DollarSign className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(ingresosTotales)}</p>
            <p className="text-xs text-slate-500">
              {ventasCompletadas.length} ventas completadas
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ingresos operativos</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(ingresosOperativos)}</p>
            <p className="text-xs text-slate-500">
              Descuentos aplicados {formatMoney(totalDescuentos)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Utilidad operativa</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(utilidadOperativa)}</p>
            <p className="text-xs text-slate-500">Margen {formatPercent(margenOperativo)}</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Utilidad disponible</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p
              className={`mt-3 text-2xl font-semibold ${
                utilidadDisponible >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatMoney(utilidadDisponible)}
            </p>
            <p className="text-xs text-slate-500">Margen neto {formatPercent(margenNeto)}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Fondo operativo</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(totalFondosOperativos)}
            </p>
            <p className="text-xs text-slate-500">
              Reservado para materiales ({formatPercent(ingresosOperativos ? totalFondosOperativos / ingresosOperativos : 0)})
            </p>
            <div className="mt-3 h-2 rounded-full bg-slate-200/70">
              <div
                className="h-2 rounded-full bg-sky-500/80"
                style={{
                  width: `${Math.min(100, ingresosOperativos ? (totalFondosOperativos / ingresosOperativos) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Nomina</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(nominaTotal)}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Pagada {formatMoney(nominaPagada)}</span>
              <span>Pendiente {formatMoney(nominaPendiente)}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200/70">
              <div
                className="h-2 rounded-full bg-emerald-500/80"
                style={{ width: `${nominaTotal ? (nominaPagada / nominaTotal) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Bonos acumulados {formatMoney(bonosTotal)}</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Materiales</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(costoMaterialEstimado)}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{totalMetrosComprados.toFixed(1)} m2 comprados</span>
              <span>{totalMetrosVendidos.toFixed(1)} m2 vendidos</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Merma estimada {formatMoney(costoMerma)} ({formatPercent(mermaRatio)})
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Distribucion del ingreso
              </p>
              <span className="text-xs text-slate-500">Base {formatMoney(ingresosOperativos)}</span>
            </div>
            <div className="mt-4 space-y-4">
              {distribucionFinanciera.map((item) => {
                const value = Number.isFinite(item.value) ? item.value : 0
                const percent = ingresosOperativos ? (Math.max(0, value) / ingresosOperativos) * 100 : 0
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>{item.label}</span>
                      <span className="font-semibold text-slate-900">{formatMoney(value)}</span>
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

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Tendencia de ventas
              </p>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
                Ultimos movimientos
              </Badge>
            </div>
            {serieVentas.length ? (
              <div className="mt-4 flex items-end gap-2">
                {serieVentas.map((venta) => (
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
              <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                <span>Ticket promedio</span>
                <span className="font-semibold text-slate-900">{formatMoney(ticketPromedio)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                <span>Ingreso por m2</span>
                <span className="font-semibold text-slate-900">{formatMoney(ingresoPorM2)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                <span>Conversion produccion</span>
                <span className="font-semibold text-slate-900">
                  {formatPercent(ratioVentaProduccion)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Eficiencia de materiales</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatPercent(1 - mermaRatio)}</p>
            <p className="text-xs text-slate-500">
              {totalMermas.toFixed(2)} m2 perdidos de {totalMetrosComprados.toFixed(1)} m2 comprados
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Costo promedio m2</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(costoMaterialM2)}</p>
            <p className="text-xs text-slate-500">
              Inventario total {formatMoney(totalCostoBloques)} en materia prima
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Nomina por m2</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(produccionTotalM2 ? nominaTotal / produccionTotalM2 : 0)}
            </p>
            <p className="text-xs text-slate-500">
              {produccionTotalM2.toFixed(1)} m2 producidos en el periodo
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
