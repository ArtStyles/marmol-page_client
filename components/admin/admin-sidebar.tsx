'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  ArrowLeft,
  Settings,
  Factory,
  AlertTriangle,
  Boxes,
  Wallet,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getAccessForRole, type AdminUser } from '@/lib/admin-auth'

const primaryNavItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Inventario', href: '/admin/inventario', icon: Package },
  { label: 'Ventas', href: '/admin/ventas', icon: ShoppingCart },
  { label: 'Catalogo', href: '/admin/catalogo', icon: LayoutGrid },
]

const secondaryNavItems = [
  { label: 'Produccion diaria', href: '/admin/produccion', icon: Factory },
  { label: 'Mermas', href: '/admin/mermas', icon: AlertTriangle },
  { label: 'Bloques y lotes', href: '/admin/bloques', icon: Boxes },
  { label: 'Trabajadores', href: '/admin/trabajadores', icon: Users },
  { label: 'Pagos', href: '/admin/pagos', icon: Wallet },
  { label: 'Configuracion', href: '/admin/configuracion', icon: Settings },
]

interface AdminSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  user: AdminUser
  onLogout: () => void
}

export function AdminSidebar({ isCollapsed, onToggle, user, onLogout }: AdminSidebarProps) {
  const pathname = usePathname()
  const access = getAccessForRole(user.role)
  const isRouteAllowed = (href: string) =>
    access.routes.some((route) => href === route || href.startsWith(`${route}/`))
  const allowedPrimary = primaryNavItems.filter((item) => isRouteAllowed(item.href))
  const allowedSecondary = secondaryNavItems.filter((item) => isRouteAllowed(item.href))
  const desktopNavItems = [...allowedPrimary, ...allowedSecondary]
  const mobilePrimary = allowedPrimary.length > 0 ? allowedPrimary : allowedSecondary
  const mobileSecondary = allowedPrimary.length > 0 ? allowedSecondary : []
  const isMoreActive = mobileSecondary.some((item) => item.href === pathname)

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-screen border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
          isCollapsed ? 'w-20' : 'w-64',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'font-serif text-lg font-bold text-sidebar-foreground transition-opacity',
                  isCollapsed && 'w-0 overflow-hidden opacity-0',
                )}
              >
                Panel de Administracion
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
              aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {desktopNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className={cn('transition-opacity', isCollapsed && 'w-0 overflow-hidden opacity-0')}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className={cn('space-y-2', isCollapsed && 'hidden')}>
              <p className="text-xs uppercase tracking-[0.2em] text-sidebar-foreground/60">
                Sesion activa
              </p>
              <p className="text-sm font-semibold text-sidebar-foreground">{user.name}</p>
              <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground/70">
                {user.role}
              </Badge>
            </div>
            <div className={cn('mt-4 flex flex-col gap-2', isCollapsed && 'items-center')}>
              <Button
                variant="outline"
                className={cn('w-full justify-start gap-2 bg-transparent', isCollapsed && 'justify-center')}
                title="Volver al Sitio"
                asChild
              >
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  {!isCollapsed && 'Volver al Sitio'}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className={cn('w-full justify-start gap-2', isCollapsed && 'justify-center')}
                onClick={onLogout}
              >
                <span className="text-sm">Cerrar sesion</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          {mobilePrimary.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {mobileSecondary.length > 0 && (
            <details className="group relative flex flex-1 flex-col items-center justify-center">
            <summary
              className={cn(
                'flex cursor-pointer list-none flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                isMoreActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>Mas</span>
            </summary>
            <div className="absolute bottom-16 left-1/2 w-56 -translate-x-1/2 rounded-xl border border-border bg-background p-2 shadow-lg">
              {mobileSecondary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-border" />
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted"
              >
                Cerrar sesion
              </button>
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al sitio
              </Link>
            </div>
          </details>
          )}
        </div>
      </nav>
    </>
  )
}
