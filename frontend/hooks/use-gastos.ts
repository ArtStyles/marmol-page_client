'use client'

import { useEffect, useState } from 'react'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { cancelGasto as cancelGastoRequest, createGasto, getGastos } from '@/lib/resources-api'
import {
  GASTO_FLUJOS,
  GASTO_TIPOS,
  GASTO_TIPOS_MANUALES,
  type Gasto,
  type GastoFlujo,
  type GastoManualTipo,
  type GastoOrigen,
  type GastoOrigenModulo,
  type GastoTipo,
} from '@/lib/types'

const GASTO_ORIGENES: GastoOrigen[] = ['manual', 'sistema']
const GASTO_ORIGEN_MODULOS: GastoOrigenModulo[] = ['gastos', 'bloques', 'pagos']

const isGastoOrigen = (value: unknown): value is GastoOrigen =>
  typeof value === 'string' && GASTO_ORIGENES.includes(value as GastoOrigen)

const isGastoOrigenModulo = (value: unknown): value is GastoOrigenModulo =>
  typeof value === 'string' && GASTO_ORIGEN_MODULOS.includes(value as GastoOrigenModulo)

export const gastoTipos = [...GASTO_TIPOS]
export const gastoTiposManuales = [...GASTO_TIPOS_MANUALES]
export const gastoFlujos = [...GASTO_FLUJOS]

export type GastoRegistro = Gasto

const isGastoTipo = (value: unknown): value is GastoTipo =>
  typeof value === 'string' && gastoTipos.includes(value as GastoTipo)

const isGastoFlujo = (value: unknown): value is GastoFlujo =>
  typeof value === 'string' && gastoFlujos.includes(value as GastoFlujo)

const normalizeGasto = (item: Gasto): GastoRegistro => {
  if (typeof item.id !== 'string' || item.id.trim().length === 0) {
    throw new Error('Gasto sin identificador valido.')
  }
  if (typeof item.fecha !== 'string' || item.fecha.trim().length === 0) {
    throw new Error(`Gasto ${item.id} sin fecha valida.`)
  }
  if (!Number.isFinite(item.costo)) {
    throw new Error(`Gasto ${item.id} sin costo valido.`)
  }
  if (!isGastoTipo(item.tipo)) {
    throw new Error(`Gasto ${item.id} con tipo invalido.`)
  }
  if (!isGastoFlujo(item.flujo)) {
    throw new Error(`Gasto ${item.id} con flujo invalido.`)
  }
  if (typeof item.descripcion !== 'string' || item.descripcion.trim().length === 0) {
    throw new Error(`Gasto ${item.id} sin descripcion valida.`)
  }
  if (typeof item.encargado !== 'string' || item.encargado.trim().length === 0) {
    throw new Error(`Gasto ${item.id} sin encargado valido.`)
  }

  return {
    ...item,
    id: item.id.trim(),
    fecha: item.fecha.trim(),
    costo: Number(item.costo.toFixed(2)),
    descripcion: item.descripcion.trim(),
    encargado: item.encargado.trim(),
    createdAt: item.createdAt?.trim() || undefined,
    referenciaId: item.referenciaId?.trim() || undefined,
    creadoPorId: item.creadoPorId?.trim() || undefined,
    creadoPorNombre: item.creadoPorNombre?.trim() || undefined,
    anuladoPorId: item.anuladoPorId?.trim() || undefined,
    anuladoPorNombre: item.anuladoPorNombre?.trim() || undefined,
    anuladoFecha: item.anuladoFecha?.trim() || undefined,
    motivoAnulacion: item.motivoAnulacion?.trim() || undefined,
    origen: isGastoOrigen(item.origen) ? item.origen : (() => { throw new Error(`Gasto ${item.id} con origen invalido: ${String(item.origen)}`) })(),
    origenModulo: isGastoOrigenModulo(item.origenModulo) ? item.origenModulo : (() => { throw new Error(`Gasto ${item.id} con origenModulo invalido: ${String(item.origenModulo)}`) })(),
    estado: item.estado ?? 'activo',
  }
}

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

type UseGastosStoreOptions = {
  enabled?: boolean
}

export function useGastosStore(options: UseGastosStoreOptions = {}) {
  const enabled = options.enabled ?? true
  const [gastos, setGastos] = useState<GastoRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!enabled) {
        if (!active) return
        setGastos([])
        setError(null)
        setLoading(false)
        return
      }

      const sessionUser = readSessionUser()
      if (!hasPermission(sessionUser, 'gastos:read')) {
        if (!active) return
        setGastos([])
        setError('Sin permiso para ver gastos.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const items = await getGastos()
        if (!active) return
        setGastos(items.map((item) => normalizeGasto(item)))
      } catch (loadError) {
        if (!active) return
        setGastos([])
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar gastos desde el backend.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [enabled])

  const addGasto = async (
    input: Pick<GastoRegistro, 'fecha' | 'costo' | 'tipo' | 'flujo' | 'descripcion' | 'encargado'>,
  ): Promise<boolean> => {
    const sessionUser = readSessionUser()
    if (!hasPermission(sessionUser, 'gastos:write')) {
      setError('No tienes permisos para registrar gastos.')
      return false
    }

    try {
      setError(null)
      const created = await createGasto(input)
      setGastos((prev) => [normalizeGasto(created), ...prev])
      return true
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar el gasto en el backend.',
      )
      return false
    }
  }

  const cancelGasto = async (gastoId: string, motivoAnulacion: string): Promise<boolean> => {
    const sessionUser = readSessionUser()
    if (!hasPermission(sessionUser, 'gastos:write')) {
      setError('No tienes permisos para reversar gastos.')
      return false
    }

    try {
      setError(null)
      const updated = await cancelGastoRequest(gastoId, { motivoAnulacion })
      setGastos((prev) =>
        prev.map((item) => (item.id === gastoId ? normalizeGasto(updated) : item)),
      )
      return true
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo reversar el gasto en el backend.',
      )
      return false
    }
  }

  return {
    gastos,
    setGastos,
    addGasto,
    cancelGasto,
    loading,
    error,
  }
}

export type { GastoFlujo, GastoManualTipo, GastoTipo }
