'use client'

import React, { useMemo, useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  bloquesYLotes,
  dimensiones,
  equipos,
  tiposProducto,
  trabajadores,
} from '@/lib/data'
import { useProduccionStore } from '@/hooks/use-produccion'
import {
  losasAMetros,
  TIPO_EQUIPO_POR_ACCION,
  type AccionLosa,
  type Dimension,
  type ProduccionDetalleAccion,
  type ProduccionDiaria,
  type TipoProducto,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Plus, Search, Trash2 } from 'lucide-react'

const actionOrder: AccionLosa[] = ['picar', 'pulir', 'escuadrar']

const actionLabels: Record<AccionLosa, string> = {
  picar: 'Picar',
  pulir: 'Pulir',
  escuadrar: 'Escuadrar',
}

const actionColors: Record<AccionLosa, string> = {
  picar: 'bg-blue-100 text-blue-800',
  pulir: 'bg-green-100 text-green-800',
  escuadrar: 'bg-amber-100 text-amber-800',
}

type ActionUsageForm = {
  id: string
  trabajadorId: string
  equipoId: string
  cantidadLosas: number
  cantidadTouched: boolean
  mermaTotalLosas: number
  mermaTotalTouched: boolean
  reutilizableLosas: number
  reutilizableTouched: boolean
}

type ActionFormState = {
  cantidadLosas: number
  cantidadTouched: boolean
  usos: ActionUsageForm[]
}

type FormData = {
  fecha: string
  origenId: string
  tipo: TipoProducto
  dimension: Dimension
  acciones: Record<AccionLosa, ActionFormState>
}

function createUsageRow(): ActionUsageForm {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    trabajadorId: '',
    equipoId: '',
    cantidadLosas: 0,
    cantidadTouched: false,
    mermaTotalLosas: 0,
    mermaTotalTouched: false,
    reutilizableLosas: 0,
    reutilizableTouched: false,
  }
}

function createActionState(): ActionFormState {
  return {
    cantidadLosas: 0,
    cantidadTouched: false,
    usos: [createUsageRow()],
  }
}

function createInitialFormData(): FormData {
  return {
    fecha: new Date().toISOString().split('T')[0],
    origenId: '',
    tipo: 'Piso',
    dimension: '60x40',
    acciones: {
      picar: createActionState(),
      pulir: createActionState(),
      escuadrar: createActionState(),
    },
  }
}

type DateEditPolicy = {
  hasRecords: boolean
  canMutate: boolean
  message: string
}

function resolveDateEditPolicy(registros: ProduccionDiaria[], fecha: string): DateEditPolicy {
  const registrosFecha = registros.filter((registro) => registro.fecha === fecha)

  if (registrosFecha.length === 0) {
    return {
      hasRecords: false,
      canMutate: true,
      message: 'Fecha sin registros previos. Puedes registrar produccion.',
    }
  }

  const hasApiEditMetadata = registrosFecha.some(
    (registro) =>
      typeof registro.canEdit === 'boolean' ||
      (typeof registro.editableUntil === 'string' && registro.editableUntil.length > 0),
  )

  if (!hasApiEditMetadata) {
    return {
      hasRecords: true,
      canMutate: false,
      message:
        'Fecha ya registrada. Sin metadata de API de ventana de 24h, queda en solo visualizacion.',
    }
  }

  if (registrosFecha.some((registro) => registro.canEdit === true)) {
    return {
      hasRecords: true,
      canMutate: true,
      message: 'Fecha registrada y editable segun API.',
    }
  }

  const editTimestamps = registrosFecha
    .map((registro) => (registro.editableUntil ? Date.parse(registro.editableUntil) : Number.NaN))
    .filter((value) => Number.isFinite(value))
  const now = Date.now()
  const latestEditTimestamp = editTimestamps.length ? Math.max(...editTimestamps) : Number.NaN

  if (Number.isFinite(latestEditTimestamp) && now <= latestEditTimestamp) {
    return {
      hasRecords: true,
      canMutate: true,
      message: `Ventana de edicion activa hasta ${new Date(latestEditTimestamp).toLocaleString()}.`,
    }
  }

  return {
    hasRecords: true,
    canMutate: false,
    message: 'La ventana de edicion de 24h ya expiro para esta fecha.',
  }
}

function buildNextProduccionId(registros: ProduccionDiaria[]): string {
  const maxIdNumber = registros.reduce((maxValue, registro) => {
    const numericId = Number(registro.id.replace(/\D/g, ''))
    if (!Number.isFinite(numericId)) return maxValue
    return Math.max(maxValue, numericId)
  }, 0)

  return `PG${String(maxIdNumber + 1).padStart(3, '0')}`
}

function getLegacyAccionLosas(registro: ProduccionDiaria, accion: AccionLosa): number {
  if (accion === 'picar') return registro.cantidadPicar
  if (accion === 'pulir') return registro.cantidadPulir
  return registro.cantidadEscuadrar
}

function getAccionLosas(registro: ProduccionDiaria, accion: AccionLosa): number {
  const detalles = registro.detallesAcciones?.filter((detalle) => detalle.accion === accion) ?? []
  if (detalles.length > 0) {
    return detalles.reduce((sum, detalle) => sum + detalle.cantidadLosas, 0)
  }
  return getLegacyAccionLosas(registro, accion)
}

function getAccionDetalles(registro: ProduccionDiaria, accion: AccionLosa): ProduccionDetalleAccion[] {
  const detalles = registro.detallesAcciones?.filter((detalle) => detalle.accion === accion) ?? []
  if (detalles.length > 0) {
    return detalles
  }

  const legacyLosas = getLegacyAccionLosas(registro, accion)
  if (legacyLosas <= 0) {
    return []
  }

  return [
    {
      id: `${registro.id}-${accion}`,
      accion,
      trabajadorId: 'legacy',
      trabajadorNombre: 'Sin detalle',
      equipoId: 'legacy',
      equipoNombre: 'Sin equipo',
      cantidadLosas: legacyLosas,
      metrosCuadrados: losasAMetros(legacyLosas, registro.dimension),
      losasMermaTotal: 0,
      metrosMermaTotal: 0,
      losasReutilizables: 0,
      metrosReutilizables: 0,
    },
  ]
}

function getDetalleMermaLosas(detalle: ProduccionDetalleAccion): number {
  return detalle.losasMermaTotal ?? 0
}

function getDetalleReutilizableLosas(detalle: ProduccionDetalleAccion): number {
  return detalle.losasReutilizables ?? 0
}

export default function ProduccionPage() {
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

  const updateActionTotal = (accion: AccionLosa, rawValue: string) => {
    const cantidadTouched = rawValue !== ''
    const parsed = rawValue === '' ? 0 : Number(rawValue)
    const cantidadLosas = Number.isFinite(parsed) ? Math.max(0, parsed) : 0

    setFormData((prev) => {
      const current = prev.acciones[accion]
      return {
        ...prev,
        acciones: {
          ...prev.acciones,
          [accion]: {
            ...current,
            cantidadLosas,
            cantidadTouched,
            usos: cantidadLosas > 0 ? current.usos : [createUsageRow()],
          },
        },
      }
    })
  }

  const updateUsage = (
    accion: AccionLosa,
    usageId: string,
    patch: Partial<ActionUsageForm>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      acciones: {
        ...prev.acciones,
        [accion]: {
          ...prev.acciones[accion],
          usos: prev.acciones[accion].usos.map((uso) =>
            uso.id === usageId ? { ...uso, ...patch } : uso,
          ),
        },
      },
    }))
  }

  const addUsage = (accion: AccionLosa) => {
    setFormData((prev) => ({
      ...prev,
      acciones: {
        ...prev.acciones,
        [accion]: {
          ...prev.acciones[accion],
          usos: [...prev.acciones[accion].usos, createUsageRow()],
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
          },
        },
      }
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.fecha) {
      setFormError('Selecciona la fecha de produccion.')
      return
    }

    if (formData.fecha > today) {
      setFormError('La fecha de produccion no puede ser futura.')
      return
    }

    const origen = bloquesYLotes.find((bloque) => bloque.id === formData.origenId)
    if (!origen) {
      setFormError('Selecciona un bloque o lote de origen.')
      return
    }

    if (dateEditPolicy.hasRecords && !dateEditPolicy.canMutate) {
      setFormError(dateEditPolicy.message)
      return
    }

    const workersById = new Map(trabajadoresActivos.map((worker) => [worker.id, worker]))
    const equiposById = new Map(equiposActivos.map((equipo) => [equipo.id, equipo]))

    const detallesAcciones: ProduccionDetalleAccion[] = []

    for (const accion of actionOrder) {
      const accionState = formData.acciones[accion]
      const totalAccion = accionState.cantidadLosas

      if (totalAccion <= 0) {
        continue
      }

      const usosCapturados = accionState.usos.filter(
        (uso) => uso.trabajadorId || uso.equipoId || uso.cantidadLosas > 0,
      )

      if (usosCapturados.length === 0) {
        setFormError(`Debes agregar al menos una subfila para ${actionLabels[accion]}.`)
        return
      }

      let totalAsignado = 0

      for (const uso of usosCapturados) {
        if (!uso.trabajadorId || !uso.equipoId || uso.cantidadLosas <= 0) {
          setFormError(`Completa trabajador, equipo y losas en ${actionLabels[accion]}.`)
          return
        }

        if (!Number.isInteger(uso.cantidadLosas)) {
          setFormError(`Las losas de ${actionLabels[accion]} deben ser numeros enteros.`)
          return
        }

        if (!Number.isInteger(uso.mermaTotalLosas) || !Number.isInteger(uso.reutilizableLosas)) {
          setFormError(`Merma y reutilizable en ${actionLabels[accion]} deben ser numeros enteros.`)
          return
        }

        if (uso.mermaTotalLosas < 0 || uso.reutilizableLosas < 0) {
          setFormError(`Merma y reutilizable en ${actionLabels[accion]} no pueden ser negativos.`)
          return
        }

        if (uso.mermaTotalLosas + uso.reutilizableLosas > uso.cantidadLosas) {
          setFormError(
            `En ${actionLabels[accion]} la suma de merma + reutilizable no puede superar las losas procesadas.`,
          )
          return
        }

        const trabajador = workersById.get(uso.trabajadorId)
        if (!trabajador) {
          setFormError('Uno de los trabajadores seleccionados no esta activo.')
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

        totalAsignado += uso.cantidadLosas

        detallesAcciones.push({
          id: `PGA-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
          accion,
          trabajadorId: trabajador.id,
          trabajadorNombre: trabajador.nombre,
          equipoId: equipo.id,
          equipoNombre: equipo.nombre,
          cantidadLosas: uso.cantidadLosas,
          metrosCuadrados: losasAMetros(uso.cantidadLosas, formData.dimension),
          losasMermaTotal: uso.mermaTotalLosas,
          metrosMermaTotal: losasAMetros(uso.mermaTotalLosas, formData.dimension),
          losasReutilizables: uso.reutilizableLosas,
          metrosReutilizables: losasAMetros(uso.reutilizableLosas, formData.dimension),
        })
      }

      if (totalAsignado !== totalAccion) {
        setFormError(
          `${actionLabels[accion]} tiene ${totalAsignado} losas asignadas y debe sumar ${totalAccion}.`,
        )
        return
      }
    }

    const cantidadPicar = formData.acciones.picar.cantidadLosas
    const cantidadPulir = formData.acciones.pulir.cantidadLosas
    const cantidadEscuadrar = formData.acciones.escuadrar.cantidadLosas
    const totalLosas = cantidadPicar + cantidadPulir + cantidadEscuadrar

    if (totalLosas <= 0) {
      setFormError('Ingresa al menos una cantidad de losas.')
      return
    }

    const fecha = formData.fecha

    const newRecord: ProduccionDiaria = {
      id: buildNextProduccionId(produccion),
      fecha,
      origenId: formData.origenId,
      origenNombre: origen.nombre,
      tipo: formData.tipo,
      dimension: formData.dimension,
      cantidadPicar,
      cantidadPulir,
      cantidadEscuadrar,
      totalLosas,
      totalM2: losasAMetros(totalLosas, formData.dimension),
      detallesAcciones,
    }

    setProduccion((prev) => {
      const existingIndex = prev.findIndex(
        (registro) =>
          registro.fecha === fecha &&
          registro.origenId === formData.origenId &&
          registro.tipo === formData.tipo &&
          registro.dimension === formData.dimension,
      )

      if (existingIndex === -1) {
        return [newRecord, ...prev]
      }

      const existing = prev[existingIndex]
      const updatedRecord: ProduccionDiaria = {
        ...newRecord,
        id: existing.id,
        canEdit: existing.canEdit,
        editableUntil: existing.editableUntil,
      }

      return prev.map((registro, index) => (index === existingIndex ? updatedRecord : registro))
    })
    resetFormAndClose()
  }

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen diario" meta={fechaResumen}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>m2 fecha</span>
            <span className="font-semibold">{totalM2Resumen.toFixed(2)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Losas fecha</span>
            <span className="font-semibold">{totalLosasResumen}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Origenes activos</span>
            <span className="font-semibold">{origenesActivosResumen}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Acciones" meta={fechaResumen}>
        <div className="space-y-2 text-sm text-slate-700">
          {actionOrder.map((accion) => (
            <div
              key={accion}
              className={cn(
                'flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2',
                accion === 'pulir' && 'border border-emerald-200/60 bg-emerald-50/70',
              )}
            >
              <span>{actionLabels[accion]}</span>
              <span className={cn('text-xs font-semibold text-slate-900', accion === 'pulir' && 'text-emerald-700')}>
                {resumenAcciones[accion].toFixed(2)} m2
              </span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Losas partidas" meta={fechaResumen}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Merma total</span>
            <span className="font-semibold text-rose-700">
              {resumenPartidas.mermaLosas} losas / {resumenPartidas.mermaM2.toFixed(2)} m2
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Partidas reutilizables</span>
            <span className="font-semibold text-sky-700">
              {resumenPartidas.reutilizableLosas} losas / {resumenPartidas.reutilizableM2.toFixed(2)} m2
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Merma en produccion no se paga. Reutilizable se conserva para inventario.
          </p>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top origenes" meta={fechaResumen}>
        <div className="space-y-2 text-sm text-slate-700">
          {topOrigenesResumen.length === 0 ? (
            <p className="text-xs text-slate-500">Sin produccion registrada en la fecha filtrada.</p>
          ) : (
            topOrigenesResumen.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.origenNombre}</p>
                  <p className="text-[11px] text-slate-500">{item.totalLosas} losas</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{item.totalM2.toFixed(2)} m2</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Produccion diaria</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Registra produccion por fecha, accion, trabajador y equipo usado. Puedes cargar dias anteriores.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={prepareNewForm}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Produccion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88vh] w-[96vw] max-w-[96vw] lg:max-w-[1200px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar produccion diaria</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Bloque/Lote de origen</Label>
                    <Select
                      value={formData.origenId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, origenId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloquesYLotes
                          .filter((bloque) => bloque.estado === 'activo')
                          .map((bloque) => (
                            <SelectItem key={bloque.id} value={bloque.id}>
                              {bloque.nombre} ({bloque.tipo})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: TipoProducto) =>
                        setFormData((prev) => ({ ...prev, tipo: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposProducto.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de produccion</Label>
                    <Input
                      type="date"
                      max={today}
                      value={formData.fecha}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, fecha: event.target.value }))
                      }
                    />
                  </div>
                </div>

                {dateEditPolicy.hasRecords ? (
                  <div
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs',
                      dateEditPolicy.canMutate
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700',
                    )}
                  >
                    {dateEditPolicy.message}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{dateEditPolicy.message}</p>
                )}

                <div className="space-y-2 sm:max-w-[220px]">
                  <Label>Dimension</Label>
                  <Select
                    value={formData.dimension}
                    onValueChange={(value: Dimension) =>
                      setFormData((prev) => ({ ...prev, dimension: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensiones.map((dimension) => (
                        <SelectItem key={dimension} value={dimension}>
                          {dimension} cm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Produccion por accion</Label>

                  {actionOrder.map((accion) => {
                    const accionState = formData.acciones[accion]
                    const tipoEquipo = TIPO_EQUIPO_POR_ACCION[accion]
                    const equiposPorAccion = equiposActivos.filter(
                      (equipo) => equipo.tipo === tipoEquipo,
                    )
                    const totalAsignado = accionState.usos.reduce(
                      (sum, uso) => sum + uso.cantidadLosas,
                      0,
                    )
                    const totalMermaAccion = accionState.usos.reduce(
                      (sum, uso) => sum + uso.mermaTotalLosas,
                      0,
                    )
                    const totalReutilizableAccion = accionState.usos.reduce(
                      (sum, uso) => sum + uso.reutilizableLosas,
                      0,
                    )

                    return (
                      <div
                        key={accion}
                        className="rounded-[18px] border border-slate-200/80 bg-slate-50/60 p-3"
                      >
                        <div className="space-y-4">
                          <div className="max-w-[220px] space-y-2">
                            <Badge className={cn('w-fit', actionColors[accion])}>{actionLabels[accion]}</Badge>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={
                                accionState.cantidadTouched || accionState.cantidadLosas > 0
                                  ? accionState.cantidadLosas
                                  : ''
                              }
                              onChange={(event) => updateActionTotal(accion, event.target.value)}
                            />
                            <p className="text-[11px] text-slate-500">Total losas de {actionLabels[accion].toLowerCase()}</p>
                          </div>

                          {accionState.cantidadLosas > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-500">
                                Equipo requerido: <span className="font-semibold text-slate-700">{tipoEquipo}</span>
                              </p>
                              <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/80">
                                <div className="overflow-x-auto">
                                  <div className="min-w-[980px]">
                                    <div className="grid grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_110px_130px_130px_64px] gap-3 border-b border-slate-200/70 px-3 py-2">
                                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Trabajador</span>
                                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Equipo</span>
                                      <span className="text-[10px] uppercase tracking-[0.2em] text-right text-slate-500">Losas</span>
                                      <span className="text-[10px] uppercase tracking-[0.2em] text-right text-slate-500">Merma prod. (no pago)</span>
                                      <span className="text-[10px] uppercase tracking-[0.2em] text-right text-slate-500">Reutilizable (paga)</span>
                                      <span className="text-[10px] uppercase tracking-[0.2em] text-center text-slate-500">Quitar</span>
                                    </div>

                                    <div className="divide-y divide-slate-200/70">
                                      {accionState.usos.map((uso) => (
                                        <div
                                          key={uso.id}
                                          className="grid grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_110px_130px_130px_64px] items-center gap-3 px-3 py-2"
                                        >
                                          <Select
                                            value={uso.trabajadorId}
                                            onValueChange={(value) =>
                                              updateUsage(accion, uso.id, { trabajadorId: value })
                                            }
                                          >
                                            <SelectTrigger className="h-9 w-full">
                                              <SelectValue placeholder="Seleccionar trabajador" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {trabajadoresActivos.map((trabajador) => (
                                                <SelectItem key={trabajador.id} value={trabajador.id}>
                                                  {trabajador.nombre}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>

                                          <Select
                                            value={uso.equipoId}
                                            onValueChange={(value) =>
                                              updateUsage(accion, uso.id, { equipoId: value })
                                            }
                                          >
                                            <SelectTrigger className="h-9 w-full">
                                              <SelectValue placeholder="Seleccionar equipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {equiposPorAccion.map((equipo) => (
                                                <SelectItem key={equipo.id} value={equipo.id}>
                                                  {equipo.nombre}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>

                                          <Input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="0"
                                            className="h-9 text-right"
                                            value={
                                              uso.cantidadTouched || uso.cantidadLosas > 0
                                                ? uso.cantidadLosas
                                                : ''
                                            }
                                            onChange={(event) => {
                                              const value = event.target.value
                                              const parsed = value === '' ? 0 : Number(value)
                                              updateUsage(accion, uso.id, {
                                                cantidadTouched: value !== '',
                                                cantidadLosas:
                                                  Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
                                              })
                                            }}
                                          />

                                          <Input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="0"
                                            className="h-9 text-right"
                                            value={
                                              uso.mermaTotalTouched || uso.mermaTotalLosas > 0
                                                ? uso.mermaTotalLosas
                                                : ''
                                            }
                                            onChange={(event) => {
                                              const value = event.target.value
                                              const parsed = value === '' ? 0 : Number(value)
                                              updateUsage(accion, uso.id, {
                                                mermaTotalTouched: value !== '',
                                                mermaTotalLosas:
                                                  Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
                                              })
                                            }}
                                          />

                                          <Input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="0"
                                            className="h-9 text-right"
                                            value={
                                              uso.reutilizableTouched || uso.reutilizableLosas > 0
                                                ? uso.reutilizableLosas
                                                : ''
                                            }
                                            onChange={(event) => {
                                              const value = event.target.value
                                              const parsed = value === '' ? 0 : Number(value)
                                              updateUsage(accion, uso.id, {
                                                reutilizableTouched: value !== '',
                                                reutilizableLosas:
                                                  Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
                                              })
                                            }}
                                          />

                                          <div className="flex justify-center">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-9 w-9"
                                              onClick={() => removeUsage(accion, uso.id)}
                                              disabled={accionState.usos.length === 1}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="bg-transparent"
                                  onClick={() => addUsage(accion)}
                                >
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                  Subfila
                                </Button>
                                <div className="text-right">
                                  <p
                                    className={cn(
                                      'text-xs',
                                      totalAsignado === accionState.cantidadLosas
                                        ? 'text-emerald-700'
                                        : 'text-amber-700',
                                    )}
                                  >
                                    Asignado: {totalAsignado} / {accionState.cantidadLosas} losas
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    Merma total: {totalMermaAccion} losas - Reutilizable: {totalReutilizableAccion} losas
                                  </p>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-500">
                                Merma en produccion no genera pago. Reutilizable paga solo lo salvado.
                              </p>

                              {equiposPorAccion.length === 0 && (
                                <p className="text-xs text-amber-700">
                                  No hay equipos activos tipo {tipoEquipo}.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Coloca una cantidad mayor a 0 para capturar subfilas.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFormAndClose}
                    className="flex-1 bg-transparent"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={dateEditPolicy.hasRecords && !dateEditPolicy.canMutate}
                  >
                    {dateEditPolicy.hasRecords ? 'Modificar registro' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_220px_auto] sm:items-end">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fecha, origen, tipo o dimension..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Filtrar fecha</p>
              <Input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => setDateFilter('')}
                disabled={!dateFilter}
              >
                Limpiar fecha
              </Button>
            </div>
          </div>
        </div>

        <Card className=" bg-transparent border-none outline-none shadow-none p-0 ">
          <CardContent className="p-0">
            {fechasOrdenadas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No hay registros de produccion
              </div>
            ) : (
              <div className="space-y-2">
                {fechasOrdenadas.map((fecha) => {
                  const registros = groupedByDate[fecha]
                  const policy = resolveDateEditPolicy(produccion, fecha)

                  return (
                    <div
                      key={fecha}
                      className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                    >
                      <div className="flex flex-col gap-2 border-b border-slate-200/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
                          <p className="text-base font-semibold text-slate-900">{fecha}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'w-fit',
                            policy.canMutate
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600',
                          )}
                        >
                          {policy.canMutate ? 'Editable (24h/API)' : 'Solo visualizacion'}
                        </Badge>
                      </div>

                      <div className="hidden lg:grid lg:grid-cols-[1fr_3fr] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Origen</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Detalle por accion</span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {registros.map((item) => {
                          const accionesActivas = actionOrder
                            .map((accion) => {
                              const detalles = getAccionDetalles(item, accion)
                              const totalLosasAccion = detalles.reduce(
                                (sum, detalle) => sum + detalle.cantidadLosas,
                                0,
                              )
                              const totalM2Accion = detalles.reduce(
                                (sum, detalle) => sum + detalle.metrosCuadrados,
                                0,
                              )
                              const totalMermaAccion = detalles.reduce(
                                (sum, detalle) => sum + getDetalleMermaLosas(detalle),
                                0,
                              )
                              const totalReutilizableAccion = detalles.reduce(
                                (sum, detalle) => sum + getDetalleReutilizableLosas(detalle),
                                0,
                              )

                              return {
                                accion,
                                detalles,
                                totalLosasAccion,
                                totalM2Accion,
                                totalMermaAccion,
                                totalReutilizableAccion,
                              }
                            })
                            .filter((accion) => accion.totalLosasAccion > 0)

                          return (
                            <div key={item.id} className="px-4 py-3">
                              <div className="grid gap-1 lg:grid-cols-[1fr_3fr] lg:items-start">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{item.origenNombre}</p>
                                  <p className="text-[11px] text-slate-500">
                                    {item.tipo} / {item.dimension}
                                  </p>
                                  <p className="mt-1 text-[11px] font-medium text-slate-600">
                                    Total: {item.totalLosas} losas / {item.totalM2.toFixed(2)} m2
                                  </p>
                                </div>

                                <div className="overflow-x-auto">
                                  <div className="min-w-[860px] overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                                    <div className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px] border-b border-slate-200/70 px-2.5 py-1">
                                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Accion</span>
                                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Trabajador / Equipo</span>
                                      <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Losas</span>
                                      <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">M2</span>
                                      <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Merma prod. (no pago)</span>
                                      <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Reutilizable (paga)</span>
                                    </div>

                                    <div className="divide-y divide-slate-200/70">
                                      {accionesActivas.map((accion) => (
                                        <div key={`${item.id}-${accion.accion}`}>
                                          <div className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px] items-center gap-2 border-b border-slate-200/70 bg-white/70 px-2.5 py-1.5">
                                            <Badge className={cn('w-fit', actionColors[accion.accion])}>
                                              {actionLabels[accion.accion]}
                                            </Badge>
                                            <p className="text-[11px] text-slate-500">
                                              {accion.detalles.length} subfila(s)
                                            </p>
                                            <span />
                                            <span />
                                            <span />
                                            <span />
                                          </div>

                                          <div className="divide-y divide-slate-200/70">
                                            {accion.detalles.map((detalle) => (
                                              <div
                                                key={detalle.id}
                                                className="grid grid-cols-[118px_minmax(0,1fr)_92px_92px_110px_120px] items-center gap-2 px-2.5 py-1.5"
                                              >
                                                <span />
                                                <p className="truncate text-sm text-slate-700">
                                                  <span className="font-medium text-slate-800">{detalle.trabajadorNombre}</span>
                                                  {' / '}
                                                  <span className="text-slate-500">{detalle.equipoNombre}</span>
                                                </p>
                                                <span className="text-right text-sm font-semibold text-slate-800">
                                                  {detalle.cantidadLosas}
                                                </span>
                                                <span className="text-right text-sm font-semibold text-emerald-700">
                                                  {detalle.metrosCuadrados.toFixed(2)}
                                                </span>
                                                <span className="text-right text-sm font-semibold text-rose-700">
                                                  {getDetalleMermaLosas(detalle)}
                                                </span>
                                                <span className="text-right text-sm font-semibold text-sky-700">
                                                  {getDetalleReutilizableLosas(detalle)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
