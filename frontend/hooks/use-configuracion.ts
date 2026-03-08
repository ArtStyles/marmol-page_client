'use client'

import { useEffect, useState } from 'react'
import { configuracionInicial } from '@/lib/data'
import { getConfiguracion, updateConfiguracion } from '@/lib/resources-api'
import type { ConfiguracionSistema } from '@/lib/types'

const mergeConfiguracion = (value: Partial<ConfiguracionSistema>): ConfiguracionSistema => ({
  ...configuracionInicial,
  ...value,
  tarifasGlobales: {
    ...configuracionInicial.tarifasGlobales,
    ...value.tarifasGlobales,
  },
  salariosFijosPorRol: {
    ...configuracionInicial.salariosFijosPorRol,
    ...value.salariosFijosPorRol,
  },
  preciosM2: {
    ...configuracionInicial.preciosM2,
    ...value.preciosM2,
  },
})

export function useConfiguracion() {
  const [config, setConfig] = useState<ConfiguracionSistema>(configuracionInicial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const fromApi = await getConfiguracion()
        if (!active) return
        setConfig(mergeConfiguracion(fromApi))
      } catch {
        if (!active) return
        setConfig(configuracionInicial)
        setError('No se pudo cargar la configuracion desde el backend.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const saveConfig = async (next?: ConfiguracionSistema) => {
    const value = next ?? config
    setConfig(value)
    try {
      setError(null)
      const updated = await updateConfiguracion(value)
      setConfig(mergeConfiguracion(updated))
    } catch {
      setError('No se pudo guardar la configuracion en el backend.')
    }
  }

  const resetConfig = async () => {
    setConfig(configuracionInicial)
    try {
      setError(null)
      const updated = await updateConfiguracion(configuracionInicial)
      setConfig(mergeConfiguracion(updated))
    } catch {
      setError('No se pudo restablecer la configuracion en el backend.')
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

