import type React from 'react'
import type { LucideIcon } from 'lucide-react'

export type AdminNavItem = {
  href: string
  label: string
  helper?: string
  icon: LucideIcon
}

export type AdminShellProps = {
  children: React.ReactNode
  rightPanel?: React.ReactNode
  navItems?: AdminNavItem[]
}

export type AdminPanelCardProps = {
  title: string
  meta?: string
  badge?: React.ReactNode
  className?: string
  children: React.ReactNode
}
