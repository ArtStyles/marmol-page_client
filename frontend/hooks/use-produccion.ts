'use client'

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import {
  createProduccion,
  deleteProduccion,
  getProduccion,
  updateProduccion,
} from '@/lib/resources-api'
import type { ProduccionDiaria } from '@/lib/types'

const asCreatePayload = (
  item: ProduccionDiaria,
): Omit<ProduccionDiaria, 'id' | 'canEdit' | 'editableUntil'> => ({
  fecha: item.fecha,
  origenId: item.origenId,
  origenNombre: item.origenNombre,
  tipo: item.tipo,
  dimension: item.dimension,
  cantidadPicar: item.cantidadPicar,
  cantidadPulir: item.cantidadPulir,
  cantidadEscuadrar: item.cantidadEscuadrar,
  cantidadDevastar: item.cantidadDevastar,
  cantidadResinar: item.cantidadResinar,
  totalLosas: item.totalLosas,
  totalM2: item.totalM2,
  detallesAcciones: item.detallesAcciones,
})

const asUpdatePayload = (item: ProduccionDiaria): Partial<ProduccionDiaria> => ({
  fecha: item.fecha,
  origenId: item.origenId,
  origenNombre: item.origenNombre,
  tipo: item.tipo,
  dimension: item.dimension,
  cantidadPicar: item.cantidadPicar,
  cantidadPulir: item.cantidadPulir,
  cantidadEscuadrar: item.cantidadEscuadrar,
  cantidadDevastar: item.cantidadDevastar,
  cantidadResinar: item.cantidadResinar,
  totalLosas: item.totalLosas,
  totalM2: item.totalM2,
  detallesAcciones: item.detallesAcciones,
})

const sameProduccion = (a: ProduccionDiaria, b: ProduccionDiaria): boolean =>
  JSON.stringify(asUpdatePayload(a)) === JSON.stringify(asUpdatePayload(b))

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

type UseProduccionStoreOptions = {
  enabled?: boolean
}

export function useProduccionStore(options: UseProduccionStoreOptions = {}) {
  const enabled = options.enabled ?? true
  const [produccion, setProduccionState] = useState<ProduccionDiaria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const syncQueueRef = useRef(Promise.resolve())
  const hasHydratedRef = useRef(false)
  const previousProduccionRef = useRef<ProduccionDiaria[]>([])
  const skipNextSyncRef = useRef(false)

  const loadProduccion = useCallback(async () => {
    if (!enabled) {
      if (!mountedRef.current) return
      previousProduccionRef.current = []
      skipNextSyncRef.current = true
      setProduccionState([])
      setError(null)
      hasHydratedRef.current = true
      setLoading(false)
      return
    }

    const sessionUser = readSessionUser()
    const canReadProduccion = hasPermission(sessionUser, 'produccion:read')
    if (!canReadProduccion) {
      if (!mountedRef.current) return
      previousProduccionRef.current = []
      skipNextSyncRef.current = true
      setProduccionState([])
      setError(null)
      hasHydratedRef.current = true
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const items = await getProduccion()
      if (!mountedRef.current) return
      previousProduccionRef.current = items
      skipNextSyncRef.current = true
      setProduccionState(items)
    } catch {
      if (!mountedRef.current) return
      setError('No se pudo cargar produccion desde el backend.')
    } finally {
      if (mountedRef.current) {
        hasHydratedRef.current = true
        setLoading(false)
      }
    }
  }, [enabled])

  useEffect(() => {
    mountedRef.current = true
    void loadProduccion()
    return () => {
      mountedRef.current = false
    }
  }, [loadProduccion])

  const syncProduccion = useCallback(async (prev: ProduccionDiaria[], next: ProduccionDiaria[]) => {
    const prevById = new Map(prev.map((item) => [item.id, item]))
    const nextById = new Map(next.map((item) => [item.id, item]))

    const createOps = next.filter((item) => !prevById.has(item.id))
    const updateOps = next.filter((item) => {
      const current = prevById.get(item.id)
      return current ? !sameProduccion(current, item) : false
    })
    const deleteOps = prev.filter((item) => !nextById.has(item.id))

    await Promise.all(
      createOps.map(async (item) => {
        await createProduccion(asCreatePayload(item))
      }),
    )
    await Promise.all(
      updateOps.map(async (item) => {
        await updateProduccion(item.id, asUpdatePayload(item))
      }),
    )
    await Promise.all(
      deleteOps.map(async (item) => {
        await deleteProduccion(item.id)
      }),
    )
  }, [])

  useEffect(() => {
    if (!hasHydratedRef.current) return

    const prev = previousProduccionRef.current
    const next = produccion
    if (prev === next) return

    previousProduccionRef.current = next

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false
      return
    }

    syncQueueRef.current = syncQueueRef.current
      .then(() => syncProduccion(prev, next))
      .catch(() => {
        setError('No se pudo sincronizar produccion con el backend.')
      })
  }, [produccion, syncProduccion])

  const setProduccion = useCallback(
    (value: SetStateAction<ProduccionDiaria[]>) => {
      setProduccionState((prev) => (typeof value === 'function' ? value(prev) : value))
    },
    [],
  )

  const replaceProduccion = useCallback((value: SetStateAction<ProduccionDiaria[]>) => {
    skipNextSyncRef.current = true
    setProduccionState((prev) => (typeof value === 'function' ? value(prev) : value))
  }, [])

  return {
    produccion,
    setProduccion,
    replaceProduccion,
    loading,
    error,
    reload: loadProduccion,
  }
}
