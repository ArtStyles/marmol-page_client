'use client'

import { useCallback, useEffect, useState } from 'react'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getProductos } from '@/lib/resources-api'
import type { Producto } from '@/lib/types'

const normalizeEstadoInventario = (estado: unknown): Producto['estado'] => {
  if (
    estado === 'Pulido' ||
    estado === 'Picado' ||
    estado === 'Escuadrado' ||
    estado === 'Devastado' ||
    estado === 'Resinado'
  ) {
    return estado
  }

  // Compatibilidad con datos persistidos antes del cambio de estados.
  if (estado === 'Crudo') {
    return 'Picado'
  }

  return 'Picado'
}

const normalizeProducto = (item: Producto): Producto => ({
  ...item,
  estado: normalizeEstadoInventario((item as { estado?: unknown }).estado),
  ubicacion: item.ubicacion === 'proceso' ? 'proceso' : 'almacen',
})

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

type UseInventarioStoreOptions = {
  enabled?: boolean
}

export function useInventarioStore(options: UseInventarioStoreOptions = {}) {
  const enabled = options.enabled ?? true
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(async () => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!enabled) {
        if (!active) return
        setProductos([])
        setError(null)
        setLoading(false)
        return
      }

      const sessionUser = readSessionUser()
      if (!hasPermission(sessionUser, 'inventario:read')) {
        if (!active) return
        setProductos([])
        setError(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const items = await getProductos()
        if (!active) return
        setProductos(items.map((item) => normalizeProducto(item)))
      } catch {
        if (!active) return
        setError('No se pudo cargar el inventario desde el backend.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [enabled, reloadKey])

  return {
    productos,
    setProductos,
    loading,
    error,
    reload,
  }
}
