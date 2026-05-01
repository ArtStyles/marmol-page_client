'use client'

import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Badge } from '@/components/ui/badge'
import { useFinancialSummary } from '@/hooks/use-financial-summary'
import { FileText, ShieldAlert } from 'lucide-react'

const formatMoney = (value: number) => {
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(value))
  return `${sign}$${absolute.toLocaleString()}`
}

export default function ContabilidadPage() {
  const { summary, loading, error } = useFinancialSummary({ scope: 'finanzas' })

  const reportes = [
    {
      title: 'Conciliacion de ventas',
      detail: `${summary?.ventasRecientes.length ?? 0} ventas recientes en monitor`,
      status: 'listo',
    },
    {
      title: 'Nomina del periodo',
      detail: `${formatMoney(summary?.nomina.pagado ?? 0)} pagado / ${formatMoney(summary?.nomina.pendiente ?? 0)} pendiente`,
      status: (summary?.nomina.pendiente ?? 0) > 0 ? 'pendiente' : 'listo',
    },
    {
      title: 'Fondo operativo',
      detail: `${formatMoney(summary?.operacion.fondosOperativos ?? 0)} reservado para materiales`,
      status: 'revision',
    },
  ]

  const notificaciones = summary?.alertas.length
    ? summary.alertas
    : [
        'Sin alertas contables activas.',
        'El resumen financiero esta consolidado con ledger y pagos.',
      ]

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Alertas contables" meta="Supervision">
        <div className="space-y-2 text-sm text-slate-700">
          {notificaciones.map((item) => (
            <div key={item} className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">
              {item}
            </div>
          ))}
        </div>
      </AdminPanelCard>
      <AdminPanelCard title="Estado de revision" meta="Lectura">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Descuentos aplicados</span>
            <span className="font-semibold">{formatMoney(summary?.operacion.descuentos ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Fondo operativo</span>
            <span className="font-semibold">{formatMoney(summary?.operacion.fondosOperativos ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pagos pendientes</span>
            <span className="font-semibold">{formatMoney(summary?.nomina.pendiente ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ledger de gastos</span>
            <span className="font-semibold">{formatMoney(summary?.gastos.totalActivo ?? 0)}</span>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="rounded-[var(--agent-radius-panel-lg)] border border-white/60 bg-white/70 p-6 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Contabilidad</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Reportes y supervision financiera
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Vista consolidada de ventas, pagos, fondos operativos y ledger de gastos.
              </p>
              {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
              {loading ? <p className="mt-2 text-sm text-slate-500">Cargando informacion...</p> : null}
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
              Solo lectura
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Ingresos</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.operacion.ingresosTotales ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Ventas cerradas conciliadas</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Descuentos</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.operacion.descuentos ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Controlado por politicas de precio</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Pagos realizados</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.nomina.pagado ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Nomina procesada</p>
          </div>
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Pagos pendientes</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(summary?.nomina.pendiente ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Programados para el cierre</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Reportes consolidados</p>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {reportes.map((reporte) => (
                <div
                  key={reporte.title}
                  className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700"
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

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Notificaciones internas</p>
              <ShieldAlert className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {notificaciones.map((item) => (
                <div key={item} className="rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-600">
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
