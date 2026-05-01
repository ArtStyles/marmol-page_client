import type React from 'react'
import type { WorkshopCreateInput, WorkshopTenant } from '@/lib/workshops'

export const statusStyles: Record<WorkshopTenant['estado'], string> = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'en-implementacion': 'border-amber-200 bg-amber-50 text-amber-700',
  pausado: 'border-slate-200 bg-slate-100 text-slate-600',
}

export const backgroundStyle: React.CSSProperties & { '--dash-bg': string } = {
  '--dash-bg': 'linear-gradient(135deg, #f6f7fb 0%, #e9eef7 45%, #f7f2eb 100%)',
  backgroundImage: 'var(--dash-bg)',
}

export const EMPTY_WORKSHOP_INPUT: WorkshopCreateInput = {
  nombre: '',
  ciudad: '',
  direccion: '',
  encargado: '',
  telefono: '',
  correo: '',
}

