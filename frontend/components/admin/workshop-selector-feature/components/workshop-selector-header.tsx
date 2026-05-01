'use client'

import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import type { AdminUser } from '@/lib/admin-auth'

type WorkshopSelectorHeaderProps = {
  user: AdminUser
  onLogout: () => void
}

export const WorkshopSelectorHeader = ({ user, onLogout }: WorkshopSelectorHeaderProps) => (
  <div className="flex flex-col gap-4 rounded-[var(--agent-radius-panel-lg)] border border-white/60 bg-white/70 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Seleccion de taller</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Bienvenido, {user.name}</h1>
      <p className="mt-1 text-sm text-slate-600">Elige el taller que deseas administrar o crea uno nuevo.</p>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
        {user.role}
      </Badge>
      <Button variant="ghost" size="sm" onClick={onLogout}>
        Cerrar sesion
      </Button>
    </div>
  </div>
)

