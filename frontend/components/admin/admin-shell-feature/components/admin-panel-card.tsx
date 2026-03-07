'use client'

import { cn } from '@/lib/utils'
import type { AdminPanelCardProps } from '../model/types'

export const AdminPanelCard = ({ title, meta, badge, className, children }: AdminPanelCardProps) => (
  <div
    className={cn(
      'rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl',
      className,
    )}
  >
    <div className="flex items-center justify-between">
      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{title}</p>
      {badge ?? (meta ? <span className="text-[11px] text-slate-500">{meta}</span> : null)}
    </div>
    <div className="mt-4">{children}</div>
  </div>
)
