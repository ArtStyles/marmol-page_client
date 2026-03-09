import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  DollarSign,
  Factory,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Package,
  ReceiptText,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import type { AdminRole } from '@/lib/admin-auth'
import type { AdminNavItem } from '../model/types'

export const buildDefaultNav = (role?: AdminRole): AdminNavItem[] => {
  const items: AdminNavItem[] = [
    {
      href: '/admin',
      label: 'Dashboard',
      helper: 'Resumen',
      icon: LayoutDashboard,
    },
    {
      href: '/admin/inventario',
      label: 'Inventario',
      helper: 'Stock',
      icon: Package,
    },
    {
      href: '/admin/produccion',
      label: 'Produccion',
      helper: 'Diaria',
      icon: Factory,
    },
    {
      href: '/admin/equipos',
      label: 'Equipos',
      helper: 'Operativos',
      icon: Wrench,
    },
    {
      href: '/admin/asignaciones',
      label: 'Asignaciones',
      helper: 'Turnos',
      icon: Users,
    },
    {
      href: '/admin/ventas',
      label: 'Ventas',
      helper: 'Comercial',
      icon: DollarSign,
    },
    {
      href: '/admin/finanzas',
      label: 'Finanzas',
      helper: 'Balance',
      icon: TrendingUp,
    },
    {
      href: '/admin/gastos',
      label: 'Gastos',
      helper: 'Registro',
      icon: ReceiptText,
    },
    {
      href: '/admin/contabilidad',
      label: 'Contabilidad',
      helper: 'Reportes',
      icon: FileText,
    },
    {
      href: '/admin/bloques',
      label: 'Materia prima',
      helper: 'Bloques y lotes',
      icon: Boxes,
    },
    {
      href: '/admin/mermas',
      label: 'Mermas',
      helper: 'Control',
      icon: AlertTriangle,
    },
    {
      href: '/admin/trabajadores',
      label: 'Trabajadores',
      helper: 'Personal',
      icon: Users,
    },
    {
      href: '/admin/pagos',
      label: 'Pagos',
      helper: 'Nomina',
      icon: Wallet,
    },
    {
      href: '/admin/catalogo',
      label: 'Catalogo',
      helper: 'Landing',
      icon: LayoutGrid,
    },
    {
      href: '/admin/historial',
      label: 'Historial',
      helper: 'Actividad',
      icon: ClipboardList,
    },
    {
      href: '/admin/configuracion',
      label: 'Configuracion',
      helper: 'Sistema',
      icon: Settings,
    },
  ]

  if (role === 'Obrero') {
    items.push({
      href: '/admin/obrero',
      label: 'Mi panel',
      helper: 'Obrero',
      icon: Wallet,
    })
  }

  return items
}

export const isNavItemActive = (href: string, pathname: string): boolean =>
  href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)
