'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/admin/admin-button'
import { cn } from '@/lib/utils'
import { isNavItemActive } from '../lib/navigation'
import type { AdminNavItem } from '../model/types'

type DesktopNavigationProps = {
  pathname: string
  filteredItems: AdminNavItem[]
  isCollapsed: boolean
  onToggle: () => void
}

export const DesktopNavigation = ({
  pathname,
  filteredItems,
  isCollapsed,
  onToggle,
}: DesktopNavigationProps) => (
  <aside
    className="hidden min-h-0 lg:block lg:shrink-0 lg:transition-[width] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
    style={{ width: 'var(--shell-nav-width)' }}
  >
    <div
      className="scrollbar-hidden space-y-3 py-0 lg:fixed lg:top-0 lg:left-5 lg:z-20 lg:h-screen lg:overflow-y-auto lg:pt-5 lg:pb-5 lg:pr-3 lg:transition-[width,padding] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{ width: 'var(--shell-nav-width)' }}
    >
      <div className="rounded-[var(--dash-panel-radius)] border border-(--dash-border) bg-(--dash-card) p-2.5 shadow-(--dash-shadow-soft) backdrop-blur-xl">
        <div className={cn('flex items-center gap-2', isCollapsed ? 'justify-center' : 'justify-between')}>
          <div
            className={cn(
              'min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
              isCollapsed ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-[10rem] translate-x-0 opacity-100',
            )}
          >
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Navegacion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="h-8 w-8"
              onClick={onToggle}
              aria-label={isCollapsed ? 'Expandir navegacion' : 'Contraer navegacion'}
              title={isCollapsed ? 'Expandir navegacion' : 'Contraer navegacion'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className={cn('space-y-1.5', isCollapsed ? 'mt-2' : 'mt-3')}>
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = isNavItemActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'group flex items-center rounded-[var(--dash-panel-radius-tight)] border text-sm font-medium transition',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2',
                  isActive
                    ? 'border-slate-900/10 bg-white/90 text-slate-900 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)]'
                    : 'border-transparent bg-white/60 text-slate-700 hover:border-white/70 hover:bg-white/80 hover:text-slate-900',
                )}
              >
                <span
                  className={cn(
                    'flex min-w-0 items-center transition-[gap] duration-200 ease-out motion-reduce:transition-none',
                    isCollapsed ? 'justify-center gap-0' : 'gap-3',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-[var(--dash-control-radius)]',
                      isActive ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-600 group-hover:bg-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      'flex min-w-0 flex-col overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
                      isCollapsed ? 'max-w-0 translate-x-1 opacity-0' : 'max-w-[8.5rem] translate-x-0 opacity-100',
                    )}
                  >
                    <span>{item.label}</span>
                    {item.helper && <span className="text-xs text-slate-500">{item.helper}</span>}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  </aside>
)


