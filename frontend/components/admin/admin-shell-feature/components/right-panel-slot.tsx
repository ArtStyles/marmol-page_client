'use client'

import type React from 'react'
import type { AdminUser } from '@/lib/admin-auth'
import { AdminPanelCard } from './admin-panel-card'
import { ApprovalNotifications } from './approval-notifications'

type RightPanelSlotProps = {
  rightPanel?: React.ReactNode
  sessionUser: AdminUser | null
  onLogout: () => void
}

export const RightPanelSlot = ({ rightPanel, sessionUser, onLogout }: RightPanelSlotProps) => (
  <aside className="min-h-0 overflow-hidden">
    <div className="scrollbar-hidden space-y-4 lg:fixed lg:top-0 lg:right-5 lg:z-20 lg:h-screen lg:w-[260px] lg:overflow-y-auto lg:pt-5 lg:pb-5 lg:pr-3">
      <ApprovalNotifications sessionUser={sessionUser} onLogout={onLogout} />
      {rightPanel ?? (
        <AdminPanelCard title="Resumen" meta="Panel">
          <div className="space-y-2 text-sm text-slate-700">
            <p>Selecciona un modulo para ver su resumen.</p>
          </div>
        </AdminPanelCard>
      )}
    </div>
  </aside>
)
