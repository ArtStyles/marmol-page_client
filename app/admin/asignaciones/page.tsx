'use client'

import React from 'react'
import { useState } from 'react'
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
  produccionTrabajadores as initialProduccion,
  tiposProducto,
  trabajadores,
} from '@/lib/data'
import type {
  AccionLosa,
  Dimension,
  ProduccionTrabajador,
  TipoProducto,
} from '@/lib/types'
import { losasAMetros } from '@/lib/types'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { cn } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'

type AccionResumen = {
  accion: AccionLosa
  totalLosas: number
  totalM2: number
  tipos: Set<TipoProducto>
  dimensiones: Set<Dimension>
}

type ProduccionLoteGroup = {
  origenId: string
  origenNombre: string
  acciones: Record<AccionLosa, AccionResumen>
}

type ProduccionWorkerGroup = {
  trabajadorId: string
  trabajadorNombre: string
  lotes: ProduccionLoteGroup[]
  resumenAcciones: Record<AccionLosa, { m2: number }>
}

type FormData = {
  trabajadorId: string
  origenId: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadPicar: number
  cantidadPulir: number
  cantidadEscuadrar: number
}

const actionOrder: AccionLosa[] = ['picar', 'pulir', 'escuadrar']

const actionColors: Record<AccionLosa, string> = {
  picar: 'bg-blue-100 text-blue-800',
  pulir: 'bg-green-100 text-green-800',
  escuadrar: 'bg-amber-100 text-amber-800',
}

const createResumenAcciones = () => ({
  picar: { m2: 0 },
  pulir: { m2: 0 },
  escuadrar: { m2: 0 },
})

const createAccionResumen = (accion: AccionLosa): AccionResumen => ({
  accion,
  totalLosas: 0,
  totalM2: 0,
  tipos: new Set<TipoProducto>(),
  dimensiones: new Set<Dimension>(),
})

export default function AsignacionesPage() {
  const { config } = useConfiguracion()
  const [produccion, setProduccion] = useState<ProduccionTrabajador[]>(initialProduccion)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [numericTouched, setNumericTouched] = useState({
    cantidadPicar: false,
    cantidadPulir: false,
    cantidadEscuadrar: false,
  })
  const [formData, setFormData] = useState<FormData>({
    trabajadorId: '',
    origenId: '',
    tipo: 'Piso',
    dimension: '60x40',
    cantidadPicar: 0,
    cantidadPulir: 0,
    cantidadEscuadrar: 0,
  })

  const filteredProduccion = produccion.filter((p) => {
    const query = searchTerm.toLowerCase()
    return (
      p.trabajadorNombre.toLowerCase().includes(query) ||
      p.origenNombre.toLowerCase().includes(query) ||
      p.accion.toLowerCase().includes(query)
    )
  })

  const today = new Date().toISOString().split('T')[0]
  const produccionHoy = produccion.filter((p) => p.fecha === today)
  const trabajadoresActivos = new Set(produccionHoy.map((p) => p.trabajadorId)).size

  const resumenAcciones = produccionHoy.reduce<Record<AccionLosa, { m2: number }>>(
    (acc, p) => {
      acc[p.accion].m2 += losasAMetros(p.cantidadLosas, p.dimension)
      return acc
    },
    {
      picar: { m2: 0 },
      pulir: { m2: 0 },
      escuadrar: { m2: 0 },
    },
  )

  const resumenTrabajadoresHoy = produccionHoy.reduce<Record<string, { nombre: string; m2: number }>>(
    (acc, item) => {
      if (!acc[item.trabajadorId]) {
        acc[item.trabajadorId] = { nombre: item.trabajadorNombre, m2: 0 }
      }
      acc[item.trabajadorId].m2 += losasAMetros(item.cantidadLosas, item.dimension)
      return acc
    },
    {},
  )

  const topTrabajadoresHoy = Object.values(resumenTrabajadoresHoy)
    .sort((a, b) => b.m2 - a.m2)
    .slice(0, 3)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const trabajador = trabajadores.find((t) => t.id === formData.trabajadorId)
    const origen = bloquesYLotes.find((b) => b.id === formData.origenId)
    if (!trabajador || !origen) return

    const accionesRegistradas: Array<{ accion: AccionLosa; cantidad: number }> = [
      { accion: 'picar' as AccionLosa, cantidad: formData.cantidadPicar },
      { accion: 'pulir' as AccionLosa, cantidad: formData.cantidadPulir },
      { accion: 'escuadrar' as AccionLosa, cantidad: formData.cantidadEscuadrar },
    ].filter((item) => item.cantidad > 0)

    if (accionesRegistradas.length === 0) {
      setFormError('Ingresa al menos una cantidad de losas.')
      return
    }

    const fecha = new Date().toISOString().split('T')[0]
    const baseIndex = produccion.length + 1

    const nuevasAsignaciones: ProduccionTrabajador[] = accionesRegistradas.map((item, index) => {
      const pagoPorLosa = config.tarifasGlobales[item.accion]
      const pagoTotal = pagoPorLosa * item.cantidad

      return {
        id: `PD${String(baseIndex + index).padStart(3, '0')}`,
        fecha,
        trabajadorId: trabajador.id,
        trabajadorNombre: trabajador.nombre,
        accion: item.accion,
        origenId: origen.id,
        origenNombre: origen.nombre,
        tipo: formData.tipo,
        dimension: formData.dimension,
        cantidadLosas: item.cantidad,
        pagoPorLosa,
        pagoTotal,
        bono: 0,
        pagoFinal: pagoTotal,
        pagado: false,
      }
    })

    setProduccion([...nuevasAsignaciones, ...produccion])
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      trabajadorId: '',
      origenId: '',
      tipo: 'Piso',
      dimension: '60x40',
      cantidadPicar: 0,
      cantidadPulir: 0,
      cantidadEscuadrar: 0,
    })
    setNumericTouched({
      cantidadPicar: false,
      cantidadPulir: false,
      cantidadEscuadrar: false,
    })
    setFormError('')
    setIsDialogOpen(false)
  }

  const groupedProduccion = filteredProduccion.reduce<ProduccionWorkerGroup[]>((acc, item) => {
    let worker = acc.find((entry) => entry.trabajadorId === item.trabajadorId)
    if (!worker) {
      worker = {
        trabajadorId: item.trabajadorId,
        trabajadorNombre: item.trabajadorNombre,
        lotes: [],
        resumenAcciones: createResumenAcciones(),
      }
      acc.push(worker)
    }

    const m2 = losasAMetros(item.cantidadLosas, item.dimension)
    worker.resumenAcciones[item.accion].m2 += m2

    let lote = worker.lotes.find((entry) => entry.origenId === item.origenId)
    if (!lote) {
      lote = {
        origenId: item.origenId,
        origenNombre: item.origenNombre,
        acciones: {
          picar: createAccionResumen('picar'),
          pulir: createAccionResumen('pulir'),
          escuadrar: createAccionResumen('escuadrar'),
        },
      }
      worker.lotes.push(lote)
    }

    const accionResumen = lote.acciones[item.accion]
    accionResumen.totalLosas += item.cantidadLosas
    accionResumen.totalM2 += m2
    accionResumen.tipos.add(item.tipo)
    accionResumen.dimensiones.add(item.dimension)

    return acc
  }, [])

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen asignaciones" meta={today}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>m2 hoy</span>
            <span className="font-semibold">
              {produccionHoy
                .reduce((sum, item) => sum + losasAMetros(item.cantidadLosas, item.dimension), 0)
                .toFixed(2)}{' '}
              m2
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Trabajadores</span>
            <span className="font-semibold">{trabajadoresActivos}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Acciones hoy" meta="Resumen por accion">
        <div className="space-y-2 text-sm text-slate-700">
          {actionOrder.map((accion) => (
            <div
              key={accion}
              className={cn(
                'flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2',
                accion === 'pulir' && 'border border-emerald-200/60 bg-emerald-50/70',
              )}
            >
              <span className="capitalize">{accion}</span>
              <span className={cn('text-xs font-semibold text-slate-900', accion === 'pulir' && 'text-emerald-700')}>
                {resumenAcciones[accion].m2.toFixed(2)} m2
              </span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top trabajadores" meta="Hoy">
        <div className="space-y-2 text-sm text-slate-700">
          {topTrabajadoresHoy.length === 0 ? (
            <p className="text-xs text-slate-500">Sin asignaciones registradas hoy.</p>
          ) : (
            topTrabajadoresHoy.map((item) => (
              <div key={item.nombre} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.nombre}</p>
                  <p className="text-[11px] text-slate-500">{item.m2.toFixed(2)} m2</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{item.m2.toFixed(2)} m2</span>
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
            <h1 className="text-3xl font-bold text-foreground font-sans">Asignacion por trabajador</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Registra lo que hizo cada trabajador en el dia. Esta seccion es independiente de produccion diaria.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Asignacion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar asignacion diaria</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Trabajador</Label>
                    <Select
                      value={formData.trabajadorId}
                      onValueChange={(value) => setFormData({ ...formData, trabajadorId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {trabajadores
                          .filter((t) => t.estado === 'activo')
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bloque/Lote de origen</Label>
                  <Select
                    value={formData.origenId}
                    onValueChange={(value) => setFormData({ ...formData, origenId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {bloquesYLotes
                        .filter((b) => b.estado === 'activo')
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.nombre} ({b.tipo})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de producto</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: TipoProducto) => setFormData({ ...formData, tipo: value })}
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
                    <Label>Dimension</Label>
                    <Select
                      value={formData.dimension}
                      onValueChange={(value: Dimension) => setFormData({ ...formData, dimension: value })}
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
                </div>

                <div className="space-y-2">
                  <Label>Produccion por accion</Label>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Losas picadas</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={numericTouched.cantidadPicar || formData.cantidadPicar > 0 ? formData.cantidadPicar : ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setNumericTouched((prev) => ({ ...prev, cantidadPicar: value !== '' }))
                          setFormData({ ...formData, cantidadPicar: value === '' ? 0 : Number(value) })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Losas pulidas</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={numericTouched.cantidadPulir || formData.cantidadPulir > 0 ? formData.cantidadPulir : ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setNumericTouched((prev) => ({ ...prev, cantidadPulir: value !== '' }))
                          setFormData({ ...formData, cantidadPulir: value === '' ? 0 : Number(value) })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Losas escuadradas</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={numericTouched.cantidadEscuadrar || formData.cantidadEscuadrar > 0 ? formData.cantidadEscuadrar : ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setNumericTouched((prev) => ({ ...prev, cantidadEscuadrar: value !== '' }))
                          setFormData({ ...formData, cantidadEscuadrar: value === '' ? 0 : Number(value) })
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ingresa 0 si no hubo produccion en alguna accion.
                  </p>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Registrar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por trabajador, origen o accion..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] py-0 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <CardContent className="pb-4 pt-4">
            {groupedProduccion.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No hay asignaciones de produccion
              </div>
            ) : (
              <div className="space-y-3">
                {groupedProduccion.map((worker) => (
                  <div
                    key={worker.trabajadorId}
                    className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-200/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Trabajador</p>
                        <p className="text-base font-semibold text-slate-900">{worker.trabajadorNombre}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Picadas</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {worker.resumenAcciones.picar.m2.toFixed(2)} m2
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-right text-emerald-700">
                          <p className="text-[10px] uppercase tracking-[0.2em]">Pulidas</p>
                          <p className="text-sm font-semibold">
                            {worker.resumenAcciones.pulir.m2.toFixed(2)} m2
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Escuadradas</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {worker.resumenAcciones.escuadrar.m2.toFixed(2)} m2
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200/60">
                      {worker.lotes.map((lote) => {
                        const accionesActivas = actionOrder
                          .map((accion) => ({ accion, resumen: lote.acciones[accion] }))
                          .filter((entry) => entry.resumen.totalM2 > 0)

                        return (
                          <div key={`${worker.trabajadorId}-${lote.origenId}`} className="px-4 py-3">
                            <div className="grid gap-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2.2fr)] lg:items-center">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                                  Bloque/Lote
                                </p>
                                <p className="text-sm font-semibold text-slate-900">{lote.origenNombre}</p>
                              </div>

                              <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                                <div className="grid grid-cols-[1fr_92px_92px] border-b border-slate-200/70 px-2.5 py-1">
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Accion</span>
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Losas</span>
                                  <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">M2</span>
                                </div>
                                {accionesActivas.map((entry, index) => {
                                  const { accion, resumen } = entry
                                  return (
                                    <div
                                      key={`${lote.origenId}-${accion}`}
                                      className={cn(
                                        'grid grid-cols-[1fr_92px_92px] items-center gap-2 px-2.5 py-1.5',
                                        index < accionesActivas.length - 1 && 'border-b border-slate-200/70',
                                      )}
                                    >
                                      <Badge className={`w-fit capitalize ${actionColors[accion]}`}>{accion}</Badge>
                                      <span className="text-right text-sm font-semibold text-slate-800">
                                        {resumen.totalLosas}
                                      </span>
                                      <span className="text-right text-sm font-semibold text-emerald-700">
                                        {resumen.totalM2.toFixed(2)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
