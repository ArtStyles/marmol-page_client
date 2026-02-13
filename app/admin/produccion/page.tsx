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
  produccionDiaria as initialProduccion,
  tiposProducto,
} from '@/lib/data'
import type { AccionLosa, Dimension, ProduccionDiaria, TipoProducto } from '@/lib/types'
import { losasAMetros } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'

const actionOrder: AccionLosa[] = ['picar', 'pulir', 'escuadrar']

const actionColors: Record<AccionLosa, string> = {
  picar: 'bg-blue-100 text-blue-800',
  pulir: 'bg-green-100 text-green-800',
  escuadrar: 'bg-amber-100 text-amber-800',
}

type FormData = {
  origenId: string
  tipo: TipoProducto
  dimension: Dimension
  cantidadPicar: number
  cantidadPulir: number
  cantidadEscuadrar: number
}

const getAccionLosas = (registro: ProduccionDiaria, accion: AccionLosa): number => {
  if (accion === 'picar') return registro.cantidadPicar
  if (accion === 'pulir') return registro.cantidadPulir
  return registro.cantidadEscuadrar
}

export default function ProduccionPage() {
  const [produccion, setProduccion] = useState<ProduccionDiaria[]>(initialProduccion)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [numericTouched, setNumericTouched] = useState({
    cantidadPicar: false,
    cantidadPulir: false,
    cantidadEscuadrar: false,
  })
  const [formData, setFormData] = useState<FormData>({
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
      p.fecha.toLowerCase().includes(query) ||
      p.origenNombre.toLowerCase().includes(query) ||
      p.tipo.toLowerCase().includes(query) ||
      p.dimension.toLowerCase().includes(query)
    )
  })

  const today = new Date().toISOString().split('T')[0]
  const produccionHoy = produccion.filter((p) => p.fecha === today)

  const totalM2Hoy = produccionHoy.reduce((sum, item) => sum + item.totalM2, 0)
  const totalLosasHoy = produccionHoy.reduce((sum, item) => sum + item.totalLosas, 0)
  const origenesActivosHoy = new Set(produccionHoy.map((item) => item.origenId)).size

  const resumenAcciones = produccionHoy.reduce<Record<AccionLosa, number>>(
    (acc, item) => {
      acc.picar += losasAMetros(item.cantidadPicar, item.dimension)
      acc.pulir += losasAMetros(item.cantidadPulir, item.dimension)
      acc.escuadrar += losasAMetros(item.cantidadEscuadrar, item.dimension)
      return acc
    },
    { picar: 0, pulir: 0, escuadrar: 0 },
  )

  const topOrigenesHoy = [...produccionHoy]
    .sort((a, b) => b.totalM2 - a.totalM2)
    .slice(0, 3)

  const groupedByDate = filteredProduccion.reduce<Record<string, ProduccionDiaria[]>>((acc, item) => {
    if (!acc[item.fecha]) {
      acc[item.fecha] = []
    }
    acc[item.fecha].push(item)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const origen = bloquesYLotes.find((b) => b.id === formData.origenId)
    if (!origen) return

    const totalLosas = formData.cantidadPicar + formData.cantidadPulir + formData.cantidadEscuadrar
    if (totalLosas <= 0) {
      setFormError('Ingresa al menos una cantidad de losas.')
      return
    }

    const fecha = new Date().toISOString().split('T')[0]
    const newRecord: ProduccionDiaria = {
      id: `PG${String(produccion.length + 1).padStart(3, '0')}`,
      fecha,
      origenId: formData.origenId,
      origenNombre: origen.nombre,
      tipo: formData.tipo,
      dimension: formData.dimension,
      cantidadPicar: formData.cantidadPicar,
      cantidadPulir: formData.cantidadPulir,
      cantidadEscuadrar: formData.cantidadEscuadrar,
      totalLosas,
      totalM2: losasAMetros(totalLosas, formData.dimension),
    }

    setProduccion([newRecord, ...produccion])
    resetForm()
  }

  const resetForm = () => {
    setFormData({
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

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen diario" meta={today}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>m2 hoy</span>
            <span className="font-semibold">{totalM2Hoy.toFixed(2)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Losas hoy</span>
            <span className="font-semibold">{totalLosasHoy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Origenes activos</span>
            <span className="font-semibold">{origenesActivosHoy}</span>
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
                {resumenAcciones[accion].toFixed(2)} m2
              </span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top origenes" meta="Hoy">
        <div className="space-y-2 text-sm text-slate-700">
          {topOrigenesHoy.length === 0 ? (
            <p className="text-xs text-slate-500">Sin produccion registrada hoy.</p>
          ) : (
            topOrigenesHoy.map((item) => (
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
              Registra la produccion total del dia por origen y accion.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Produccion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Produccion diaria</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Buscar por fecha, origen, tipo o dimension..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
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

                  return (
                    <div
                      key={fecha}
                      className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                    >
                      <div className="border-b border-slate-200/70 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
                        <p className="text-base font-semibold text-slate-900">{fecha}</p>
                      </div>

                      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2.2fr)] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Origen</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Acciones</span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {registros.map((item) => {
                          const accionesActivas = actionOrder
                            .map((accion) => {
                              const losas = getAccionLosas(item, accion)
                              return {
                                accion,
                                losas,
                                m2: losasAMetros(losas, item.dimension),
                              }
                            })
                            .filter((entry) => entry.losas > 0)

                          return (
                            <div key={item.id} className="px-4 py-3">
                              <div className="grid gap-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,2.2fr)] lg:items-center">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{item.origenNombre}</p>
                                  <p className="text-[11px] text-slate-500">
                                    {item.tipo} / {item.dimension}
                                  </p>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                                  <div className="grid grid-cols-[1fr_92px_92px] border-b border-slate-200/70 px-2.5 py-1">
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Accion</span>
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">Losas</span>
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">M2</span>
                                  </div>
                                  {accionesActivas.map((entry, index) => (
                                    <div
                                      key={`${item.id}-${entry.accion}`}
                                      className={cn(
                                        'grid grid-cols-[1fr_92px_92px] items-center gap-2 px-2.5 py-1.5',
                                        index < accionesActivas.length - 1 && 'border-b border-slate-200/70',
                                      )}
                                    >
                                      <Badge className={`w-fit capitalize ${actionColors[entry.accion]}`}>
                                        {entry.accion}
                                      </Badge>
                                      <span className="text-right text-sm font-semibold text-slate-800">
                                        {entry.losas}
                                      </span>
                                      <span className="text-right text-sm font-semibold text-emerald-700">
                                        {entry.m2.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
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
