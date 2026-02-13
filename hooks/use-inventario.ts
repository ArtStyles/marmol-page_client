'use client'

import { useEffect, useRef, useState } from 'react'
import { productos as initialProductos } from '@/lib/data'
import type { Producto } from '@/lib/types'

const STORAGE_KEY = 'admin_inventario_productos'

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
})

const loadProductos = (): Producto[] => {
  if (typeof window === 'undefined') {
    return initialProductos
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialProductos
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Producto[]).map(normalizeProducto) : initialProductos
  } catch {
    return initialProductos
  }
}

const persistProductos = (value: Producto[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function useInventarioStore() {
  const [productos, setProductos] = useState<Producto[]>(initialProductos)
  const hasLoaded = useRef(false)

  useEffect(() => {
    setProductos(loadProductos())
    hasLoaded.current = true
  }, [])

  useEffect(() => {
    if (!hasLoaded.current) return
    persistProductos(productos)
  }, [productos])

  return {
    productos,
    setProductos,
  }
}
