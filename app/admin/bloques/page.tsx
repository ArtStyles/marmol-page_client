'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { bloquesYLotes as initialBloques } from '@/lib/data'
import type { BloqueOLote } from '@/lib/types'
import { Plus, Search, Boxes, DollarSign, Package, TrendingUp, Eye } from 'lucide-react'
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

export default function BloquesPage() {
  const [bloques, setBloques] = useState<BloqueOLote[]>(initialBloques)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBloque, setSelectedBloque] = useState<BloqueOLote | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Bloque' as 'Bloque' | 'Lote',
    costo: 0,
    proveedor: ''
  })

  const filteredBloques = bloques.filter(b => 
    b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estadísticas
  const bloquesActivos = bloques.filter(b => b.estado === 'activo')
  const totalInversion = bloques.reduce((sum, b) => sum + b.costo, 0)
  const totalGanancia = bloques.reduce((sum, b) => sum + b.gananciaReal, 0)
  const totalLosasProducidas = bloques.reduce((sum, b) => sum + b.losasProducidas, 0)
  const totalLosasPerdidas = bloques.reduce((sum, b) => sum + b.losasPerdidas, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newBloque: BloqueOLote = {
      id: formData.tipo === 'Bloque' 
        ? `BL${String(bloques.filter(b => b.tipo === 'Bloque').length + 1).padStart(3, '0')}`
        : `LT${String(bloques.filter(b => b.tipo === 'Lote').length + 1).padStart(3, '0')}`,
      nombre: formData.nombre,
      tipo: formData.tipo,
      costo: formData.costo,
      fechaIngreso: new Date().toISOString().split('T')[0],
      proveedor: formData.proveedor,
      losasProducidas: 0,
      losasPerdidas: 0,
      metrosVendibles: 0,
      gananciaReal: 0,
      estado: 'activo'
    }

    setBloques([newBloque, ...bloques])
    resetForm()
  }

  const toggleEstado = (id: string) => {
    setBloques(bloques.map(b => 
      b.id === id 
        ? { ...b, estado: b.estado === 'activo' ? 'agotado' : 'activo' } as BloqueOLote
        : b
    ))
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: 'Bloque',
      costo: 0,
      proveedor: ''
    })
    setIsDialogOpen(false)
  }

  const columns: Column<BloqueOLote>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Nombre' },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: (b) => (
        <Badge variant={b.tipo === 'Bloque' ? 'default' : 'secondary'}>
          {b.tipo}
        </Badge>
      )
    },
    { 
      key: 'costo', 
      header: 'Costo',
      render: (b) => `$${b.costo.toLocaleString()}`
    },
    { key: 'fechaIngreso', header: 'Ingreso' },
    { key: 'proveedor', header: 'Proveedor' },
    { 
      key: 'losasProducidas', 
      header: 'Producidas',
      render: (b) => <span className="text-green-600 font-medium">{b.losasProducidas} losas</span>
    },
    { 
      key: 'losasPerdidas', 
      header: 'Perdidas',
      render: (b) => <span className="text-destructive font-medium">{b.losasPerdidas} losas</span>
    },
    { 
      key: 'metrosVendibles', 
      header: 'm² Vendibles',
      render: (b) => `${b.metrosVendibles.toFixed(1)} m²`
    },
    { 
      key: 'gananciaReal', 
      header: 'Ganancia',
      render: (b) => (
        <span className={b.gananciaReal >= 0 ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>
          ${b.gananciaReal.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'estado', 
      header: 'Estado',
      render: (b) => (
        <Badge variant={b.estado === 'activo' ? 'default' : 'outline'}>
          {b.estado === 'activo' ? 'Activo' : 'Agotado'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (b) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => setSelectedBloque(b)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => toggleEstado(b.id)}
          >
            {b.estado === 'activo' ? 'Agotar' : 'Reactivar'}
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Bloques y Lotes
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona el origen de la materia prima y su rentabilidad
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Bloque/Lote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Bloque/Lote</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Bloque Carrara #4"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value: 'Bloque' | 'Lote') => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bloque">Bloque</SelectItem>
                      <SelectItem value="Lote">Lote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Costo ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Input
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                    placeholder="Nombre del proveedor"
                    required
                  />
                </div>
              </div>

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

      {/* Principio del sistema */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Boxes className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Principio del Sistema</h4>
            <p className="text-sm text-blue-700">
              Cada bloque o lote debe permitir saber: cuánto costó, cuántas losas produjo, 
              cuántas se perdieron, cuántos metros vendibles generó, y qué ganancia real dejó.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Bloques/Lotes Activos"
          value={bloquesActivos.length}
          description={`de ${bloques.length} total`}
          icon={<Boxes className="h-5 w-5" />}
        />
        <StatCard
          title="Inversión Total"
          value={`$${totalInversion.toLocaleString()}`}
          description="en materia prima"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Ganancia Real"
          value={`$${totalGanancia.toLocaleString()}`}
          description="después de pérdidas"
          trend={{ value: Math.round((totalGanancia / totalInversion) * 100), isPositive: totalGanancia > 0 }}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Eficiencia"
          value={`${Math.round((totalLosasProducidas / (totalLosasProducidas + totalLosasPerdidas)) * 100)}%`}
          description={`${totalLosasProducidas} producidas / ${totalLosasPerdidas} perdidas`}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <DataTable
        data={filteredBloques}
        columns={columns}
        emptyMessage="No hay bloques o lotes registrados"
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedBloque} onOpenChange={() => setSelectedBloque(null)}>
        <DialogContent className="max-w-lg">
          {selectedBloque && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBloque.nombre}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium">{selectedBloque.tipo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estado</p>
                    <Badge variant={selectedBloque.estado === 'activo' ? 'default' : 'outline'}>
                      {selectedBloque.estado}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha de Ingreso</p>
                    <p className="font-medium">{selectedBloque.fechaIngreso}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Proveedor</p>
                    <p className="font-medium">{selectedBloque.proveedor}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Análisis de Rentabilidad</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-muted-foreground">Costo de Adquisición</p>
                      <p className="text-xl font-bold">${selectedBloque.costo.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-muted-foreground">Ganancia Real</p>
                      <p className="text-xl font-bold text-green-600">${selectedBloque.gananciaReal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Producción</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm text-center">
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-2xl font-bold text-green-600">{selectedBloque.losasProducidas}</p>
                      <p className="text-xs text-muted-foreground">Losas Producidas</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3">
                      <p className="text-2xl font-bold text-destructive">{selectedBloque.losasPerdidas}</p>
                      <p className="text-xs text-muted-foreground">Losas Perdidas</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-2xl font-bold text-blue-600">{selectedBloque.metrosVendibles}</p>
                      <p className="text-xs text-muted-foreground">m² Vendibles</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Eficiencia del Bloque/Lote:</span>
                    <span className="text-xl font-bold">
                      {Math.round((selectedBloque.losasProducidas / (selectedBloque.losasProducidas + selectedBloque.losasPerdidas)) * 100) || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
