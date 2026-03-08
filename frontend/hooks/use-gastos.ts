'use client'

import { useEffect, useState } from 'react'
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

const initialGastos: GastoRegistro[] = [
  {
    id: 'G001',
    fecha: '2026-02-24',
    costo: 1400,
    tipo: 'Transporte',
    flujo: 'Inventario',
    descripcion: 'Traslado de bloque BL002 desde proveedor principal.',
    encargado: 'Fernando Ruiz',
  },
  {
    id: 'G002',
    fecha: '2026-02-25',
    costo: 950,
    tipo: 'Servicios',
    flujo: 'Produccion',
    descripcion: 'Pago de energia electrica en turno extendido de pulido.',
    encargado: 'Miguel Angel Torres',
  },
  {
    id: 'G003',
    fecha: '2026-02-27',
    costo: 650,
    tipo: 'Mantenimiento',
    flujo: 'Produccion',
    descripcion: 'Cambio de disco y ajuste preventivo de cortadora.',
    encargado: 'Carlos Mendoza',
  },
]

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

const buildNextGastoId = (items: GastoRegistro[]): string => {
  const nextSequence =
    items.reduce((max, item) => {
      const numeric = Number(item.id.replace(/\D/g, ''))
      return Number.isFinite(numeric) ? Math.max(max, numeric) : max
    }, 0) + 1

  return `G${String(nextSequence).padStart(3, '0')}`
}

export function useGastosStore() {
  const [gastos, setGastos] = useState<GastoRegistro[]>(initialGastos)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const items = await getGastos()
        if (!active) return
        setGastos(items.map((item, index) => normalizeGasto(item, index)))
      } catch {
        if (!active) return
        setGastos(initialGastos)
        setError('No se pudo cargar gastos desde el backend.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const addGasto = async (input: Omit<GastoRegistro, 'id'>) => {
    try {
      setError(null)
      const created = await createGasto(input)
      setGastos((prev) => [normalizeGasto(created, prev.length), ...prev])
    } catch {
      const fallbackId = buildNextGastoId(gastos)
      setGastos((prev) => [{ ...input, id: fallbackId }, ...prev])
      setError('No se pudo guardar el gasto en el backend.')
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
