'use client'

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { produccionDiaria as initialProduccion } from '@/lib/data'
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
  totalLosas: item.totalLosas,
  totalM2: item.totalM2,
  detallesAcciones: item.detallesAcciones,
})

const sameProduccion = (a: ProduccionDiaria, b: ProduccionDiaria): boolean =>
  JSON.stringify(asUpdatePayload(a)) === JSON.stringify(asUpdatePayload(b))

export function useProduccionStore() {
  const [produccion, setProduccionState] = useState<ProduccionDiaria[]>(initialProduccion)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const syncQueueRef = useRef(Promise.resolve())
  const hasHydratedRef = useRef(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const items = await getProduccion()
        if (!active) return
        setProduccionState(items)
      } catch {
        if (!active) return
        setProduccionState(initialProduccion)
        setError('No se pudo cargar produccion desde el backend.')
      } finally {
        if (active) {
          hasHydratedRef.current = true
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

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

  const setProduccion = useCallback(
    (value: SetStateAction<ProduccionDiaria[]>) => {
      setProduccionState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value

        if (hasHydratedRef.current) {
          syncQueueRef.current = syncQueueRef.current
            .then(() => syncProduccion(prev, next))
            .catch(() => {
              setError('No se pudo sincronizar produccion con el backend.')
            })
        }

        return next
      })
    },
    [syncProduccion],
  )

  return {
    produccion,
    setProduccion,
    loading,
    error,
  }
}
