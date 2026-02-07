'use client'

import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { historialPagos, produccionDiaria, ventas } from '@/lib/data'
import { FileText, ShieldAlert } from 'lucide-react'

export default function ContabilidadPage() {
  const ventasCompletadas = ventas.filter((venta) => venta.estado === 'completada')
  const totalIngresos = ventasCompletadas.reduce((sum, venta) => sum + venta.total, 0)
  const totalDescuentos = ventasCompletadas.reduce(
    (sum, venta) => sum + venta.subtotal * (venta.descuento / 100),
    0,
  )
  const totalFondosOperativos = ventasCompletadas.reduce(
    (sum, venta) => sum + (venta.fondoOperativo ?? 0),
    0,
  )

  const pagosRealizados = historialPagos.reduce((sum, pago) => sum + pago.totalPagado, 0)
  const pagosPendientes = produccionDiaria
    .filter((registro) => !registro.pagado)
    .reduce((sum, registro) => sum + registro.pagoFinal, 0)

  const formatMoney = (value: number) => {
    const sign = value < 0 ? '-' : ''
    const absolute = Math.abs(Math.round(value))
    return `${sign}$${absolute.toLocaleString()}`
  }

  const reportes = [
    {
      title: 'Conciliacion de ventas',
      detail: `${ventasCompletadas.length} ventas verificadas`,
      status: 'listo',
    },
    {
      title: 'Nomina del periodo',
      detail: `${formatMoney(pagosRealizados)} pagado / ${formatMoney(pagosPendientes)} pendiente`,
      status: pagosPendientes > 0 ? 'pendiente' : 'listo',
    },
    {
      title: 'Fondo operativo',
      detail: `${formatMoney(totalFondosOperativos)} reservado para materiales`,
      status: 'revision',
    },
  ]

  const notificaciones = [
    'Revisar descuento inusual en las ultimas ventas.',
    'Pendiente validar pago de bonos de produccion.',
    'Actualiza la politica de fondo operativo para marzo.',
  ]

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Alertas contables" meta="Supervision">
        <div className="space-y-2 text-sm text-slate-700">
          {notificaciones.map((item) => (
            <div key={item} className="rounded-2xl bg-white/70 px-3 py-2 text-xs text-slate-600">
              {item}
            </div>
          ))}
        </div>
      </AdminPanelCard>
      <AdminPanelCard title="Estado de revision" meta="Lectura">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Descuentos aplicados</span>
            <span className="font-semibold">{formatMoney(totalDescuentos)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Fondo operativo</span>
            <span className="font-semibold">{formatMoney(totalFondosOperativos)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pagos pendientes</span>
            <span className="font-semibold">{formatMoney(pagosPendientes)}</span>
          </div>
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
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Contabilidad</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Reportes y supervision financiera
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Area de lectura para control de ventas, pagos y movimientos contables.
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
              Solo lectura
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ingresos</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(totalIngresos)}</p>
            <p className="text-xs text-slate-500">{ventasCompletadas.length} ventas cerradas</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Descuentos</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(totalDescuentos)}</p>
            <p className="text-xs text-slate-500">Controlado por politicas de precio</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Pagos realizados</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(pagosRealizados)}</p>
            <p className="text-xs text-slate-500">Nomina procesada</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Pagos pendientes</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(pagosPendientes)}</p>
            <p className="text-xs text-slate-500">Programados para el cierre</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Reportes consolidados
              </p>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {reportes.map((reporte) => (
                <div
                  key={reporte.title}
                  className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-700"
                >
                  <div>
                    <p className="font-medium text-slate-900">{reporte.title}</p>
                    <p className="text-xs text-slate-500">{reporte.detail}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      reporte.status === 'listo'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : reporte.status === 'pendiente'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                    }
                  >
                    {reporte.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Notificaciones internas
              </p>
              <ShieldAlert className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {notificaciones.map((item) => (
                <div key={item} className="rounded-2xl bg-white/80 px-3 py-2 text-xs text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
