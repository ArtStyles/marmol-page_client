'use client'

import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import type { WorkshopTenant } from '@/lib/workshops'
import { Factory, MapPin, TrendingUp, Users } from 'lucide-react'
import { formatMoney } from '../lib/utils'
import { statusStyles } from '../model/constants'

type WorkshopCardProps = {
  workshop: WorkshopTenant
  onSelect: (workshopId: string) => void
  onToggleStatus: (workshopId: string) => void
  onDelete: (workshopId: string) => void
}

export const WorkshopCard = ({ workshop, onSelect, onToggleStatus, onDelete }: WorkshopCardProps) => (
  <div className="rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Taller</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{workshop.nombre}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          <span>{workshop.ciudad}</span>
        </div>
      </div>
      <Badge variant="outline" className={statusStyles[workshop.estado]}>
        {workshop.estado.replace('-', ' ')}
      </Badge>
    </div>

    <div className="mt-4 grid gap-2 text-xs text-slate-600">
      <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
        <span className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Empleados
        </span>
        <span className="font-semibold text-slate-900">{workshop.empleados}</span>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
        <span className="flex items-center gap-2">
          <Factory className="h-3.5 w-3.5" />
          Produccion mes
        </span>
        <span className="font-semibold text-slate-900">{workshop.produccionMesM2.toFixed(0)} m2</span>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
        <span className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          Ventas mes
        </span>
        <span className="font-semibold text-slate-900">{formatMoney(workshop.ventasMes)}</span>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
      <div className="rounded-2xl bg-white/80 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Margen</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{(workshop.margenOperativo * 100).toFixed(1)}%</p>
      </div>
      <div className="rounded-2xl bg-white/80 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Ordenes</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{workshop.ordenesActivas}</p>
      </div>
    </div>

    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
      <span>Ultima actualizacion</span>
      <span className="font-medium text-slate-700">{workshop.ultimaActualizacion}</span>
    </div>

    <div className="mt-4 flex flex-col gap-2">
      <Button className="w-full" onClick={() => onSelect(workshop.id)} disabled={workshop.estado === 'pausado'}>
        {workshop.estado === 'pausado' ? 'Taller pausado' : 'Administrar taller'}
      </Button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-transparent"
          onClick={() => onToggleStatus(workshop.id)}
        >
          {workshop.estado === 'activo' ? 'Desactivar' : 'Activar'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-rose-600 hover:text-rose-700"
          onClick={() => onDelete(workshop.id)}
        >
          Eliminar
        </Button>
      </div>
    </div>
  </div>
)
