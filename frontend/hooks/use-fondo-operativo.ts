'use client'

import { useCallback, useEffect, useState } from 'react'
import { getFondoActual, setFondoOperativo } from '@/lib/resources-api'
import type { FondoOperativoResponse } from '@/lib/types'

export function useFondoOperativo() {
  const [fondo, setFondo] = useState<FondoOperativoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getFondoActual()
      setFondo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el fondo operativo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const actualizarFondo = async (fondoInicial: number): Promise<boolean> => {
    const periodo = new Date().toISOString().slice(0, 7)
    try {
      setError(null)
      const data = await setFondoOperativo({ periodo, fondoInicial })
      setFondo(data)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el fondo operativo.')
      return false
    }
  }

  return { fondo, loading, error, reload: load, actualizarFondo }
}
