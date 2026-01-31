'use client'

import { useEffect, useRef, useState } from 'react'
import { productos as initialProductos } from '@/lib/data'
import type { Producto } from '@/lib/types'

const STORAGE_KEY = 'catalogo_productos'

const loadProductos = (): Producto[] => {
  if (typeof window === 'undefined') {
    return initialProductos
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialProductos
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Producto[]) : initialProductos
  } catch {
    return initialProductos
  }
}

const persistProductos = (value: Producto[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function useProductosStore() {
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
