'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_STORAGE_KEY,
  ADMIN_TOKEN_STORAGE_KEY,
  getAccessForRole,
  isPathAllowed,
  type AdminUser,
} from '@/lib/admin-auth'
import { WORKSHOP_STORAGE_KEY } from '@/lib/workshops'
import { buildDefaultNav } from '../lib/navigation'
import type { AdminNavItem } from '../model/types'

const readSessionUser = (): AdminUser | null => {
  if (typeof window === 'undefined') return null
  const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
  if (!token) return null
  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    return null
  }
}

type UseAdminShellSessionResult = {
  sessionUser: AdminUser | null
  filteredItems: AdminNavItem[]
  handleLogout: () => void
}

export const useAdminShellSession = (navItems?: AdminNavItem[]): UseAdminShellSessionResult => {
  const [sessionUser, setSessionUser] = useState<AdminUser | null>(() => readSessionUser())

  useEffect(() => {
    if (sessionUser) return
    const stored = readSessionUser()
    if (stored) {
      setSessionUser(stored)
    }
  }, [sessionUser])

  const items = useMemo(() => navItems ?? buildDefaultNav(sessionUser?.role), [navItems, sessionUser?.role])

  const filteredItems = useMemo(() => {
    const access = sessionUser ? getAccessForRole(sessionUser.role) : null
    return access ? items.filter((item) => isPathAllowed(item.href, access)) : []
  }, [items, sessionUser])

  const handleLogout = () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(WORKSHOP_STORAGE_KEY)
    window.location.assign('/admin')
  }

  return {
    sessionUser,
    filteredItems,
    handleLogout,
  }
}
