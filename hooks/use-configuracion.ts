'use client'

import { useEffect, useState } from 'react'
import { configuracionInicial } from '@/lib/data'
import type { ConfiguracionSistema } from '@/lib/types'

const STORAGE_KEY = 'configuracion_sistema'

const mergeConfiguracion = (value: Partial<ConfiguracionSistema>): ConfiguracionSistema => ({
  ...configuracionInicial,
  ...value,
  tarifasGlobales: {
    ...configuracionInicial.tarifasGlobales,
    ...value.tarifasGlobales,
  },
  preciosM2: {
    ...configuracionInicial.preciosM2,
    ...value.preciosM2,
  },
})

const loadConfiguracion = (): ConfiguracionSistema => {
  if (typeof window === 'undefined') {
    return configuracionInicial
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return configuracionInicial
    const parsed = JSON.parse(raw) as Partial<ConfiguracionSistema>
    return mergeConfiguracion(parsed)
  } catch {
    return configuracionInicial
  }
}

const persistConfiguracion = (value: ConfiguracionSistema) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function useConfiguracion() {
  const [config, setConfig] = useState<ConfiguracionSistema>(configuracionInicial)

  useEffect(() => {
    setConfig(loadConfiguracion())
  }, [])

  const saveConfig = (next?: ConfiguracionSistema) => {
    const value = next ?? config
    setConfig(value)
    persistConfiguracion(value)
  }

  const resetConfig = () => {
    setConfig(configuracionInicial)
    persistConfiguracion(configuracionInicial)
  }

  return {
    config,
    setConfig,
    saveConfig,
    resetConfig,
  }
}
