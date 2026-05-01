'use client'

import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { DesktopNavigation } from '../components/desktop-navigation'
import { MobileNavigation } from '../components/mobile-navigation'
import { RightPanelSlot } from '../components/right-panel-slot'
import { useAdminShellSession } from '../hooks/use-admin-shell-session'
import { shellStyle } from '../model/constants'
import type { AdminShellProps } from '../model/types'

const NAV_COLLAPSED_STORAGE_KEY = 'marble-admin-nav-collapsed'
const RIGHT_PANEL_COLLAPSED_STORAGE_KEY = 'marble-admin-right-panel-collapsed'

let collapseStateCache = {
  nav: false,
  right: false,
  ready: false,
}

const readStoredCollapsedState = (storageKey: string) => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(storageKey) === '1'
}

export const AdminShell = ({ children, rightPanel, navItems }: AdminShellProps) => {
  const pathname = usePathname()
  const { sessionUser, filteredItems, handleLogout } = useAdminShellSession(pathname, navItems)
  const [isNavCollapsed, setIsNavCollapsed] = useState(() => collapseStateCache.nav)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(() => collapseStateCache.right)

  useLayoutEffect(() => {
    const nextNavCollapsed = collapseStateCache.ready
      ? collapseStateCache.nav
      : readStoredCollapsedState(NAV_COLLAPSED_STORAGE_KEY)
    const nextRightPanelCollapsed = collapseStateCache.ready
      ? collapseStateCache.right
      : readStoredCollapsedState(RIGHT_PANEL_COLLAPSED_STORAGE_KEY)

    collapseStateCache = {
      nav: nextNavCollapsed,
      right: nextRightPanelCollapsed,
      ready: true,
    }

    setIsNavCollapsed(nextNavCollapsed)
    setIsRightPanelCollapsed(nextRightPanelCollapsed)
  }, [])

  const toggleNavCollapsed = () => {
    setIsNavCollapsed((current) => {
      const next = !current
      collapseStateCache = { ...collapseStateCache, nav: next, ready: true }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, next ? '1' : '0')
      }
      return next
    })
  }

  const toggleRightPanelCollapsed = () => {
    setIsRightPanelCollapsed((current) => {
      const next = !current
      collapseStateCache = { ...collapseStateCache, right: next, ready: true }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RIGHT_PANEL_COLLAPSED_STORAGE_KEY, next ? '1' : '0')
      }
      return next
    })
  }

  const layoutStyle = useMemo(
    () =>
      ({
        ...shellStyle,
        '--shell-nav-width': isNavCollapsed ? '88px' : 'clamp(216px, 17vw, 232px)',
        '--shell-right-width': isRightPanelCollapsed ? '88px' : 'clamp(300px, 24vw, 332px)',
      }) as CSSProperties,
    [isNavCollapsed, isRightPanelCollapsed],
  )

  return (
    <div className="admin-shell relative">
      <div
        className="relative isolate min-h-screen px-4 py-4 shadow-[0_45px_120px_-90px_rgba(15,23,42,0.34)] lg:px-5"
        style={layoutStyle}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 right-10 h-44 w-44 rounded-full bg-[#dbe7ff] opacity-55 blur-3xl" />
          <div className="absolute -bottom-20 left-[-10px] h-60 w-60 rounded-full bg-[#f6e7d2] opacity-55 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.78),transparent_34%),radial-gradient(circle_at_82%_0%,rgba(255,255,255,0.42),transparent_42%)]" />
        </div>

        <div className="relative pb-28 lg:flex lg:items-start lg:gap-3 lg:pb-0">
          <DesktopNavigation
            pathname={pathname}
            filteredItems={filteredItems}
            isCollapsed={isNavCollapsed}
            onToggle={toggleNavCollapsed}
          />

          <section className="min-w-0 max-w-full flex-1 space-y-4">
            {children}
          </section>

          <RightPanelSlot
            rightPanel={rightPanel}
            sessionUser={sessionUser}
            onLogout={handleLogout}
            isCollapsed={isRightPanelCollapsed}
            onToggle={toggleRightPanelCollapsed}
          />
        </div>

        <MobileNavigation
          pathname={pathname}
          filteredItems={filteredItems}
          sessionUser={sessionUser}
          onLogout={handleLogout}
        />
      </div>
    </div>
  )
}


