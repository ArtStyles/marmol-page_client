'use client'

import { useEffect, useMemo, useState } from 'react'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { useProduccionStore } from '@/hooks/use-produccion'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getTrabajadores } from '@/lib/resources-api'
import type { AccionLosa, Trabajador } from '@/lib/types'
import { actionSortIndex, buildAsignacionesFromProduccion, createResumenAcciones } from '../lib/asignaciones-helpers'
import type { AccionResumen, ProduccionWorkerGroup, TopTrabajadorResumen } from '../model/types'

export const useAsignacionesPageState = () => {
  const { produccion } = useProduccionStore()
  const { config } = useConfiguracion()
  const [trabajadoresBase, setTrabajadoresBase] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        let sessionUser: AdminUser | null = null
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
          if (raw) {
            try {
              sessionUser = JSON.parse(raw) as AdminUser
            } catch {
              window.localStorage.removeItem(ADMIN_STORAGE_KEY)
            }
          }
        }

        const canReadTrabajadores = hasPermission(sessionUser, 'trabajadores:read')
        if (!canReadTrabajadores) {
          if (!alive) return
          setTrabajadoresBase([])
          return
        }

        const data = await getTrabajadores()
        if (!alive) return
        setTrabajadoresBase(data)
      } catch (loadError) {
        if (!alive) return
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar trabajadores.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const trabajadoresPorId = useMemo(
    () => new Map<string, Trabajador>(trabajadoresBase.map((trabajador) => [trabajador.id, trabajador])),
    [trabajadoresBase],
  )

  const asignaciones = useMemo(
    () => buildAsignacionesFromProduccion(produccion, config.tarifasGlobales, trabajadoresPorId),
    [produccion, config.tarifasGlobales, trabajadoresPorId],
  )

  const filteredAsignaciones = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()
    if (!query) return asignaciones

    return asignaciones.filter((item) => {
      return (
        item.trabajadorNombre.toLowerCase().includes(query) ||
        item.origenNombre.toLowerCase().includes(query) ||
        item.accion.toLowerCase().includes(query) ||
        item.equipoNombre.toLowerCase().includes(query) ||
        item.fecha.includes(query)
      )
    })
  }, [asignaciones, searchTerm])

  const fechaReferencia = asignaciones[0]?.fecha ?? new Date().toISOString().split('T')[0]

  const asignacionesReferencia = useMemo(
    () => asignaciones.filter((item) => item.fecha === fechaReferencia),
    [asignaciones, fechaReferencia],
  )

  const trabajadoresActivos = useMemo(
    () =>
      new Set(
        asignacionesReferencia
          .filter((item) => item.trabajadorId !== 'sin-asignar')
          .map((item) => item.trabajadorId),
      ).size,
    [asignacionesReferencia],
  )

  const resumenAcciones = useMemo(() => {
    return asignacionesReferencia.reduce<Record<AccionLosa, AccionResumen>>(
      (acc, item) => {
        acc[item.accion].losas += item.cantidadLosas
        acc[item.accion].m2 += item.totalM2
        acc[item.accion].pago += item.pagoEstimado
        return acc
      },
      createResumenAcciones(),
    )
  }, [asignacionesReferencia])

  const topTrabajadores = useMemo(() => {
    const grouped = asignacionesReferencia.reduce<Record<string, TopTrabajadorResumen>>(
      (acc, item) => {
        if (!acc[item.trabajadorId]) {
          acc[item.trabajadorId] = { nombre: item.trabajadorNombre, m2: 0, pago: 0 }
        }
        acc[item.trabajadorId].m2 += item.totalM2
        acc[item.trabajadorId].pago += item.pagoEstimado
        return acc
      },
      {},
    )

    return Object.values(grouped)
      .sort((a, b) => b.pago - a.pago)
      .slice(0, 3)
  }, [asignacionesReferencia])

  const groupedAsignaciones = useMemo(() => {
    const grouped = filteredAsignaciones.reduce<ProduccionWorkerGroup[]>((acc, item) => {
      let worker = acc.find((entry) => entry.trabajadorId === item.trabajadorId)

      if (!worker) {
        worker = {
          trabajadorId: item.trabajadorId,
          trabajadorNombre: item.trabajadorNombre,
          lotes: [],
          resumenAcciones: createResumenAcciones(),
          totalPagoEstimado: 0,
        }
        acc.push(worker)
      }

      worker.resumenAcciones[item.accion].losas += item.cantidadLosas
      worker.resumenAcciones[item.accion].m2 += item.totalM2
      worker.resumenAcciones[item.accion].pago += item.pagoEstimado
      worker.totalPagoEstimado += item.pagoEstimado

      let lote = worker.lotes.find((entry) => entry.origenId === item.origenId)
      if (!lote) {
        lote = {
          origenId: item.origenId,
          origenNombre: item.origenNombre,
          items: [],
        }
        worker.lotes.push(lote)
      }

      lote.items.push(item)

      return acc
    }, [])

    return grouped
      .map((worker) => ({
        ...worker,
        lotes: worker.lotes
          .map((lote) => ({
            ...lote,
            items: [...lote.items].sort((a, b) => {
              const dateDiff = b.fecha.localeCompare(a.fecha)
              if (dateDiff !== 0) return dateDiff

              const actionDiff = actionSortIndex(a.accion) - actionSortIndex(b.accion)
              if (actionDiff !== 0) return actionDiff

              return a.equipoNombre.localeCompare(b.equipoNombre)
            }),
          }))
          .sort((a, b) => a.origenNombre.localeCompare(b.origenNombre)),
      }))
      .sort((a, b) => a.trabajadorNombre.localeCompare(b.trabajadorNombre))
  }, [filteredAsignaciones])

  const totalPagoReferencia = useMemo(
    () => asignacionesReferencia.reduce((sum, item) => sum + item.pagoEstimado, 0),
    [asignacionesReferencia],
  )

  return {
    asignaciones,
    asignacionesReferencia,
    error,
    fechaReferencia,
    groupedAsignaciones,
    loading,
    resumenAcciones,
    searchTerm,
    setSearchTerm,
    topTrabajadores,
    totalPagoReferencia,
    trabajadoresActivos,
  }
}
