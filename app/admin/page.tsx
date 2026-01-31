import { StatCard } from '@/components/stat-card'
import { AdminDashboardTables } from '@/components/admin/dashboard-tables'
import { productos, ventas, trabajadores, produccionDiaria, mermas, bloquesYLotes } from '@/lib/data'
import { Package, DollarSign, Users, TrendingUp, Factory, AlertTriangle, Boxes } from 'lucide-react'
import { losasAMetros } from '@/lib/types'

export default function AdminDashboard() {
  // Cálculos del dashboard
  const totalLosasInventario = productos.reduce((sum, p) => sum + p.cantidadLosas, 0)
  const totalM2Inventario = productos.reduce((sum, p) => sum + p.metrosCuadrados, 0)
  
  const ventasCompletadas = ventas.filter(v => v.estado === 'completada')
  const totalVentas = ventasCompletadas.reduce((sum, v) => sum + v.total, 0)
  
  const activeWorkers = trabajadores.filter(w => w.estado === 'activo').length
  
  const totalMermas = mermas.reduce((sum, m) => sum + m.metrosCuadrados, 0)
  
  const produccionHoy = produccionDiaria.filter(p => p.fecha === '2026-01-28')
  const totalM2Hoy = produccionHoy.reduce((sum, p) => sum + losasAMetros(p.cantidadLosas, p.dimension), 0)
  
  const bloquesActivos = bloquesYLotes.filter(b => b.estado === 'activo').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Panel de Control - Taller de Mármol
        </h1>
        <p className="mt-1 text-muted-foreground">
          Sistema de control de producción, mermas, inventario y rentabilidad
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Inventario Total"
          value={`${totalLosasInventario} losas`}
          description={`${totalM2Inventario.toFixed(1)} m² disponibles`}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Ventas del Mes"
          value={`$${totalVentas.toLocaleString()}`}
          description={`${ventasCompletadas.length} ventas completadas`}
          trend={{ value: 12, isPositive: true }}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Producción Hoy"
            value={`${totalM2Hoy.toFixed(1)} m²`}
          description={`${produccionHoy.length} registros`}
          icon={<Factory className="h-5 w-5" />}
        />
        <StatCard
          title="Mermas Totales"
          value={`${totalMermas.toFixed(1)} m²`}
          description="m² perdidos este mes"
          trend={{ value: totalMermas, isPositive: false }}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Trabajadores Activos"
          value={activeWorkers}
          description={`de ${trabajadores.length} total`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Bloques/Lotes Activos"
          value={bloquesActivos}
          description={`de ${bloquesYLotes.length} total`}
          icon={<Boxes className="h-5 w-5" />}
        />
        <StatCard
          title="Ventas Pendientes"
          value={ventas.filter(v => v.estado === 'pendiente').length}
          description="requieren atención"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Tables */}
      <AdminDashboardTables
        produccionDiaria={produccionDiaria}
        mermas={mermas}
      />
    </div>
  )
}
