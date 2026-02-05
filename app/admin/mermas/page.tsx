'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
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
  const [formData, setFormData] = useState({
    origenId: '',
    tipo: 'Piso' as TipoProducto,
    dimension: '60x40' as Dimension,
    metrosCuadrados: 0.1,
    motivo: 'Partida al picar' as Merma['motivo'],
    observaciones: ''
  })

  const filteredMermas = mermas.filter(m => 
    m.origenNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.motivo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estadísticas
  const totalM2Perdidos = mermas.reduce((sum, m) => sum + m.metrosCuadrados, 0)
  
  const mermasPorMotivo = mermas.reduce((acc, m) => {
    acc[m.motivo] = (acc[m.motivo] || 0) + m.metrosCuadrados
    return acc
  }, {} as Record<string, number>)
  const motivosOrdenados = Object.entries(mermasPorMotivo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen mermas" meta={`${mermas.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
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

      <AdminPanelCard title="Detalle por proceso" meta="M2 perdidos">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Por picar</span>
            <span className="font-semibold">{(mermasPorMotivo['Partida al picar'] || 0).toFixed(2)} m2</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Por pulir</span>
            <span className="font-semibold">{(mermasPorMotivo['Partida al pulir'] || 0).toFixed(2)} m2</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Recortes</span>
            <span className="font-semibold">{(mermasPorMotivo['Recorte aprovechable'] || 0).toFixed(2)} m2</span>
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
                <span className="text-xs font-semibold text-rose-700">{total.toFixed(2)} m2</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  // Referencia de m² por dimensión de losa
  const m2PorDimension: Record<Dimension, number> = {
    '40x40': 0.16,
    '60x40': 0.24,
    '80x40': 0.32
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const origen = bloquesYLotes.find(b => b.id === formData.origenId)
    if (!origen) return

    const newMerma: Merma = {
      id: `M${String(mermas.length + 1).padStart(3, '0')}`,
      fecha: new Date().toISOString().split('T')[0],
      origenId: formData.origenId,
      origenNombre: origen.nombre,
      tipo: formData.tipo,
      dimension: formData.dimension,
      metrosCuadrados: formData.metrosCuadrados,
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
      metrosCuadrados: 0.1,
      motivo: 'Partida al picar',
      observaciones: ''
    })
    if (closeDialog) {
      setIsDialogOpen(false)
    }
  }

  // Equivalente en losas (aproximado)
  const losasEquivalentes = formData.metrosCuadrados / m2PorDimension[formData.dimension]

  const columns: Column<Merma>[] = [
    { key: 'fecha', header: 'Fecha' },
    { key: 'origenNombre', header: 'Bloque/Lote' },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: (m) => <Badge variant="outline">{m.tipo}</Badge>
    },
    { key: 'dimension', header: 'Dimensión Ref.' },
    { 
      key: 'metrosCuadrados', 
      header: 'm² Perdidos',
      render: (m) => <span className="font-bold text-destructive">{m.metrosCuadrados.toFixed(2)} m²</span>
    },
    { 
      key: 'motivo', 
      header: 'Motivo',
      render: (m) => {
        const colors: Record<string, string> = {
          'Partida al picar': 'bg-blue-100 text-blue-800',
          'Partida al pulir': 'bg-green-100 text-green-800',
          'Defecto de material': 'bg-amber-100 text-amber-800',
          'Recorte aprovechable': 'bg-purple-100 text-purple-800',
          'Otro': 'bg-gray-100 text-gray-800'
        }
        return <Badge className={colors[m.motivo] || colors['Otro']}>{m.motivo}</Badge>
      }
    },
    { 
      key: 'observaciones', 
      header: 'Observaciones',
      render: (m) => (
        <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
          {m.observaciones || '-'}
        </span>
      )
    },
  ]

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Control de Mermas
          </h1>
          <p className="mt-1 text-muted-foreground">
              Registra las pérdidas de material en metros cuadrados
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
                <Label>Metros Cuadrados Perdidos</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.metrosCuadrados}
                  onChange={(e) => setFormData({ ...formData, metrosCuadrados: Number(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa directamente los m² perdidos. Si una losa se parte parcialmente, solo registra la parte no aprovechable.
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
                  <span className="text-muted-foreground">Metros cuadrados:</span>
                  <span className="text-right font-bold text-destructive">{formData.metrosCuadrados.toFixed(2)} m²</span>
                  <span className="text-muted-foreground">Equivalente aprox. en losas {formData.dimension}:</span>
                  <span className="text-right text-muted-foreground">~{losasEquivalentes.toFixed(1)} losas</span>
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
            <h4 className="font-medium text-blue-800">Registro en Metros Cuadrados</h4>
            <p className="text-sm text-blue-700">
              Las mermas se registran directamente en <strong>metros cuadrados</strong>. Si una losa se parte, 
              pero parte del material se puede aprovechar para una medida más pequeña, solo registra la porción 
              que realmente se perdió. Esto permite un control más preciso del desperdicio real.
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

      {/* Table */}
      <DataTable
        data={filteredMermas}
        columns={columns}
        emptyMessage="No hay registros de mermas"
      />
      </div>
    </AdminShell>
  )
}
