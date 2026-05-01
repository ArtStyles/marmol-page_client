'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ADMIN_STORAGE_KEY,
  ADMIN_TOKEN_STORAGE_KEY,
  getAccessForUser,
  hasPermission,
  isPathAllowed,
  type AdminUser,
} from '@/lib/admin-auth'
import { clearStoredAdminSession, isAccessTokenExpired, notifyAdminLogout } from '@/lib/api-client'
import { extractWorkshopIdFromAdminPath } from '@/lib/admin-routes'
import { WORKSHOP_STORAGE_KEY } from '@/lib/workshops'
import { buildDefaultNav } from '../lib/navigation'
import type { AdminNavItem } from '../model/types'

const readSessionUser = (): AdminUser | null => {
  if (typeof window === 'undefined') return null
  const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
  if (!token || isAccessTokenExpired(token)) {
    clearStoredAdminSession()
    return null
  }
  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    clearStoredAdminSession()
    return null
  }
}

type UseAdminShellSessionResult = {
  sessionUser: AdminUser | null
  filteredItems: AdminNavItem[]
  handleLogout: () => void
}

export const useAdminShellSession = (
  pathname: string,
  navItems?: AdminNavItem[],
): UseAdminShellSessionResult => {
  const router = useRouter()
  const [sessionUser, setSessionUser] = useState<AdminUser | null>(() => readSessionUser())

  useEffect(() => {
    if (sessionUser) return
    const stored = readSessionUser()
    if (stored) {
      setSessionUser(stored)
    }
  }, [sessionUser])

  const workshopScopeId = useMemo(() => {
    if (!sessionUser) return null
    if (!hasPermission(sessionUser, 'workshops:override_scope')) {
      return sessionUser.workshopId ?? null
    }

    if (typeof window === 'undefined') return null
    const storedWorkshop = window.localStorage.getItem(WORKSHOP_STORAGE_KEY)
    if (storedWorkshop) return storedWorkshop

    const workshopFromPath = extractWorkshopIdFromAdminPath(pathname)
    return workshopFromPath
  }, [pathname, sessionUser])

  const items = useMemo(
    () => navItems ?? buildDefaultNav(sessionUser?.role, workshopScopeId),
    [navItems, sessionUser?.role, workshopScopeId],
  )

  const filteredItems = useMemo(() => {
    const access = sessionUser ? getAccessForUser(sessionUser) : null
    return access ? items.filter((item) => isPathAllowed(item.href, access)) : []
  }, [items, sessionUser])

  const handleLogout = () => {
    clearStoredAdminSession()
    setSessionUser(null)
    notifyAdminLogout()
    router.replace('/admin')
  }

  return {
    sessionUser,
    filteredItems,
    handleLogout,
  }
}

