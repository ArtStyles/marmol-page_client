'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  DollarSign,
  Factory,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/admin/admin-button'
import { Meteors } from '@/components/ui/meteors'
import { cn } from '@/lib/utils'
import { ADMIN_STORAGE_KEY, type AdminUser } from '@/lib/admin-auth'
import {
  bloquesYLotes,
  historialPagos,
  logsSistema,
  mermas,
  produccionDiaria,
  productos,
  trabajadores,
  ventas,
} from '@/lib/data'
import { catalogoItems } from '@/lib/catalogo-data'
import { losasAMetros } from '@/lib/types'

type AdminNavItem = {
  href: string
  label: string
  helper?: string
  icon: LucideIcon
}

type AdminShellProps = {
  children: React.ReactNode
  rightPanel?: React.ReactNode
  navItems?: AdminNavItem[]
}

type AdminPanelCardProps = {
  title: string
  meta?: string
  badge?: React.ReactNode
  className?: string
  children: React.ReactNode
}

const shellStyle = {
  '--dash-bg': 'linear-gradient(135deg, #f6f7fb 0%, #e9eef7 45%, #f7f2eb 100%)',
  '--dash-card': 'rgba(255, 255, 255, 0.78)',
  '--dash-border': 'rgba(15, 23, 42, 0.08)',
  '--dash-shadow': '0 24px 60px -40px rgba(15, 23, 42, 0.25)',
  backgroundImage: 'var(--dash-bg)',
} as CSSProperties

function buildDefaultNav(): AdminNavItem[] {
  const totalLosasInventario = productos.reduce((sum, p) => sum + p.cantidadLosas, 0)
  const ventasCompletadas = ventas.filter((v) => v.estado === 'completada')
  const totalVentas = ventasCompletadas.reduce((sum, v) => sum + v.total, 0)
  const totalMermas = mermas.reduce((sum, m) => sum + m.metrosCuadrados, 0)
  const bloquesActivos = bloquesYLotes.filter((b) => b.estado === 'activo').length
  const activeWorkers = trabajadores.filter((w) => w.estado === 'activo').length
  const produccionPorFecha = produccionDiaria.reduce<Record<string, number>>((acc, registro) => {
    acc[registro.fecha] =
      (acc[registro.fecha] ?? 0) + losasAMetros(registro.cantidadLosas, registro.dimension)
    return acc
  }, {})
  const fechasOrdenadas = Object.keys(produccionPorFecha).sort()
  const fechaUltima = fechasOrdenadas[fechasOrdenadas.length - 1]
  const totalM2Hoy = fechaUltima ? (produccionPorFecha[fechaUltima] ?? 0) : 0

  return [
    {
      href: '/admin',
      label: 'Dashboard',
      helper: 'Resumen',
      icon: LayoutDashboard,
    },
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
      href: '/admin/pagos',
      label: 'Pagos',
      helper: `${historialPagos.length} registros`,
      icon: Wallet,
    },
    {
      href: '/admin/catalogo',
      label: 'Catalogo',
      helper: `${catalogoItems.length} items`,
      icon: LayoutGrid,
    },
    {
      href: '/admin/historial',
      label: 'Historial',
      helper: `${logsSistema.length} logs`,
      icon: ClipboardList,
    },
    {
      href: '/admin/configuracion',
      label: 'Configuracion',
      helper: 'Sistema',
      icon: Settings,
    },
  ]
}

export function AdminPanelCard({ title, meta, badge, className, children }: AdminPanelCardProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{title}</p>
        {badge ?? (meta ? <span className="text-[11px] text-slate-500">{meta}</span> : null)}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function AdminShell({ children, rightPanel, navItems }: AdminShellProps) {
  const pathname = usePathname()
  const items = navItems ?? buildDefaultNav()
  const [sessionUser, setSessionUser] = useState<AdminUser | null>(null)

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

  const handleLogout = () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    window.location.assign('/admin')
  }

  return (
    <div className="admin-shell relative">
      <div
        className="relative isolate min-h-screen p-5 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.45)]"
        style={shellStyle}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-[#dbe7ff] opacity-70 blur-3xl" />
          <div className="absolute -bottom-24 left-[-40px] h-72 w-72 rounded-full bg-[#f6e7d2] opacity-70 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.5),transparent_50%)]" />
        </div>

        <div className="relative grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_260px]">
          <aside className="hidden min-h-0 overflow-hidden lg:block lg:sticky lg:top-8 lg:self-start">
            <div className="scrollbar-hidden space-y-3 py-1 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-3 lg:-mr-3">
              <div className="rounded-[22px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-2 shadow-[var(--dash-shadow)]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Navegacion</p>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
                    Panel
                  </Badge>
                </div>
                <div className="mt-3 space-y-1.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      item.href === '/admin'
                        ? pathname === '/admin'
                        : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group flex items-center justify-between rounded-2xl border px-3 py-1.5 text-sm font-medium transition',
                          isActive
                            ? 'border-slate-900/10 bg-white/90 text-slate-900 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)]'
                            : 'border-transparent bg-white/60 text-slate-700 hover:border-white/70 hover:bg-white/80 hover:text-slate-900',
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-xl',
                              isActive
                                ? 'bg-slate-900 text-white'
                                : 'bg-white/70 text-slate-600 group-hover:bg-white',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex flex-col">
                            <span>{item.label}</span>
                            {item.helper && (
                              <span className="text-xs text-slate-500">{item.helper}</span>
                            )}
                          </span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
              {sessionUser && (
                <AdminPanelCard title="Sesion activa" meta={sessionUser.role}>
                  <div className="space-y-3 text-sm text-slate-700">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{sessionUser.name}</p>
                      <p className="text-xs text-slate-500">{sessionUser.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-white/70"
                      onClick={handleLogout}
                    >
                      Cerrar sesion
                    </Button>
                  </div>
                </AdminPanelCard>
              )}
            </div>
          </aside>

          <section className="space-y-5 pb-24 lg:pb-0">
            {children}
          </section>

          <aside className="min-h-0 overflow-hidden lg:sticky lg:top-8 lg:self-start">
            <div className="scrollbar-hidden space-y-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-3 lg:-mr-3">
              {rightPanel ?? (
                <AdminPanelCard title="Resumen" meta="Panel">
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>Selecciona un modulo para ver su resumen.</p>
                  </div>
                </AdminPanelCard>
              )}
            </div>
          </aside>
        </div>

        <nav className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
          <div className="rounded-[22px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-2 shadow-[var(--dash-shadow)] backdrop-blur-xl">
            <div className="scrollbar-hidden flex items-center gap-2 overflow-x-auto px-1">
              {items.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex min-w-[92px] flex-shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                      isActive
                        ? 'border-slate-900/10 bg-white/90 text-slate-900 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)]'
                        : 'border-transparent bg-white/60 text-slate-600 hover:border-white/80 hover:bg-white/80 hover:text-slate-900',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl',
                        isActive ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-600',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
              {sessionUser && (
                <Button
                  size="sm"
                  variant="outline"
                  className="min-w-[92px] flex-shrink-0 justify-center"
                  onClick={handleLogout}
                >
                  Salir
                </Button>
              )}
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}
