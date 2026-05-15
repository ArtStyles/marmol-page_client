import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  DollarSign,
  Factory,
  FileText,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import type { AdminRole } from '@/lib/admin-auth'
import { isAdminRouteActive, routeWithWorkshop } from '@/lib/admin-routes'
import type { AdminNavItem } from '../model/types'

export const buildDefaultNav = (
  role?: AdminRole,
  workshopId?: string | null,
): AdminNavItem[] => {
  const items: AdminNavItem[] = [
    {
      href: routeWithWorkshop('/admin', workshopId),
      label: 'Dashboard',
      helper: 'Resumen',
      icon: LayoutDashboard,
    },
    {
      href: routeWithWorkshop('/admin/bloques', workshopId),
      label: 'Bloques y lotes',
      helper: 'Mono hilo',
      icon: Boxes,
    },
    {
      href: routeWithWorkshop('/admin/inventario/masas', workshopId),
      label: 'Masas',
      helper: 'Picado',
      icon: Package,
    },
    {
      href: routeWithWorkshop('/admin/inventario/losas', workshopId),
      label: 'Losas',
      helper: 'Stock',
      icon: Package,
    },
    {
      href: routeWithWorkshop('/admin/produccion', workshopId),
      label: 'Producción diaria',
      helper: 'Diaria',
      icon: Factory,
    },
    {
      href: routeWithWorkshop('/admin/mermas', workshopId),
      label: 'Mermas',
      helper: 'Control',
      icon: AlertTriangle,
    },
    {
      href: routeWithWorkshop('/admin/equipos', workshopId),
      label: 'Equipos',
      helper: 'Operativos',
      icon: Wrench,
    },
    {
      href: routeWithWorkshop('/admin/asignaciones', workshopId),
      label: 'Asignaciones',
      helper: 'Turnos',
      icon: Users,
    },
    {
      href: routeWithWorkshop('/admin/ventas', workshopId),
      label: 'Ventas',
      helper: 'Comercial',
      icon: DollarSign,
    },
    {
      href: routeWithWorkshop('/admin/finanzas', workshopId),
      label: 'Finanzas',
      helper: 'Balance',
      icon: TrendingUp,
    },
    {
      href: routeWithWorkshop('/admin/gastos', workshopId),
      label: 'Gastos',
      helper: 'Registro',
      icon: ReceiptText,
    },
    {
      href: routeWithWorkshop('/admin/contabilidad', workshopId),
      label: 'Contabilidad',
      helper: 'Reportes',
      icon: FileText,
    },
    {
      href: routeWithWorkshop('/admin/trabajadores', workshopId),
      label: 'Trabajadores',
      helper: 'Personal',
      icon: Users,
    },
    {
      href: routeWithWorkshop('/admin/pagos', workshopId),
      label: 'Pagos',
      helper: 'Personal',
      icon: Wallet,
    },
    {
      href: routeWithWorkshop('/admin/historial', workshopId),
      label: 'Historial',
      helper: 'Actividad',
      icon: ClipboardList,
    },
    {
      href: routeWithWorkshop('/admin/configuracion', workshopId),
      label: 'Configuración',
      helper: 'Sistema',
      icon: Settings,
    },
    {
      href: routeWithWorkshop('/admin/permisos', workshopId),
      label: 'Permisos',
      helper: 'Accesos',
      icon: Shield,
    },
  ]

  if (role === 'Obrero') {
    items.push({
      href: routeWithWorkshop('/admin/obrero', workshopId),
      label: 'Mi panel',
      helper: 'Obrero',
      icon: Wallet,
    })
  }

  return items
}

export const isNavItemActive = (href: string, pathname: string): boolean =>
  isAdminRouteActive(href, pathname)

