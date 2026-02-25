'use client'

import { AdminPanelCard } from '@/components/admin/admin-shell'
import type { AccionLosa, ProduccionDiaria } from '@/lib/types'
import { cn } from '@/lib/utils'
import { actionLabels, actionOrder } from '../lib/produccion-helpers'

type ResumenPartidas = {
  mermaLosas: number
  mermaM2: number
  reutilizableLosas: number
  reutilizableM2: number
}

type Props = {
  fechaResumen: string
  origenesActivosResumen: number
  resumenAcciones: Record<AccionLosa, number>
  resumenPartidas: ResumenPartidas
  topOrigenesResumen: ProduccionDiaria[]
  totalLosasResumen: number
  totalM2Resumen: number
}

export function ProduccionRightPanel({
  fechaResumen,
  origenesActivosResumen,
  resumenAcciones,
  resumenPartidas,
  topOrigenesResumen,
  totalLosasResumen,
  totalM2Resumen,
}: Props) {
  return (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen diario" meta={fechaResumen}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>m2 fecha</span>
            <span className="font-semibold">{totalM2Resumen.toFixed(2)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Losas fecha</span>
            <span className="font-semibold">{totalLosasResumen}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Origenes activos</span>
            <span className="font-semibold">{origenesActivosResumen}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Acciones" meta={fechaResumen}>
        <div className="space-y-2 text-sm text-slate-700">
          {actionOrder.map((accion) => (
            <div
              key={accion}
              className={cn(
                'flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2',
                accion === 'pulir' && 'border border-emerald-200/60 bg-emerald-50/70',
              )}
            >
              <span>{actionLabels[accion]}</span>
              <span className={cn('text-xs font-semibold text-slate-900', accion === 'pulir' && 'text-emerald-700')}>
                {resumenAcciones[accion].toFixed(2)} m2
              </span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Losas partidas" meta={fechaResumen}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Merma total</span>
            <span className="font-semibold text-rose-700">
              {resumenPartidas.mermaLosas} losas / {resumenPartidas.mermaM2.toFixed(2)} m2
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Partidas reutilizables</span>
            <span className="font-semibold text-sky-700">
              {resumenPartidas.reutilizableLosas} losas / {resumenPartidas.reutilizableM2.toFixed(2)} m2
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Merma en produccion no se paga. Reutilizable se conserva para inventario.
          </p>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top origenes" meta={fechaResumen}>
        <div className="space-y-2 text-sm text-slate-700">
          {topOrigenesResumen.length === 0 ? (
            <p className="text-xs text-slate-500">Sin produccion registrada en la fecha filtrada.</p>
          ) : (
            topOrigenesResumen.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.origenNombre}</p>
                  <p className="text-[11px] text-slate-500">{item.totalLosas} losas</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{item.totalM2.toFixed(2)} m2</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )
}
