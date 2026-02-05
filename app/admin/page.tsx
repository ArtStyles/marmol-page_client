import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Badge } from '@/components/ui/badge'
import { productos, ventas, trabajadores, produccionDiaria, mermas, bloquesYLotes } from '@/lib/data'
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  DollarSign,
  Factory,
  Package,
  Users,
} from 'lucide-react'
import { losasAMetros } from '@/lib/types'

export default function AdminDashboard() {
  const totalLosasInventario = productos.reduce((sum, p) => sum + p.cantidadLosas, 0)
  const totalM2Inventario = productos.reduce((sum, p) => sum + p.metrosCuadrados, 0)

  const ventasCompletadas = ventas.filter((v) => v.estado === 'completada')
  const ventasPendientes = ventas.filter((v) => v.estado === 'pendiente').length
  const totalVentas = ventasCompletadas.reduce((sum, v) => sum + v.total, 0)

  const activeWorkers = trabajadores.filter((w) => w.estado === 'activo').length
  const totalMermas = mermas.reduce((sum, m) => sum + m.metrosCuadrados, 0)
  const bloquesActivos = bloquesYLotes.filter((b) => b.estado === 'activo').length

  const produccionPorFecha = produccionDiaria.reduce<Record<string, number>>((acc, registro) => {
    acc[registro.fecha] = (acc[registro.fecha] ?? 0) + losasAMetros(registro.cantidadLosas, registro.dimension)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(produccionPorFecha).sort()
  const fechaUltima = fechasOrdenadas[fechasOrdenadas.length - 1] ?? '2026-01-28'
  const produccionHoy = produccionDiaria.filter((p) => p.fecha === fechaUltima)
  const totalM2Hoy = produccionHoy.reduce(
    (sum, p) => sum + losasAMetros(p.cantidadLosas, p.dimension),
    0,
  )

  const serieProduccion = fechasOrdenadas.slice(-7).map((fecha) => ({
    fecha,
    metros: produccionPorFecha[fecha] ?? 0,
  }))
  const maxSerie = serieProduccion.length
    ? Math.max(...serieProduccion.map((item) => item.metros), 1)
    : 1

  const produccionReciente = [...produccionDiaria]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 4)

  const ventasRecientes = [...ventas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 3)

  const mermaRatio = totalM2Inventario ? Math.min(1, totalMermas / totalM2Inventario) : 0

  const navItems = [
    {
      href: '/admin/inventario',
      label: 'Inventario',
      helper: `${totalLosasInventario} losas`,
      icon: Package,
    },
    {
      href: '/admin/produccion',
      label: 'Produccion',
      helper: `${totalM2Hoy.toFixed(1)} m2 hoy`,
      icon: Factory,
    },
    {
      href: '/admin/ventas',
      label: 'Ventas',
      helper: `$${totalVentas.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      href: '/admin/bloques',
      label: 'Bloques y lotes',
      helper: `${bloquesActivos} activos`,
      icon: Boxes,
    },
    {
      href: '/admin/mermas',
      label: 'Mermas',
      helper: `${totalMermas.toFixed(2)} m2`,
      icon: AlertTriangle,
    },
    {
      href: '/admin/trabajadores',
      label: 'Trabajadores',
      helper: `${activeWorkers} activos`,
      icon: Users,
    },
    {
      href: '/admin/historial',
      label: 'Historial',
      helper: 'Auditoria y logs',
      icon: ClipboardList,
    },
  ]

  const moduleCards = [
    {
      href: '/admin/produccion',
      title: 'Produccion diaria',
      description: `${produccionHoy.length} registros activos`,
      value: `${totalM2Hoy.toFixed(1)} m2`,
      footer: `Datos ${fechaUltima}`,
      accent: 'linear-gradient(135deg, #e7f4ff 0%, #ffffff 65%)',
      icon: Factory,
    },
    {
      href: '/admin/inventario',
      title: 'Inventario disponible',
      description: `${totalLosasInventario} losas en stock`,
      value: `${totalM2Inventario.toFixed(1)} m2`,
      footer: `${productos.length} referencias`,
      accent: 'linear-gradient(135deg, #eef7f1 0%, #ffffff 65%)',
      icon: Package,
    },
    {
      href: '/admin/ventas',
      title: 'Ventas del mes',
      description: `${ventasCompletadas.length} completadas`,
      value: `$${totalVentas.toLocaleString()}`,
      footer: `${ventasPendientes} pendientes`,
      accent: 'linear-gradient(135deg, #fef2e4 0%, #ffffff 65%)',
      icon: DollarSign,
    },
    {
      href: '/admin/bloques',
      title: 'Bloques y lotes',
      description: `${bloquesActivos} activos`,
      value: `${bloquesYLotes.length} totales`,
      footer: 'Control de origen',
      accent: 'linear-gradient(135deg, #f1f5f9 0%, #ffffff 65%)',
      icon: Boxes,
    },
  ]

  const dashboardStyle = {
    '--dash-bg': 'linear-gradient(135deg, #f6f7fb 0%, #e9eef7 45%, #f7f2eb 100%)',
    '--dash-card': 'rgba(255, 255, 255, 0.78)',
    '--dash-border': 'rgba(15, 23, 42, 0.08)',
    '--dash-shadow': '0 24px 60px -40px rgba(15, 23, 42, 0.25)',
    backgroundImage: 'var(--dash-bg)',
  } as CSSProperties

  const mermaStyle = {
    '--merma': mermaRatio,
    '--merma-color': '#f59e0b',
    backgroundImage:
      'conic-gradient(var(--merma-color) calc(var(--merma) * 360deg), rgba(15, 23, 42, 0.08) 0)',
  } as CSSProperties

  return (
    <div className="relative">
      <div
        className="relative isolate overflow-hidden p-4 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.45)] md:p-6 lg:p-8"
        style={dashboardStyle}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-[#dbe7ff] opacity-70 blur-3xl" />
          <div className="absolute -bottom-24 left-[-40px] h-72 w-72 rounded-full bg-[#f6e7d2] opacity-70 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.5),transparent_50%)]" />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          <aside className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
            <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Navegacion</p>
                <span className="text-[11px] text-slate-500">{fechaUltima}</span>
              </div>
              <div className="mt-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center justify-between rounded-2xl border border-transparent bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_1px_0_rgba(255,255,255,0.7)] transition hover:border-white/70 hover:bg-white/80 hover:text-slate-900"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-slate-600 group-hover:bg-white">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex flex-col">
                          <span>{item.label}</span>
                          <span className="text-xs text-slate-500">{item.helper}</span>
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Indicadores</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700">
                  <span>Ventas pendientes</span>
                  <span className="font-semibold">{ventasPendientes}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700">
                  <span>Bloques activos</span>
                  <span className="font-semibold">{bloquesActivos}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700">
                  <span>Trabajadores activos</span>
                  <span className="font-semibold">{activeWorkers}</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-100">
            <div className="rounded-[28px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-6 shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Dashboard</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                    Panel de control del taller
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Resumen operativo, inventario y seguimiento diario.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                    Semana actual
                  </span>
                  <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1">
                    Datos al {fechaUltima}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Inventario</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {totalLosasInventario} losas
                    </p>
                    <p className="text-xs text-slate-500">{totalM2Inventario.toFixed(1)} m2 disponibles</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ventas</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      ${totalVentas.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{ventasCompletadas.length} completadas</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Produccion</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {totalM2Hoy.toFixed(1)} m2
                    </p>
                    <p className="text-xs text-slate-500">{produccionHoy.length} registros</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                      Produccion semanal
                    </p>
                    <span className="text-xs text-slate-500">{serieProduccion.length} dias</span>
                  </div>
                  {serieProduccion.length ? (
                    <div className="mt-4 flex items-end gap-2">
                      {serieProduccion.map((item) => (
                        <div key={item.fecha} className="flex flex-col items-center gap-2">
                          <div className="relative h-24 w-8 overflow-hidden rounded-full bg-slate-200/70">
                            <div
                              className="absolute bottom-0 left-0 w-full rounded-full bg-gradient-to-t from-slate-900/70 to-slate-600/70"
                              style={{ height: `${(item.metros / maxSerie) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{item.fecha.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-slate-500">Sin datos de produccion.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {moduleCards.map((card) => {
                const Icon = card.icon
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    style={{ backgroundImage: card.accent }}
                    className="group relative overflow-hidden rounded-[24px] border border-white/60 p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_25px_60px_-40px_rgba(15,23,42,0.45)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900">{card.title}</p>
                    <p className="text-xs text-slate-600">{card.description}</p>
                    <div className="mt-4 flex items-baseline justify-between">
                      <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
                      <p className="text-xs text-slate-500">{card.footer}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          <aside className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-200">
            <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Resumen rapido</p>
                <span className="text-[11px] text-slate-500">{fechaUltima}</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>Ventas del mes</span>
                  <span className="font-semibold">${totalVentas.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>Produccion hoy</span>
                  <span className="font-semibold">{totalM2Hoy.toFixed(1)} m2</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>Mermas totales</span>
                  <span className="font-semibold">{totalMermas.toFixed(2)} m2</span>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Actividad reciente</p>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
                  Ultimos dias
                </Badge>
              </div>
              <div className="mt-4 space-y-3">
                {produccionReciente.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">{item.trabajadorNombre}</p>
                      <Badge variant="secondary" className="capitalize">
                        {item.accion}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{item.fecha}</span>
                      <span>
                        {item.cantidadLosas} losas ?{' '}
                        {losasAMetros(item.cantidadLosas, item.dimension).toFixed(2)} m2
                      </span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/60 pt-3">
                  <p className="text-xs font-semibold text-slate-500">Ventas recientes</p>
                  <div className="mt-2 space-y-2">
                    {ventasRecientes.map((venta) => (
                      <div
                        key={venta.id}
                        className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{venta.productoNombre}</p>
                          <p className="text-[11px] text-slate-500">{venta.fecha}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            venta.estado === 'completada'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }
                        >
                          {venta.estado}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Merma vs inventario</p>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="relative h-24 w-24 rounded-full p-1"
                  style={mermaStyle}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white/80 text-sm font-semibold text-slate-700">
                    {Math.round(mermaRatio * 100)}%
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{totalMermas.toFixed(2)} m2</p>
                  <p className="text-xs text-slate-500">perdidos este mes</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
