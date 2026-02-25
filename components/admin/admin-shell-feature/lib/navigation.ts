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
  Settings,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import type { AdminRole } from '@/lib/admin-auth'
import { catalogoItems } from '@/lib/catalogo-data'
import {
  bloquesYLotes,
  equipos,
  historialPagos,
  logsSistema,
  mermas,
  produccionDiaria,
  produccionTrabajadores,
  productos,
  trabajadores,
  ventas,
} from '@/lib/data'
import type { AdminNavItem } from '../model/types'

export const buildDefaultNav = (role?: AdminRole): AdminNavItem[] => {
  const totalLosasInventario = productos.reduce((sum, p) => sum + p.cantidadLosas, 0)
  const ventasCompletadas = ventas.filter((v) => v.estado === 'completada')
  const totalVentas = ventasCompletadas.reduce((sum, v) => sum + v.total, 0)
  const totalMermas = mermas.reduce((sum, m) => sum + m.metrosCuadrados, 0)
  const bloquesActivos = bloquesYLotes.filter((b) => b.estado === 'activo').length
  const equiposActivos = equipos.filter((equipo) => equipo.estado === 'activo').length
  const activeWorkers = trabajadores.filter((w) => w.estado === 'activo').length
  const produccionPorFecha = produccionDiaria.reduce<Record<string, number>>((acc, registro) => {
    acc[registro.fecha] = (acc[registro.fecha] ?? 0) + registro.totalM2
    return acc
  }, {})
  const asignacionesPorFecha = produccionTrabajadores.reduce<Record<string, number>>((acc, registro) => {
    acc[registro.fecha] = (acc[registro.fecha] ?? 0) + 1
    return acc
  }, {})
  const fechasOrdenadas = Object.keys(produccionPorFecha).sort()
  const fechasAsignaciones = Object.keys(asignacionesPorFecha).sort()
  const fechaUltima = fechasOrdenadas[fechasOrdenadas.length - 1]
  const fechaUltimaAsignacion = fechasAsignaciones[fechasAsignaciones.length - 1]
  const totalM2Hoy = fechaUltima ? (produccionPorFecha[fechaUltima] ?? 0) : 0
  const totalAsignacionesHoy = fechaUltimaAsignacion ? (asignacionesPorFecha[fechaUltimaAsignacion] ?? 0) : 0

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
      href: '/admin/equipos',
      label: 'Equipos',
      helper: `${equiposActivos} activos`,
      icon: Wrench,
    },
    {
      href: '/admin/asignaciones',
      label: 'Asignaciones',
      helper: `${totalAsignacionesHoy} hoy`,
      icon: Users,
    },
    {
      href: '/admin/ventas',
      label: 'Ventas',
      helper: `$${totalVentas.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      href: '/admin/finanzas',
      label: 'Finanzas',
      helper: 'Balance',
      icon: TrendingUp,
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
