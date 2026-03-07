'use client'

import { useEffect, useRef, useState } from 'react'
import { produccionDiaria as initialProduccion } from '@/lib/data'
import type { ProduccionDiaria } from '@/lib/types'

const STORAGE_KEY = 'admin_produccion_diaria'

const loadProduccion = (): ProduccionDiaria[] => {
  if (typeof window === 'undefined') {
    return initialProduccion
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialProduccion
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ProduccionDiaria[]) : initialProduccion
  } catch {
    return initialProduccion
  }
}

const persistProduccion = (value: ProduccionDiaria[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function useProduccionStore() {
  const [produccion, setProduccion] = useState<ProduccionDiaria[]>(initialProduccion)
  const hasLoaded = useRef(false)

  useEffect(() => {
    setProduccion(loadProduccion())
    hasLoaded.current = true
  }, [])

  useEffect(() => {
    if (!hasLoaded.current) return
    persistProduccion(produccion)
  }, [produccion])

  return {
    produccion,
    setProduccion,
  }
}
