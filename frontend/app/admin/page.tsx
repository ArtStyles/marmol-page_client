'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/admin/admin-button'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import {
  getBloques,
  getEquipos,
  getMermas,
  getProduccion,
  getProduccionTrabajadores,
  getProductos,
  getTrabajadores,
  getVentas,
} from '@/lib/resources-api'
import { ADMIN_STORAGE_KEY, type AdminUser } from '@/lib/admin-auth'
import { extractWorkshopIdFromAdminPath, routeWithWorkshop } from '@/lib/admin-routes'
import { WORKSHOP_STORAGE_KEY } from '@/lib/workshops'
import type {
  BloqueOLote,
  Equipo,
  Merma,
  ProduccionDiaria,
  ProduccionTrabajador,
  Producto,
  Trabajador,
  Venta,
} from '@/lib/types'
import {
  ArrowUpRight,
  Boxes,
  DollarSign,
  Factory,
  Package,
} from 'lucide-react'

export default function AdminDashboard() {
  const pathname = usePathname()
  const workshopIdFromPath = useMemo(() => extractWorkshopIdFromAdminPath(pathname), [pathname])
  const adminPath = useMemo(
    () => (path: string) => routeWithWorkshop(path, workshopIdFromPath),
    [workshopIdFromPath],
  )

  const [sessionUser, setSessionUser] = useState<AdminUser | null>(null)
  const [bloquesYLotes, setBloquesYLotes] = useState<BloqueOLote[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [mermas, setMermas] = useState<Merma[]>([])
  const [produccionDiaria, setProduccionDiaria] = useState<ProduccionDiaria[]>([])
  const [produccionTrabajadores, setProduccionTrabajadores] = useState<ProduccionTrabajador[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const totalLosasInventario = productos.reduce((sum, p) => sum + p.cantidadLosas, 0)
  const totalM2Inventario = productos.reduce((sum, p) => sum + p.metrosCuadrados, 0)

  const ventasCompletadas = ventas.filter((v) => v.estado === 'completada')
  const ventasPendientes = ventas.filter((v) => v.estado === 'pendiente').length
  const totalVentas = ventasCompletadas.reduce((sum, v) => sum + v.total, 0)

  const activeWorkers = trabajadores.filter((w) => w.estado === 'activo').length
  const activeEquipos = equipos.filter((equipo) => equipo.estado === 'activo').length
  const totalMermas = mermas.reduce((sum, m) => sum + m.metrosCuadrados, 0)
  const bloquesActivos = bloquesYLotes.filter((b) => b.estado === 'activo').length

  const produccionPorFecha = produccionDiaria.reduce<Record<string, number>>((acc, registro) => {
    acc[registro.fecha] = (acc[registro.fecha] ?? 0) + registro.totalM2
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(produccionPorFecha).sort()
  const fechaUltima = fechasOrdenadas[fechasOrdenadas.length - 1] ?? '2026-01-28'
  const produccionHoy = produccionDiaria.filter((p) => p.fecha === fechaUltima)
  const totalM2Hoy = produccionHoy.reduce((sum, p) => sum + p.totalM2, 0)

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return
    try {
      setSessionUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoadingData(true)
      setDataError(null)
      try {
        const [
          bloquesData,
          equiposData,
          mermasData,
          produccionData,
          produccionTrabajadoresData,
          productosData,
          trabajadoresData,
          ventasData,
        ] = await Promise.all([
          getBloques(),
          getEquipos(),
          getMermas(),
          getProduccion(),
          getProduccionTrabajadores(),
          getProductos(),
          getTrabajadores(),
          getVentas(),
        ])

        if (!alive) return
        setBloquesYLotes(bloquesData)
        setEquipos(equiposData)
        setMermas(mermasData)
        setProduccionDiaria(produccionData)
        setProduccionTrabajadores(produccionTrabajadoresData)
        setProductos(productosData)
        setTrabajadores(trabajadoresData)
        setVentas(ventasData)
      } catch (error) {
        if (!alive) return
        setDataError(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.')
      } finally {
        if (alive) setLoadingData(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const moduleCards = [
    {
      href: adminPath('/admin/produccion'),
      title: 'Produccion diaria',
      description: `${produccionHoy.length} registros activos`,
      value: `${totalM2Hoy.toFixed(1)} m2`,
      footer: `Datos ${fechaUltima}`,
      accent: 'linear-gradient(135deg, #e7f4ff 0%, #ffffff 65%)',
      icon: Factory,
    },
    {
      href: adminPath('/admin/inventario'),
      title: 'Inventario disponible',
      description: `${totalLosasInventario} losas en stock`,
      value: `${totalM2Inventario.toFixed(1)} m2`,
      footer: `${productos.length} referencias`,
      accent: 'linear-gradient(135deg, #eef7f1 0%, #ffffff 65%)',
      icon: Package,
    },
    {
      href: adminPath('/admin/ventas'),
      title: 'Ventas del mes',
      description: `${ventasCompletadas.length} completadas`,
      value: `$${totalVentas.toLocaleString()}`,
      footer: `${ventasPendientes} pendientes`,
      accent: 'linear-gradient(135deg, #fef2e4 0%, #ffffff 65%)',
      icon: DollarSign,
    },
    {
      href: adminPath('/admin/bloques'),
      title: 'Materia prima',
      description: `${bloquesActivos} activos`,
      value: `${bloquesYLotes.length} totales`,
      footer: 'Control de origen',
      accent: 'linear-gradient(135deg, #f1f5f9 0%, #ffffff 65%)',
      icon: Boxes,
    },
  ]

  const mermaStyle = {
    '--merma': mermaRatio,
    '--merma-color': '#f59e0b',
    backgroundImage:
      'conic-gradient(var(--merma-color) calc(var(--merma) * 360deg), rgba(15, 23, 42, 0.08) 0)',
  } as CSSProperties

  const handleGoToWorkshopSelector = () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(WORKSHOP_STORAGE_KEY)
    window.location.assign('/admin')
  }

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen rapido" meta={fechaUltima}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Ventas del mes</span>
            <span className="font-semibold">${totalVentas.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Produccion hoy</span>
            <span className="font-semibold">{totalM2Hoy.toFixed(1)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Mermas totales</span>
            <span className="font-semibold">{totalMermas.toFixed(2)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Equipos activos</span>
            <span className="font-semibold">{activeEquipos}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Actividad reciente" meta="Ultimos dias">
        <div className="space-y-3">
          {produccionReciente.length === 0 ? (
            <p className="text-xs text-slate-500">Sin actividad de produccion.</p>
          ) : (
            produccionReciente.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{item.origenNombre}</p>
                  <Badge variant="secondary">{item.dimension}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{item.fecha}</span>
                  <span>{item.totalLosas} losas / {item.totalM2.toFixed(2)} m2</span>
                </div>
              </div>
            ))
          )}

          <div className="border-t border-white/60 pt-3">
            <p className="text-xs font-semibold text-slate-500">Ventas recientes</p>
            <div className="mt-2 space-y-2">
              {ventasRecientes.length === 0 ? (
                <p className="text-xs text-slate-500">Sin ventas registradas.</p>
              ) : (
                ventasRecientes.map((venta) => (
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
                ))
              )}
            </div>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Merma vs inventario">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 rounded-full p-1" style={mermaStyle}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white/80 text-sm font-semibold text-slate-700">
              {Math.round(mermaRatio * 100)}%
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{totalMermas.toFixed(2)} m2</p>
            <p className="text-xs text-slate-500">perdidos este mes</p>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
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
              {dataError ? <p className="mt-2 text-sm text-destructive">{dataError}</p> : null}
              {loadingData ? <p className="mt-2 text-sm text-slate-500">Cargando dashboard...</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {sessionUser?.role === 'Super Admin' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 bg-white/85 text-slate-700 hover:bg-white"
                  onClick={handleGoToWorkshopSelector}
                >
                  Ver talleres
                </Button>
              ) : null}
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
                <p className="mt-2 text-2xl font-semibold text-slate-900">{totalLosasInventario} losas</p>
                <p className="text-xs text-slate-500">{totalM2Inventario.toFixed(1)} m2 disponibles</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ventas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">${totalVentas.toLocaleString()}</p>
                <p className="text-xs text-slate-500">{ventasCompletadas.length} completadas</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Produccion</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{totalM2Hoy.toFixed(1)} m2</p>
                <p className="text-xs text-slate-500">{produccionHoy.length} registros</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Produccion semanal</p>
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
      </div>
    </AdminShell>
  )
}
