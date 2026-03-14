'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/admin/admin-button'
import { cn } from '@/lib/utils'
import { isNavItemActive } from '../lib/navigation'
import type { AdminNavItem } from '../model/types'
import type { AdminUser } from '@/lib/admin-auth'
import { AdminPanelCard } from './admin-panel-card'

type DesktopNavigationProps = {
  pathname: string
  filteredItems: AdminNavItem[]
  sessionUser: AdminUser | null
  onLogout: () => void
}

export const DesktopNavigation = ({
  pathname,
  filteredItems,
  sessionUser,
  onLogout,
}: DesktopNavigationProps) => (
  <aside className="hidden min-h-0 overflow-hidden lg:block lg:sticky lg:top-8 lg:self-start">
    <div className="scrollbar-hidden space-y-3 py-1 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-4 lg:-mr-4">
      <div className="rounded-[22px] border border-(--dash-border) bg-(--dash-card) p-2 shadow-(--dash-shadow)">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Menú</p>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
            Panel
          </Badge>
        </div>
        <div className="mt-3 space-y-1.5">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = isNavItemActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between rounded-2xl border px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'border-slate-900/10 bg-white/90 text-slate-900 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)]'
                    : 'border-transparent bg-white/60 text-slate-700 hover:border-white/70 hover:bg-white/80 hover:text-slate-900',
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl',
                      isActive ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-600 group-hover:bg-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col">
                    <span>{item.label}</span>
                    {item.helper && <span className="text-xs text-slate-500">{item.helper}</span>}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      {sessionUser && (
        <AdminPanelCard title="Usuario activo" meta={sessionUser.role}>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-900">{sessionUser.name}</p>
              <p className="text-xs text-slate-500">{sessionUser.email}</p>
            </div>
            <Button size="sm" variant="outline" className="w-full bg-white/70" onClick={onLogout}>
              Cerrar sesión
            </Button>
          </div>
        </AdminPanelCard>
      )}
    </div>
  </aside>
)
