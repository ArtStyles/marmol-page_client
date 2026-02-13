'use client'

import React from "react"
import { useState } from 'react'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { Card, CardContent } from '@/components/ui/card'
import { 
  mermas as initialMermas, 
  bloquesYLotes,
  tiposProducto,
  dimensiones,
  motivosMerma
} from '@/lib/data'
import type { Merma, Dimension, TipoProducto } from '@/lib/types'
import { Plus, Search, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function MermasPage() {
  const [mermas, setMermas] = useState<Merma[]>(initialMermas)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cantidadTouched, setCantidadTouched] = useState(false)
  const [formData, setFormData] = useState({
    origenId: '',
    tipo: 'Piso' as TipoProducto,
    dimension: '60x40' as Dimension,
    cantidadLosas: 0,
    motivo: 'Partida al picar' as Merma['motivo'],
    observaciones: ''
  })

  const filteredMermas = mermas.filter(m => 
    m.origenNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.motivo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedByDate = filteredMermas.reduce<Record<string, Merma[]>>((acc, item) => {
    if (!acc[item.fecha]) {
      acc[item.fecha] = []
    }
    acc[item.fecha].push(item)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  // Estadísticas
  const totalLosasPerdidas = mermas.reduce((sum, m) => sum + m.cantidadLosas, 0)
  const totalM2Perdidos = mermas.reduce((sum, m) => sum + m.metrosCuadrados, 0)
  
  const mermasPorMotivo = mermas.reduce((acc, m) => {
    if (!acc[m.motivo]) {
      acc[m.motivo] = { losas: 0, m2: 0 }
    }
    acc[m.motivo].losas += m.cantidadLosas
    acc[m.motivo].m2 += m.metrosCuadrados
    return acc
  }, {} as Record<string, { losas: number; m2: number }>)
  const motivosOrdenados = Object.entries(mermasPorMotivo)
    .sort((a, b) => b[1].m2 - a[1].m2)
    .slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen mermas" meta={`${mermas.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total losas</span>
            <span className="font-semibold">{formatLosas(totalLosasPerdidas)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total m2</span>
            <span className="font-semibold">{totalM2Perdidos.toFixed(2)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Motivos</span>
            <span className="font-semibold">{Object.keys(mermasPorMotivo).length}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Detalle por proceso" meta="Losas y m2">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Por picar</span>
            <span className="font-semibold">
              {formatLosas(mermasPorMotivo['Partida al picar']?.losas || 0)} losas / {(mermasPorMotivo['Partida al picar']?.m2 || 0).toFixed(2)} m2
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Por pulir</span>
            <span className="font-semibold">
              {formatLosas(mermasPorMotivo['Partida al pulir']?.losas || 0)} losas / {(mermasPorMotivo['Partida al pulir']?.m2 || 0).toFixed(2)} m2
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Recortes</span>
            <span className="font-semibold">
              {formatLosas(mermasPorMotivo['Recorte aprovechable']?.losas || 0)} losas / {(mermasPorMotivo['Recorte aprovechable']?.m2 || 0).toFixed(2)} m2
            </span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Motivos principales" meta="Top 3">
        <div className="space-y-2 text-sm text-slate-700">
          {motivosOrdenados.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros.</p>
          ) : (
            motivosOrdenados.map(([motivo, total]) => (
              <div key={motivo} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <span className="text-xs font-semibold text-slate-900">{motivo}</span>
                <span className="text-xs font-semibold text-rose-700">
                  {formatLosas(total.losas)} losas / {total.m2.toFixed(2)} m2
                </span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  function formatLosas(value: number) {
    return Math.trunc(value).toString()
  }

  // Referencia de m² por dimensión de losa
  const m2PorDimension: Record<Dimension, number> = {
    '40x40': 0.16,
    '60x40': 0.24,
    '80x40': 0.32
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const origen = bloquesYLotes.find(b => b.id === formData.origenId)
    if (!origen || !Number.isInteger(formData.cantidadLosas) || formData.cantidadLosas <= 0) return

    const metrosCuadrados = Number((formData.cantidadLosas * m2PorDimension[formData.dimension]).toFixed(2))

    const newMerma: Merma = {
      id: `M${String(mermas.length + 1).padStart(3, '0')}`,
      fecha: new Date().toISOString().split('T')[0],
      origenId: formData.origenId,
      origenNombre: origen.nombre,
      tipo: formData.tipo,
      dimension: formData.dimension,
      cantidadLosas: formData.cantidadLosas,
      metrosCuadrados,
      motivo: formData.motivo,
      observaciones: formData.observaciones
    }

    setMermas([newMerma, ...mermas])
    resetForm()
  }

  const resetForm = (closeDialog = true) => {
    setFormData({
      origenId: '',
      tipo: 'Piso',
      dimension: '60x40',
      cantidadLosas: 0,
      motivo: 'Partida al picar',
      observaciones: ''
    })
    setCantidadTouched(false)
    if (closeDialog) {
      setIsDialogOpen(false)
    }
  }

  const metrosCuadradosCalculados = formData.cantidadLosas * m2PorDimension[formData.dimension]

  const motivoColors: Record<Merma['motivo'], string> = {
    'Partida al picar': 'bg-blue-100 text-blue-800',
    'Partida al pulir': 'bg-green-100 text-green-800',
    'Defecto de material': 'bg-amber-100 text-amber-800',
    'Recorte aprovechable': 'bg-purple-100 text-purple-800',
    'Otro': 'bg-gray-100 text-gray-800',
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sans">
            Control de Mermas
          </h1>
          <p className="mt-1 text-muted-foreground font-sans">
              Registra pérdidas en losas con conversión automática a m2
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Merma
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Merma (Pérdida)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Bloque/Lote de Origen</Label>
                <Select 
                  value={formData.origenId} 
                  onValueChange={(value) => setFormData({ ...formData, origenId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloquesYLotes.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nombre} ({b.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Producto</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value: TipoProducto) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposProducto.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dimensión de Referencia</Label>
                  <Select 
                    value={formData.dimension} 
                    onValueChange={(value: Dimension) => setFormData({ ...formData, dimension: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensiones.map((d) => (
                        <SelectItem key={d} value={d}>{d} cm ({m2PorDimension[d as Dimension]} m²/losa)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cantidad de Losas Perdidas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={cantidadTouched || formData.cantidadLosas > 0 ? formData.cantidadLosas : ''}
                  onChange={(e) => {
                    const value = e.target.value
                    const parsed = Number.parseInt(value, 10)
                    setCantidadTouched(value !== '')
                    setFormData({ ...formData, cantidadLosas: Number.isFinite(parsed) ? parsed : 0 })
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Registra la cantidad de losas enteras perdidas. El sistema calcula m2 automáticamente según la dimensión.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select 
                  value={formData.motivo} 
                  onValueChange={(value: Merma['motivo']) => setFormData({ ...formData, motivo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {motivosMerma.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Describe las circunstancias. Si parte del material se recuperó para otra medida, indícalo aquí..."
                  rows={3}
                />
              </div>

              {/* Cálculo en tiempo real */}
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <h4 className="font-medium text-destructive">Resumen de Pérdida</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Losas ({formData.dimension}):</span>
                  <span className="text-right font-bold text-destructive">{formatLosas(formData.cantidadLosas)} losas</span>
                  <span className="text-muted-foreground">Conversión automática:</span>
                  <span className="text-right text-muted-foreground">{metrosCuadradosCalculados.toFixed(2)} m²</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={()=>resetForm()} className="flex-1 bg-transparent">
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" className="flex-1">
                  Registrar Merma
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Box */}
      <div className="rounded-[24px] border border-sky-200/70 bg-sky-50/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Registro en Losas con Conversión Automática</h4>
            <p className="text-sm text-blue-700">
              Las mermas se registran en <strong>losas</strong> y el sistema convierte a m2 en tiempo real según la dimensión.
              El registro se realiza solo con números enteros.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por origen o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card className="bg-transparent border-none outline-none shadow-none p-0">
        <CardContent className="p-0">
          {fechasOrdenadas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No hay registros de mermas
            </div>
          ) : (
            <div className="space-y-3">
              {fechasOrdenadas.map((fecha) => {
                const registros = groupedByDate[fecha]
                const totalLosasFecha = registros.reduce((sum, item) => sum + item.cantidadLosas, 0)
                const totalM2Fecha = registros.reduce((sum, item) => sum + item.metrosCuadrados, 0)

                return (
                  <div
                    key={fecha}
                    className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
                        <p className="text-base font-semibold text-slate-900">{fecha}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Registros</p>
                          <p className="text-sm font-semibold text-slate-900">{registros.length}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Losas</p>
                          <p className="text-sm font-semibold text-slate-900">{formatLosas(totalLosasFecha)}</p>
                        </div>
                        <div className="rounded-lg border border-rose-200/70 bg-rose-50/70 px-2.5 py-1 text-right text-rose-700">
                          <p className="text-[10px] uppercase tracking-[0.2em]">M2</p>
                          <p className="text-sm font-semibold">{totalM2Fecha.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.3fr)_160px_190px_100px_100px_minmax(0,1fr)] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Bloque/Lote</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tipo / Dim.</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Motivo</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Losas</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">M2</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Observaciones</span>
                    </div>

                    <div className="divide-y divide-slate-200/60">
                      {registros.map((item) => (
                        <div key={item.id} className="px-4 py-3">
                          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_160px_190px_100px_100px_minmax(0,1fr)] lg:items-center">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.origenNombre}</p>
                              <p className="text-[11px] text-slate-500">ID {item.id}</p>
                            </div>

                            <div className="text-sm text-slate-700">
                              {item.tipo} / {item.dimension}
                            </div>

                            <div>
                              <Badge className={motivoColors[item.motivo]}>{item.motivo}</Badge>
                            </div>

                            <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Losas</span>
                              <span className="font-semibold text-slate-900">{formatLosas(item.cantidadLosas)}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">M2</span>
                              <span className="font-semibold text-rose-700">{item.metrosCuadrados.toFixed(2)}</span>
                            </div>

                            <div className="text-sm text-slate-600">
                              {item.observaciones || '-'}
                            </div>
                          </div>
                        </div>
                      ))}
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
