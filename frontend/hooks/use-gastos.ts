'use client'

import { useEffect, useState } from 'react'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { createGasto, getGastos } from '@/lib/resources-api'

export const gastoTipos = [
  'Materia prima',
  'Transporte',
  'Servicios',
  'Mantenimiento',
  'Nomina',
  'Operacion',
  'Imprevisto',
] as const

export const gastoFlujos = [
  'Produccion',
  'Inventario',
  'Ventas',
  'Administracion',
  'General',
] as const

export type GastoTipo = (typeof gastoTipos)[number]
export type GastoFlujo = (typeof gastoFlujos)[number]

export type GastoRegistro = {
  id: string
  fecha: string
  costo: number
  tipo: GastoTipo
  flujo: GastoFlujo
  descripcion: string
  encargado: string
}

const isGastoTipo = (value: unknown): value is GastoTipo =>
  typeof value === 'string' && gastoTipos.includes(value as GastoTipo)

const isGastoFlujo = (value: unknown): value is GastoFlujo =>
  typeof value === 'string' && gastoFlujos.includes(value as GastoFlujo)

const normalizeGasto = (item: Partial<GastoRegistro>, index: number): GastoRegistro => ({
  id: typeof item.id === 'string' && item.id.length > 0 ? item.id : `G${String(index + 1).padStart(3, '0')}`,
  fecha: typeof item.fecha === 'string' && item.fecha.length > 0 ? item.fecha : new Date().toISOString().split('T')[0],
  costo: typeof item.costo === 'number' && Number.isFinite(item.costo) ? item.costo : 0,
  tipo: isGastoTipo(item.tipo) ? item.tipo : 'Operacion',
  flujo: isGastoFlujo(item.flujo) ? item.flujo : 'General',
  descripcion: typeof item.descripcion === 'string' ? item.descripcion : '',
  encargado: typeof item.encargado === 'string' ? item.encargado : 'Sin responsable',
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
      const canReadGastos = hasPermission(sessionUser, 'gastos:read')
      if (!canReadGastos) {
        if (!active) return
        setGastos([])
        setError(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const items = await getGastos()
        if (!active) return
        setGastos(items.map((item, index) => normalizeGasto(item, index)))
      } catch {
        if (!active) return
        setGastos([])
        setError('No se pudo cargar gastos desde el backend.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [enabled])

  const addGasto = async (input: Omit<GastoRegistro, 'id'>): Promise<boolean> => {
    const sessionUser = readSessionUser()
    if (!hasPermission(sessionUser, 'gastos:write')) {
      setError('No tienes permisos para registrar gastos.')
      return false
    }

    try {
      setError(null)
      const created = await createGasto(input)
      setGastos((prev) => [normalizeGasto(created, prev.length), ...prev])
      return true
    } catch {
      setError('No se pudo guardar el gasto en el backend.')
      return false
    }
  }

  return {
    gastos,
    setGastos,
    addGasto,
    loading,
    error,
  }
}
