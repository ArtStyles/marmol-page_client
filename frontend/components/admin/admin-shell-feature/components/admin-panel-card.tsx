'use client'

import { cn } from '@/lib/utils'
import type { AdminPanelCardProps } from '../model/types'

export const AdminPanelCard = ({ title, meta, badge, className, children }: AdminPanelCardProps) => (
  <div
    className={cn(
      'min-w-0 rounded-[var(--dash-panel-radius)] border border-[var(--dash-border)] bg-[var(--dash-card)] p-3.5 shadow-[var(--dash-shadow-soft)] backdrop-blur-xl',
      className,
    )}
  >
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
      <p className="min-w-0 flex-1 text-[11px] uppercase tracking-[0.35em] text-slate-500">{title}</p>
      {badge ?? (
        meta ? (
          <span className="ml-auto max-w-full break-words text-[11px] leading-tight text-slate-500">
            {meta}
          </span>
        ) : null
      )}
    </div>
    <div className="mt-3 min-w-0">{children}</div>
  </div>
)


