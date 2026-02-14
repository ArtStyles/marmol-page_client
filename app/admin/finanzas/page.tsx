'use client'

import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { bloquesYLotes, mermas, produccionDiaria, produccionTrabajadores, trabajadores, ventas } from '@/lib/data'
import type { RolConSalarioFijo } from '@/lib/types'
import { ArrowUpRight, DollarSign, TrendingUp, Wallet } from 'lucide-react'

export default function FinanzasPage() {
  const { config } = useConfiguracion()

  const ventasCompletadas = ventas.filter((venta) => venta.estado === 'completada')
  const totalSubtotal = ventasCompletadas.reduce((sum, venta) => sum + venta.subtotal, 0)
  const totalDescuentos = ventasCompletadas.reduce(
    (sum, venta) => sum + venta.subtotal * (venta.descuento / 100),
    0,
  )
  const ingresosOperativos = totalSubtotal - totalDescuentos
  const ingresosTotales = ventasCompletadas.reduce((sum, venta) => sum + venta.total, 0)
  const totalMetrosVendidos = ventasCompletadas.reduce((sum, venta) => sum + venta.cantidadM2, 0)

  const PORC_RESERVA_FIJOS_MANTENIMIENTO = 0.11
  const PORC_GASTO_TRANSPORTE = 0.04
  const PORC_GASTO_CORRIENTE = 0.06
  const PORC_GASTO_AGUA = 0.02
  const PORC_GASTO_OTROS = 0.03
  const PORC_REINVERSION = 0.4
  const PORC_PAGO_DIRECTIVOS = 0.6

  const totalCostoBloques = bloquesYLotes.reduce((sum, bloque) => sum + bloque.costo, 0)
  const totalMetrosComprados = bloquesYLotes.reduce((sum, bloque) => sum + bloque.metrosComprados, 0)
  const costoMaterialM2 = totalMetrosComprados ? totalCostoBloques / totalMetrosComprados : 0
  const costoBloque = totalMetrosVendidos * costoMaterialM2

  const trabajadoresPorId = new Map(trabajadores.map((trabajador) => [trabajador.id, trabajador]))
  const produccionObreros = produccionTrabajadores.filter((registro) => {
    const rol = trabajadoresPorId.get(registro.trabajadorId)?.rol
    return rol === 'Obrero'
  })

  const manoObraObreros = produccionObreros.reduce((sum, registro) => sum + registro.pagoFinal, 0)
  const manoObraPagada = produccionObreros
    .filter((registro) => registro.pagado)
    .reduce((sum, registro) => sum + registro.pagoFinal, 0)
  const manoObraPendiente = manoObraObreros - manoObraPagada
  const bonosObreros = produccionObreros.reduce((sum, registro) => sum + registro.bono, 0)

  const trabajadoresFijosActivos = trabajadores.filter(
    (trabajador) => trabajador.estado === 'activo' && trabajador.rol !== 'Obrero',
  )
  const referenciaSalariosFijos = trabajadoresFijosActivos.reduce((sum, trabajador) => {
    const rol = trabajador.rol as RolConSalarioFijo
    return sum + (config.salariosFijosPorRol[rol] ?? 0)
  }, 0)

  const reservaFijosMantenimiento = ingresosOperativos * PORC_RESERVA_FIJOS_MANTENIMIENTO
  const baseDespuesReserva = ingresosOperativos - reservaFijosMantenimiento

  const gastoTransporte = ingresosOperativos * PORC_GASTO_TRANSPORTE
  const gastoCorriente = ingresosOperativos * PORC_GASTO_CORRIENTE
  const gastoAgua = ingresosOperativos * PORC_GASTO_AGUA
  const gastoOtros = ingresosOperativos * PORC_GASTO_OTROS

  const utilidadAntesServicios = baseDespuesReserva - manoObraObreros - costoBloque
  const gastosServicios = gastoTransporte + gastoCorriente + gastoAgua + gastoOtros
  const gananciaNeta = utilidadAntesServicios - gastosServicios

  const reinversion = gananciaNeta > 0 ? gananciaNeta * PORC_REINVERSION : 0
  const pagoDirectivos = gananciaNeta > 0 ? gananciaNeta * PORC_PAGO_DIRECTIVOS : 0
  const margenOperativo = ingresosOperativos ? utilidadAntesServicios / ingresosOperativos : 0
  const margenNeto = ingresosOperativos ? gananciaNeta / ingresosOperativos : 0
  const ticketPromedio = ventasCompletadas.length ? ingresosOperativos / ventasCompletadas.length : 0
  const ingresoPorM2 = totalMetrosVendidos ? ingresosOperativos / totalMetrosVendidos : 0

  const totalMermas = mermas.reduce((sum, merma) => sum + merma.metrosCuadrados, 0)
  const costoMerma = totalMermas * costoMaterialM2
  const mermaRatio = totalMetrosComprados ? totalMermas / totalMetrosComprados : 0

  const produccionTotalM2 = produccionDiaria.reduce((sum, registro) => sum + registro.totalM2, 0)
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
      label: 'Reserva fijos + mantenimiento (11%)',
      value: reservaFijosMantenimiento,
      helper: `${formatPercent(PORC_RESERVA_FIJOS_MANTENIMIENTO)} del ingreso operativo`,
      gradient: 'from-violet-400 to-violet-500',
    },
    {
      label: 'Mano de obra (obreros)',
      value: manoObraObreros,
      helper: `${formatMoney(manoObraPendiente)} pendiente de pago`,
      gradient: 'from-emerald-400 to-emerald-500',
    },
    {
      label: 'Costo del bloque',
      value: costoBloque,
      helper: `Costo prom. ${formatMoney(costoMaterialM2)} por m2`,
      gradient: 'from-amber-400 to-amber-500',
    },
    {
      label: 'Transporte',
      value: gastoTransporte,
      helper: `${formatPercent(PORC_GASTO_TRANSPORTE)} del ingreso operativo`,
      gradient: 'from-sky-400 to-sky-500',
    },
    {
      label: 'Corriente',
      value: gastoCorriente,
      helper: `${formatPercent(PORC_GASTO_CORRIENTE)} del ingreso operativo`,
      gradient: 'from-indigo-400 to-indigo-500',
    },
    {
      label: 'Agua',
      value: gastoAgua,
      helper: `${formatPercent(PORC_GASTO_AGUA)} del ingreso operativo`,
      gradient: 'from-cyan-400 to-cyan-500',
    },
    {
      label: 'Otros',
      value: gastoOtros,
      helper: `${formatPercent(PORC_GASTO_OTROS)} del ingreso operativo`,
      gradient: 'from-slate-500 to-slate-600',
    },
    {
      label: 'Reinversion (40%)',
      value: reinversion,
      helper: 'Capital para aumentar inversion',
      gradient: 'from-cyan-500 to-cyan-600',
    },
    {
      label: 'Pago directivos (60%)',
      value: pagoDirectivos,
      helper: 'Distribucion para duenos del negocio',
      gradient: 'from-slate-700 to-slate-900',
    },
  ]

  const alertas = [
    gananciaNeta < 0 ? 'Ganancia neta negativa. Revisar costos operativos.' : null,
    manoObraObreros && manoObraPendiente / manoObraObreros > 0.35
      ? 'Pago pendiente de obreros alto. Priorizar liquidacion de mano de obra.'
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
            <span>Reserva 11% (fijos + mantenimiento)</span>
            <span className="font-semibold">{formatMoney(reservaFijosMantenimiento)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Mano de obra obreros</span>
            <span className="font-semibold">{formatMoney(manoObraObreros)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Costo del bloque</span>
            <span className="font-semibold">{formatMoney(costoBloque)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Servicios (T+C+A+O)</span>
            <span className="font-semibold">{formatMoney(gastosServicios)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ganancia neta</span>
            <span className="font-semibold">{formatMoney(gananciaNeta)}</span>
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
                Modelo 11% + descuentos operativos
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                El 11% se reserva para trabajadores fijos y mantenimiento. Luego se descuenta mano
                de obra de obreros, costo del bloque, transporte, corriente, agua y otros.
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
            <p className="text-xs text-slate-500">{ventasCompletadas.length} ventas completadas</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Reserva 11%</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(reservaFijosMantenimiento)}
            </p>
            <p className="text-xs text-slate-500">Fijos + mantenimiento</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Base despues de reserva</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(baseDespuesReserva)}</p>
            <p className="text-xs text-slate-500">
              Referencia salarios fijos activos {formatMoney(referenciaSalariosFijos)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ganancia neta</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <p
              className={`mt-3 text-2xl font-semibold ${
                gananciaNeta >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatMoney(gananciaNeta)}
            </p>
            <p className="text-xs text-slate-500">Margen neto {formatPercent(margenNeto)}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Mano de obra obreros</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(manoObraObreros)}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Pagada {formatMoney(manoObraPagada)}</span>
              <span>Pendiente {formatMoney(manoObraPendiente)}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200/70">
              <div
                className="h-2 rounded-full bg-emerald-500/80"
                style={{ width: `${manoObraObreros ? (manoObraPagada / manoObraObreros) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Bonos obreros {formatMoney(bonosObreros)}</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Costo del bloque</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(costoBloque)}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{totalMetrosComprados.toFixed(1)} m2 comprados</span>
              <span>{totalMetrosVendidos.toFixed(1)} m2 vendidos</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Merma estimada {formatMoney(costoMerma)} ({formatPercent(mermaRatio)})
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Transporte</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(gastoTransporte)}</p>
            <p className="text-xs text-slate-500">
              {formatPercent(PORC_GASTO_TRANSPORTE)} del ingreso operativo
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Corriente</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(gastoCorriente)}</p>
            <p className="text-xs text-slate-500">
              {formatPercent(PORC_GASTO_CORRIENTE)} del ingreso operativo
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Agua</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(gastoAgua)}</p>
            <p className="text-xs text-slate-500">
              {formatPercent(PORC_GASTO_AGUA)} del ingreso operativo
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Otros</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(gastoOtros)}</p>
            <p className="text-xs text-slate-500">
              {formatPercent(PORC_GASTO_OTROS)} del ingreso operativo
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-200/70 bg-cyan-50/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-700">Reinversion</p>
            <p className="mt-3 text-2xl font-semibold text-cyan-900">{formatMoney(reinversion)}</p>
            <p className="text-xs text-cyan-700">40% de la ganancia neta para aumentar inversion</p>
          </div>

          <div className="rounded-2xl border border-slate-300/70 bg-slate-100/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600">Pago directivos y duenos</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(pagoDirectivos)}</p>
            <p className="text-xs text-slate-600">60% de la ganancia neta para distribucion de socios</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Distribucion financiera
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
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Tendencia de ventas</p>
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
                <span className="font-semibold text-slate-900">{formatPercent(ratioVentaProduccion)}</span>
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
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Mano de obra por m2</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(produccionTotalM2 ? manoObraObreros / produccionTotalM2 : 0)}
            </p>
            <p className="text-xs text-slate-500">{produccionTotalM2.toFixed(1)} m2 producidos en el periodo</p>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
