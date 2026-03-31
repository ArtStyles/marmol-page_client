'use client'

import type React from 'react'
import type { AdminUser } from '@/lib/admin-auth'
import { AdminPanelCard } from './admin-panel-card'
import { ApprovalNotifications } from './approval-notifications'

type RightPanelSlotProps = {
  rightPanel?: React.ReactNode
  sessionUser: AdminUser | null
}

export const RightPanelSlot = ({ rightPanel, sessionUser }: RightPanelSlotProps) => (
  <aside className="min-h-0 overflow-hidden lg:sticky lg:top-8 lg:self-start">
    <div className="scrollbar-hidden space-y-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-4 lg:-mr-4">
      <ApprovalNotifications sessionUser={sessionUser} />
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
