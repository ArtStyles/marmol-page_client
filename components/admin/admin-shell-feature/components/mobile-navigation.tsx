'use client'

import Link from 'next/link'
import type { AdminUser } from '@/lib/admin-auth'
import { Button } from '@/components/admin/admin-button'
import { cn } from '@/lib/utils'
import { isNavItemActive } from '../lib/navigation'
import type { AdminNavItem } from '../model/types'

type MobileNavigationProps = {
  pathname: string
  filteredItems: AdminNavItem[]
  sessionUser: AdminUser | null
  onLogout: () => void
}

export const MobileNavigation = ({
  pathname,
  filteredItems,
  sessionUser,
  onLogout,
}: MobileNavigationProps) => (
  <nav className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
    <div className="rounded-[22px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-2 shadow-[var(--dash-shadow)] backdrop-blur-xl">
      <div className="scrollbar-hidden flex items-center gap-2 overflow-x-auto px-1">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = isNavItemActive(item.href, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[92px] flex-shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                isActive
                  ? 'border-slate-900/10 bg-white/90 text-slate-900 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)]'
                  : 'border-transparent bg-white/60 text-slate-600 hover:border-white/80 hover:bg-white/80 hover:text-slate-900',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl',
                  isActive ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-600',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
        {sessionUser && (
          <Button
            size="sm"
            variant="outline"
            className="min-w-[92px] flex-shrink-0 justify-center"
            onClick={onLogout}
          >
            Salir
          </Button>
        )}
      </div>
    </div>
  </nav>
)
