'use client'

import type React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AdminUser } from '@/lib/admin-auth'
import { Button } from '@/components/admin/admin-button'
import { cn } from '@/lib/utils'
import { AdminPanelCard } from './admin-panel-card'
import { ApprovalNotifications } from './approval-notifications'

type RightPanelSlotProps = {
  rightPanel?: React.ReactNode
  sessionUser: AdminUser | null
  onLogout: () => void
  isCollapsed: boolean
  onToggle: () => void
}

export const RightPanelSlot = ({
  rightPanel,
  sessionUser,
  onLogout,
  isCollapsed,
  onToggle,
}: RightPanelSlotProps) => (
  <aside
    className="hidden min-h-0 lg:block lg:shrink-0 lg:transition-[width] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
    style={{ width: 'var(--shell-right-width)' }}
  >
    <div
      className={cn(
        'scrollbar-hidden min-w-0 space-y-3 lg:fixed lg:top-0 lg:right-5 lg:z-20 lg:h-screen lg:overflow-y-auto lg:pt-5 lg:pb-5 lg:transition-[width,padding] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        isCollapsed ? 'lg:pl-0' : 'lg:pl-3',
      )}
      style={{ width: 'var(--shell-right-width)' }}
    >
      <div className="min-w-0 rounded-[var(--dash-panel-radius)] border border-(--dash-border) bg-(--dash-card) p-2.5 shadow-(--dash-shadow-soft) backdrop-blur-xl">
        <div
          className={cn(
            'flex gap-2',
            isCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-end',
          )}
        >
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={onToggle}
            aria-label={isCollapsed ? 'Expandir panel derecho' : 'Contraer panel derecho'}
            title={isCollapsed ? 'Expandir panel derecho' : 'Contraer panel derecho'}
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <ApprovalNotifications sessionUser={sessionUser} onLogout={onLogout} compact={isCollapsed} />
        </div>
      </div>

      <div
        className={cn(
          'grid min-w-0 transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isCollapsed
            ? 'pointer-events-none grid-rows-[0fr] -translate-y-2 opacity-0'
            : 'grid-rows-[1fr] translate-y-0 opacity-100',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="min-w-0 break-words pt-0.5 [&>*]:min-w-0">
            {rightPanel ?? (
              <AdminPanelCard title="Resumen" meta="Panel">
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Selecciona un modulo para ver su resumen.</p>
                </div>
              </AdminPanelCard>
            )}
          </div>
        </div>
      </div>
    </div>
  </aside>
)

