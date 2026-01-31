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
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Producción Diaria', href: '/admin/produccion', icon: Factory },
  { label: 'Mermas', href: '/admin/mermas', icon: AlertTriangle },
  { label: 'Bloques y Lotes', href: '/admin/bloques', icon: Boxes },
  { label: 'Inventario', href: '/admin/inventario', icon: Package },
  { label: 'Ventas', href: '/admin/ventas', icon: ShoppingCart },
  { label: 'Trabajadores', href: '/admin/trabajadores', icon: Users },
  { label: 'Pagos', href: '/admin/pagos', icon: Wallet },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
]

interface AdminSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function AdminSidebar({ isCollapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
           
            <span
              className={cn(
                'font-serif text-lg font-bold text-sidebar-foreground transition-opacity',
                isCollapsed && 'opacity-0 w-0 overflow-hidden'
              )}
            >
             Panel de Administración
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

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
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
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className={cn('transition-opacity', isCollapsed && 'opacity-0 w-0 overflow-hidden')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Back to Site */}
        <div className="border-t border-sidebar-border p-4">
          <Link href="/">
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start gap-2 bg-transparent',
                isCollapsed && 'justify-center'
              )}
              title="Volver al Sitio"
            >
              <ArrowLeft className="h-4 w-4" />
              {!isCollapsed && 'Volver al Sitio'}
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  )
}
