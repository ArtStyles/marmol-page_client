'use client'

import { useEffect, useState } from 'react'
import { getProductos } from '@/lib/resources-api'
import type { Producto } from '@/lib/types'

const normalizeEstadoInventario = (estado: unknown): Producto['estado'] => {
  if (estado === 'Pulido' || estado === 'Picado' || estado === 'Escuadrado') {
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

export function useInventarioStore() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
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
  }, [])

  return {
    productos,
    setProductos,
    loading,
    error,
  }
}
