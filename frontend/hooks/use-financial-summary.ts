'use client'

import { useEffect, useState } from 'react'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getFinancialSummary, getGastosSummary } from '@/lib/resources-api'
import type { FinancialSummary } from '@/lib/types'

type SummaryScope = 'finanzas' | 'gastos'

type UseFinancialSummaryOptions = {
  enabled?: boolean
  scope?: SummaryScope
}

const readSessionUser = (): AdminUser | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    return null
  }
}

export function useFinancialSummary(options: UseFinancialSummaryOptions = {}) {
  const enabled = options.enabled ?? true
  const scope = options.scope ?? 'finanzas'
  const [reloadVersion, setReloadVersion] = useState(0)
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!enabled) {
        if (!active) return
        setSummary(null)
        setError(null)
        setLoading(false)
        return
      }

      const sessionUser = readSessionUser()
      const requiredPermission = scope === 'gastos' ? 'gastos:read' : 'finanzas:read'
      if (!hasPermission(sessionUser, requiredPermission)) {
        if (!active) return
        setSummary(null)
        setError(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = scope === 'gastos' ? await getGastosSummary() : await getFinancialSummary()
        if (!active) return
        setSummary(data)
      } catch (loadError) {
        if (!active) return
        setSummary(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar el resumen financiero.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [enabled, scope, reloadVersion])

  return {
    summary,
    loading,
    error,
    reload: () => setReloadVersion((current) => current + 1),
  }
}
