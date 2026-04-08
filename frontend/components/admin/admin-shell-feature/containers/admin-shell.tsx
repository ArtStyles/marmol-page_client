'use client'

import type React from 'react'
import { usePathname } from 'next/navigation'
import { DesktopNavigation } from '../components/desktop-navigation'
import { MobileNavigation } from '../components/mobile-navigation'
import { RightPanelSlot } from '../components/right-panel-slot'
import { useAdminShellSession } from '../hooks/use-admin-shell-session'
import { shellStyle } from '../model/constants'
import type { AdminShellProps } from '../model/types'

export const AdminShell = ({ children, rightPanel, navItems }: AdminShellProps) => {
  const pathname = usePathname()
  const { sessionUser, filteredItems, handleLogout } = useAdminShellSession(pathname, navItems)

  return (
    <div className="admin-shell relative">
      <div
        className="relative isolate min-h-screen p-5 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.45)]"
        style={shellStyle}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-[#dbe7ff] opacity-70 blur-3xl" />
          <div className="absolute -bottom-24 left-[-40px] h-72 w-72 rounded-full bg-[#f6e7d2] opacity-70 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.5),transparent_50%)]" />
        </div>

        <div className="relative grid gap-4 pb-28 lg:pb-0 lg:grid-cols-[200px_minmax(0,1fr)_260px]">
          <DesktopNavigation pathname={pathname} filteredItems={filteredItems} />

          <section className="space-y-5">{children}</section>

          <RightPanelSlot rightPanel={rightPanel} sessionUser={sessionUser} onLogout={handleLogout} />
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
