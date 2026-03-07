'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { bloquesYLotes, equipos, trabajadores } from '@/lib/data'
import { useProduccionStore } from '@/hooks/use-produccion'
import {
  losasAMetros,
  TIPO_EQUIPO_POR_ACCION,
  type AccionLosa,
  type Dimension,
  type ProduccionDetalleAccion,
  type ProduccionDiaria,
} from '@/lib/types'
import type { ActionUsageDimensionForm, ActionUsageForm, FormData } from '../model/types'
import {
  actionLabels,
  actionOrder,
  createInitialFormData,
  createUsageDimensionRow,
  createUsageRow,
  getAccionLosas,
  getDetalleMermaLosas,
  getDetalleReutilizableLosas,
  resolveDateEditPolicy,
} from '../lib/produccion-helpers'

export const useProduccionPageState = () => {
  const { produccion, setProduccion } = useProduccionStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState<FormData>(createInitialFormData)

  const trabajadoresActivos = useMemo(
    () => trabajadores.filter((trabajador) => trabajador.estado === 'activo'),
    [],
  )
  const equiposActivos = useMemo(() => equipos.filter((equipo) => equipo.estado === 'activo'), [])

  const filteredProduccion = produccion.filter((registro) => {
    const query = searchTerm.toLowerCase().trim()
    const matchesSearch =
      registro.fecha.toLowerCase().includes(query) ||
      registro.origenNombre.toLowerCase().includes(query) ||
      registro.tipo.toLowerCase().includes(query) ||
      registro.dimension.toLowerCase().includes(query)
    const matchesDate = !dateFilter || registro.fecha === dateFilter
    return matchesSearch && matchesDate
  })

  const today = new Date().toISOString().split('T')[0]
  const fechaMasReciente = [...new Set(produccion.map((registro) => registro.fecha))]
    .sort((a, b) => b.localeCompare(a))[0] ?? today
  const fechaResumen = dateFilter || fechaMasReciente
  const produccionResumen = produccion.filter((registro) => registro.fecha === fechaResumen)

  const totalM2Resumen = produccionResumen.reduce((sum, item) => sum + item.totalM2, 0)
  const totalLosasResumen = produccionResumen.reduce((sum, item) => sum + item.totalLosas, 0)
  const origenesActivosResumen = new Set(produccionResumen.map((item) => item.origenId)).size

  const resumenAcciones = produccionResumen.reduce<Record<AccionLosa, number>>(
    (acc, item) => {
      acc.picar += losasAMetros(getAccionLosas(item, 'picar'), item.dimension)
      acc.pulir += losasAMetros(getAccionLosas(item, 'pulir'), item.dimension)
      acc.escuadrar += losasAMetros(getAccionLosas(item, 'escuadrar'), item.dimension)
      return acc
    },
    { picar: 0, pulir: 0, escuadrar: 0 },
  )

  const topOrigenesResumen = [...produccionResumen]
    .sort((a, b) => b.totalM2 - a.totalM2)
    .slice(0, 3)

  const resumenPartidas = useMemo(() => {
    return produccionResumen.reduce(
      (acc, item) => {
        const detalles = item.detallesAcciones ?? []

        detalles.forEach((detalle) => {
          const mermaLosas = getDetalleMermaLosas(detalle)
          const reutilizableLosas = getDetalleReutilizableLosas(detalle)

          acc.mermaLosas += mermaLosas
          acc.mermaM2 +=
            (detalle.metrosMermaTotal ?? 0) > 0
              ? detalle.metrosMermaTotal ?? 0
              : losasAMetros(mermaLosas, item.dimension)

          acc.reutilizableLosas += reutilizableLosas
          acc.reutilizableM2 +=
            (detalle.metrosReutilizables ?? 0) > 0
              ? detalle.metrosReutilizables ?? 0
              : losasAMetros(reutilizableLosas, item.dimension)
        })

        return acc
      },
      { mermaLosas: 0, mermaM2: 0, reutilizableLosas: 0, reutilizableM2: 0 },
    )
  }, [produccionResumen])

  const dateEditPolicy = useMemo(
    () => resolveDateEditPolicy(produccion, formData.fecha),
    [produccion, formData.fecha],
  )

  const groupedByDate = filteredProduccion.reduce<Record<string, ProduccionDiaria[]>>((acc, item) => {
    if (!acc[item.fecha]) {
      acc[item.fecha] = []
    }
    acc[item.fecha].push(item)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const prepareNewForm = () => {
    setFormData(createInitialFormData())
    setFormError('')
  }

  const resetFormAndClose = () => {
    prepareNewForm()
    setIsDialogOpen(false)
  }

  const getUsageLosas = (uso: ActionUsageForm): number =>
    uso.dimensiones.reduce((sum, dimensionUso) => sum + dimensionUso.cantidadLosas, 0)

  const updateUsage = (
    accion: AccionLosa,
    usageId: string,
    patch: Partial<ActionUsageForm>,
  ) => {
    setFormData((prev) => {
      const usosActualizados = prev.acciones[accion].usos.map((uso) =>
        uso.id === usageId ? { ...uso, ...patch } : uso,
      )
      const cantidadLosas = usosActualizados.reduce((sum, uso) => sum + getUsageLosas(uso), 0)

      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosActualizados,
            cantidadLosas,
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const updateUsageDimension = (
    accion: AccionLosa,
    usageId: string,
    dimensionUsageId: string,
    patch: Partial<ActionUsageDimensionForm>,
  ) => {
    setFormData((prev) => {
      const usosActualizados = prev.acciones[accion].usos.map((uso) => {
        if (uso.id !== usageId) return uso

        return {
          ...uso,
          dimensiones: uso.dimensiones.map((dimensionUso) =>
            dimensionUso.id === dimensionUsageId ? { ...dimensionUso, ...patch } : dimensionUso,
          ),
        }
      })
      const cantidadLosas = usosActualizados.reduce((sum, uso) => sum + getUsageLosas(uso), 0)

      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosActualizados,
            cantidadLosas,
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const toggleUsageDimension = (
    accion: AccionLosa,
    usageId: string,
    dimension: Dimension,
    enabled: boolean,
  ) => {
    setFormData((prev) => {
      const usosActualizados = prev.acciones[accion].usos.map((uso) => {
        if (uso.id !== usageId) return uso

        const alreadyExists = uso.dimensiones.some((dimensionUso) => dimensionUso.dimension === dimension)

        if (enabled && !alreadyExists) {
          return {
            ...uso,
            dimensiones: [...uso.dimensiones, createUsageDimensionRow(dimension)],
          }
        }

        if (!enabled && alreadyExists) {
          return {
            ...uso,
            dimensiones: uso.dimensiones.filter((dimensionUso) => dimensionUso.dimension !== dimension),
          }
        }

        return uso
      })
      const cantidadLosas = usosActualizados.reduce((sum, uso) => sum + getUsageLosas(uso), 0)

      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosActualizados,
            cantidadLosas,
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const addUsage = (accion: AccionLosa) => {
    setFormData((prev) => ({
      ...prev,
      acciones: {
        ...prev.acciones,
        [accion]: {
          ...prev.acciones[accion],
          usos: [...prev.acciones[accion].usos, createUsageRow()],
          cantidadTouched: true,
        },
      },
    }))
  }

  const removeUsage = (accion: AccionLosa, usageId: string) => {
    setFormData((prev) => {
      const usosFiltrados = prev.acciones[accion].usos.filter((uso) => uso.id !== usageId)
      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...prev.acciones[accion],
            usos: usosFiltrados.length > 0 ? usosFiltrados : [createUsageRow()],
            cantidadLosas: usosFiltrados.reduce((sum, uso) => sum + getUsageLosas(uso), 0),
            cantidadTouched: true,
          },
        },
      }
    })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!formData.fecha) {
      setFormError('Selecciona la fecha de produccion.')
      return
    }

    if (formData.fecha > today) {
      setFormError('La fecha de produccion no puede ser futura.')
      return
    }

    if (dateEditPolicy.hasRecords && !dateEditPolicy.canMutate) {
      setFormError(dateEditPolicy.message)
      return
    }

    const workersById = new Map(trabajadoresActivos.map((worker) => [worker.id, worker]))
    const equiposById = new Map(equiposActivos.map((equipo) => [equipo.id, equipo]))
    const origenesById = new Map(bloquesYLotes.map((origen) => [origen.id, origen]))
    const registrosPorCombo = new Map<
      string,
      {
        origenId: string
        origenNombre: string
        tipo: ProduccionDiaria['tipo']
        dimension: ProduccionDiaria['dimension']
        actionTotals: Record<AccionLosa, number>
        detallesAcciones: ProduccionDetalleAccion[]
      }
    >()

    for (const accion of actionOrder) {
      const accionState = formData.acciones[accion]

      const usosCapturados = accionState.usos.filter(
        (uso) =>
          uso.origenId ||
          uso.tipo ||
          uso.trabajadorIds.length > 0 ||
          uso.equipoId ||
          uso.dimensiones.some(
            (dimensionUso) =>
              dimensionUso.cantidadLosas > 0 ||
              dimensionUso.mermaTotalLosas > 0 ||
              dimensionUso.reutilizableLosas > 0,
          ),
      )

      if (usosCapturados.length === 0) {
        continue
      }

      for (const uso of usosCapturados) {
        if (!uso.origenId || !uso.tipo || uso.trabajadorIds.length === 0 || !uso.equipoId) {
          setFormError(
            `Completa bloque/lote, equipo, personal y tipo en ${actionLabels[accion]}.`,
          )
          return
        }

        const trabajadoresEquipo = [...new Set(uso.trabajadorIds)]
          .map((trabajadorId) => workersById.get(trabajadorId))
          .filter((trabajador): trabajador is (typeof trabajadoresActivos)[number] => Boolean(trabajador))

        if (trabajadoresEquipo.length !== new Set(uso.trabajadorIds).size) {
          setFormError('Uno de los trabajadores seleccionados no esta activo.')
          return
        }

        const origen = origenesById.get(uso.origenId)
        if (!origen) {
          setFormError('Uno de los bloques/lotes seleccionados no es valido.')
          return
        }

        const equipo = equiposById.get(uso.equipoId)
        if (!equipo) {
          setFormError('Uno de los equipos seleccionados no esta activo.')
          return
        }

        const tipoEsperado = TIPO_EQUIPO_POR_ACCION[accion]
        if (equipo.tipo !== tipoEsperado) {
          setFormError(`${actionLabels[accion]} solo permite equipos tipo ${tipoEsperado}.`)
          return
        }

        const dimensionesCapturadas = uso.dimensiones.filter(
          (dimensionUso) =>
            dimensionUso.cantidadLosas > 0 ||
            dimensionUso.mermaTotalLosas > 0 ||
            dimensionUso.reutilizableLosas > 0,
        )

        if (dimensionesCapturadas.length === 0) {
          setFormError(`Selecciona al menos una dimension con losas en ${actionLabels[accion]}.`)
          return
        }

        for (const dimensionUso of dimensionesCapturadas) {
          if (!Number.isInteger(dimensionUso.cantidadLosas) || dimensionUso.cantidadLosas <= 0) {
            setFormError(
              `Las losas de ${actionLabels[accion]} en dimension ${dimensionUso.dimension} deben ser enteras y mayores a 0.`,
            )
            return
          }

          if (
            !Number.isInteger(dimensionUso.mermaTotalLosas) ||
            !Number.isInteger(dimensionUso.reutilizableLosas)
          ) {
            setFormError(
              `Merma y reutilizable en ${actionLabels[accion]} (${dimensionUso.dimension}) deben ser numeros enteros.`,
            )
            return
          }

          if (dimensionUso.mermaTotalLosas < 0 || dimensionUso.reutilizableLosas < 0) {
            setFormError(
              `Merma y reutilizable en ${actionLabels[accion]} (${dimensionUso.dimension}) no pueden ser negativos.`,
            )
            return
          }

          if (dimensionUso.mermaTotalLosas + dimensionUso.reutilizableLosas > dimensionUso.cantidadLosas) {
            setFormError(
              `En ${actionLabels[accion]} (${dimensionUso.dimension}) la suma de merma + reutilizable no puede superar las losas procesadas.`,
            )
            return
          }

          const comboKey = `${uso.origenId}::${uso.tipo}::${dimensionUso.dimension}`
          const comboActual =
            registrosPorCombo.get(comboKey) ??
            {
              origenId: uso.origenId,
              origenNombre: origen.nombre,
              tipo: uso.tipo,
              dimension: dimensionUso.dimension,
              actionTotals: {
                picar: 0,
                pulir: 0,
                escuadrar: 0,
              },
              detallesAcciones: [],
            }

          comboActual.actionTotals[accion] += dimensionUso.cantidadLosas

          comboActual.detallesAcciones.push({
            id: `PGA-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
            accion,
            trabajadorId: trabajadoresEquipo[0]?.id,
            trabajadorNombre: trabajadoresEquipo[0]?.nombre,
            trabajadores: trabajadoresEquipo.map((trabajador) => ({
              id: trabajador.id,
              nombre: trabajador.nombre,
            })),
            equipoId: equipo.id,
            equipoNombre: equipo.nombre,
            cantidadLosas: dimensionUso.cantidadLosas,
            metrosCuadrados: losasAMetros(dimensionUso.cantidadLosas, dimensionUso.dimension),
            losasMermaTotal: dimensionUso.mermaTotalLosas,
            metrosMermaTotal: losasAMetros(dimensionUso.mermaTotalLosas, dimensionUso.dimension),
            losasReutilizables: dimensionUso.reutilizableLosas,
            metrosReutilizables: losasAMetros(dimensionUso.reutilizableLosas, dimensionUso.dimension),
          })

          registrosPorCombo.set(comboKey, comboActual)
        }
      }
    }

    if (registrosPorCombo.size === 0) {
      setFormError('Ingresa al menos una cantidad de losas.')
      return
    }

    const fecha = formData.fecha

    setProduccion((prev) => {
      const registrosActualizados = [...prev]
      const registrosNuevos: ProduccionDiaria[] = []
      let maxIdNumber = prev.reduce((maxValue, registro) => {
        const numericId = Number(registro.id.replace(/\D/g, ''))
        if (!Number.isFinite(numericId)) return maxValue
        return Math.max(maxValue, numericId)
      }, 0)

      for (const combo of registrosPorCombo.values()) {
        const cantidadPicar = combo.actionTotals.picar
        const cantidadPulir = combo.actionTotals.pulir
        const cantidadEscuadrar = combo.actionTotals.escuadrar
        const totalLosas = cantidadPicar + cantidadPulir + cantidadEscuadrar

        if (totalLosas <= 0) {
          continue
        }

        const baseRecord: Omit<ProduccionDiaria, 'id'> = {
          fecha,
          origenId: combo.origenId,
          origenNombre: combo.origenNombre,
          tipo: combo.tipo,
          dimension: combo.dimension,
          cantidadPicar,
          cantidadPulir,
          cantidadEscuadrar,
          totalLosas,
          totalM2: losasAMetros(totalLosas, combo.dimension),
          detallesAcciones: combo.detallesAcciones,
        }

        const existingIndex = registrosActualizados.findIndex(
          (registro) =>
            registro.fecha === fecha &&
            registro.origenId === combo.origenId &&
            registro.tipo === combo.tipo &&
            registro.dimension === combo.dimension,
        )

        if (existingIndex === -1) {
          maxIdNumber += 1
          registrosNuevos.push({
            id: `PG${String(maxIdNumber).padStart(3, '0')}`,
            ...baseRecord,
          })
          continue
        }

        const existing = registrosActualizados[existingIndex]
        registrosActualizados[existingIndex] = {
          ...baseRecord,
          id: existing.id,
          canEdit: existing.canEdit,
          editableUntil: existing.editableUntil,
        }
      }

      return [...registrosNuevos, ...registrosActualizados]
    })
    resetFormAndClose()
  }

  const getDatePolicy = (fecha: string) => resolveDateEditPolicy(produccion, fecha)

  return {
    addUsage,
    dateEditPolicy,
    dateFilter,
    equiposActivos,
    fechaResumen,
    fechasOrdenadas,
    formData,
    formError,
    getDatePolicy,
    groupedByDate,
    handleSubmit,
    isDialogOpen,
    origenesActivosResumen,
    prepareNewForm,
    produccion,
    removeUsage,
    resetFormAndClose,
    resumenAcciones,
    resumenPartidas,
    searchTerm,
    setDateFilter,
    setFormData,
    setIsDialogOpen,
    setSearchTerm,
    topOrigenesResumen,
    today,
    totalLosasResumen,
    totalM2Resumen,
    toggleUsageDimension,
    trabajadoresActivos,
    updateUsage,
    updateUsageDimension,
  }
}
