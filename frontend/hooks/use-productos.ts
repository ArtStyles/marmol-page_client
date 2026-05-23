'use client'

import { useCallback, useEffect, useState } from 'react'
import { getProductos } from '@/lib/resources-api'
import type { Producto } from '@/lib/types'

export function useProductosStore() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProductos()
      setProductos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar los productos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { productos, setProductos, loading, error, reload: load }
}
