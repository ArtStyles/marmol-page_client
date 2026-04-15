'use client'

import { useEffect, useState } from 'react'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getConfiguracion, updateConfiguracion } from '@/lib/resources-api'
import type { ConfiguracionSistema } from '@/lib/types'

const emptyConfiguracion: ConfiguracionSistema = {
  tarifasGlobales: {
    picar: 0,
    devastar: 0,
    pulir: 0,
    escuadrar: 0,
    resinar: 0,
  },
  monoHiloGrosorDiscoMm: 8,
  monoHiloEspesorLosaCm: 3,
  salariosFijosPorRol: {
    Administrador: 0,
    'Gestor de Ventas': 0,
    'Jefe de Almacen': 0,
    'Jefe de Turno de Produccion': 0,
    'Jefe de Turno de ProducciÃ³n': 0,
    'Jefe de Turno de Producción': 0,
    'Jefe de Turno de ProducciÃƒÂ³n': 0,
  },
  preciosM2: {
    '40x40': { crudo: 0, pulido: 0 },
    '60x40': { crudo: 0, pulido: 0 },
    '80x40': { crudo: 0, pulido: 0 },
  },
  nombreEmpresa: '',
  email: '',
  telefono: '',
  direccion: '',
  notificacionesEmail: false,
  alertasStockBajo: false,
  reportesVentas: false,
}

const mergeConfiguracion = (value: Partial<ConfiguracionSistema>): ConfiguracionSistema => ({
  ...emptyConfiguracion,
  ...value,
  tarifasGlobales: {
    ...emptyConfiguracion.tarifasGlobales,
    ...value.tarifasGlobales,
  },
  salariosFijosPorRol: {
    ...emptyConfiguracion.salariosFijosPorRol,
    ...value.salariosFijosPorRol,
  },
  preciosM2: {
    ...emptyConfiguracion.preciosM2,
    ...value.preciosM2,
  },
  monoHiloGrosorDiscoMm: value.monoHiloGrosorDiscoMm ?? emptyConfiguracion.monoHiloGrosorDiscoMm,
  monoHiloEspesorLosaCm: value.monoHiloEspesorLosaCm ?? emptyConfiguracion.monoHiloEspesorLosaCm,
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

type UseConfiguracionOptions = {
  enabled?: boolean
}

export function useConfiguracion(options: UseConfiguracionOptions = {}) {
  const enabled = options.enabled ?? true
  const [config, setConfig] = useState<ConfiguracionSistema>(emptyConfiguracion)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!enabled) {
        if (!active) return
        setConfig(emptyConfiguracion)
        setError(null)
        setLoading(false)
        return
      }

      const sessionUser = readSessionUser()
      const canReadConfiguracion = hasPermission(sessionUser, 'configuracion:read')
      if (!canReadConfiguracion) {
        if (!active) return
        setConfig(emptyConfiguracion)
        setError(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const fromApi = await getConfiguracion()
        if (!active) return
        setConfig(mergeConfiguracion(fromApi))
      } catch {
        if (!active) return
        setConfig(emptyConfiguracion)
        setError('No se pudo cargar la configuracion desde el backend.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [enabled])

  const saveConfig = async (next?: ConfiguracionSistema): Promise<boolean> => {
    const sessionUser = readSessionUser()
    if (!hasPermission(sessionUser, 'configuracion:write')) {
      setError('No tienes permisos para editar la configuracion.')
      return false
    }

    const value = next ?? config
    setConfig(value)
    try {
      setError(null)
      const updated = await updateConfiguracion(value)
      setConfig(mergeConfiguracion(updated))
      return true
    } catch {
      setError('No se pudo guardar la configuracion en el backend.')
      return false
    }
  }

  const resetConfig = async (): Promise<boolean> => {
    const sessionUser = readSessionUser()
    if (!hasPermission(sessionUser, 'configuracion:write')) {
      setError('No tienes permisos para restablecer la configuracion.')
      return false
    }

    setConfig(emptyConfiguracion)
    try {
      setError(null)
      const updated = await updateConfiguracion(emptyConfiguracion)
      setConfig(mergeConfiguracion(updated))
      return true
    } catch {
      setError('No se pudo restablecer la configuracion en el backend.')
      return false
    }
  }

  return {
    config,
    setConfig,
    saveConfig,
    resetConfig,
    loading,
    error,
  }
}
