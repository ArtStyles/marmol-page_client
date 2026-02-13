'use client'

import React from "react"
import { useEffect, useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { bloquesYLotes as initialBloques } from '@/lib/data'
import type { BloqueOLote } from '@/lib/types'
import { ADMIN_STORAGE_KEY, type AdminUser } from '@/lib/admin-auth'
import { Plus, Search, Boxes, Eye, Edit, Trash2 } from 'lucide-react'
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
  const [editingBloque, setEditingBloque] = useState<BloqueOLote | null>(null)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [numericTouched, setNumericTouched] = useState({
    costo: false,
    metrosComprados: false,
  })
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Bloque' as 'Bloque' | 'Lote',
    costo: 0,
    metrosComprados: 0,
    proveedor: ''
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return
    try {
      setCurrentUser(JSON.parse(raw) as AdminUser)
    } catch {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    }
  }, [])

  const isAdmin = currentUser?.role === 'Administrador'

  const filteredBloques = bloques.filter(b => 
    b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estadísticas
  const bloquesActivos = bloques.filter(b => b.estado === 'activo')
  const totalInversion = bloques.reduce((sum, b) => sum + b.costo, 0)
  const totalMetrosComprados = bloques.reduce((sum, b) => sum + b.metrosComprados, 0)
  const proveedores = new Set(bloques.map(b => b.proveedor)).size
  const today = new Date().toISOString().split('T')[0]
  const canModify = (fechaIngreso: string) => isAdmin || fechaIngreso === today
  const recentBloques = [...bloques]
    .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso))
    .slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen bloques" meta={`${bloques.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Activos</span>
            <span className="font-semibold">{bloquesActivos.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Inversion total</span>
            <span className="font-semibold">${totalInversion.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Metros comprados</span>
            <span className="font-semibold">{totalMetrosComprados.toFixed(1)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Proveedores</span>
            <span className="font-semibold">{proveedores}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Entradas recientes" meta="Ultimos registros">
        <div className="space-y-2 text-sm text-slate-700">
          {recentBloques.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros recientes.</p>
          ) : (
            recentBloques.map((bloque) => (
              <div key={bloque.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{bloque.nombre}</p>
                  <p className="text-[11px] text-slate-500">{bloque.fechaIngreso}</p>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {bloque.tipo}
                </Badge>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingBloque) {
      if (!canModify(editingBloque.fechaIngreso)) return
      setBloques(bloques.map(b => 
        b.id === editingBloque.id
          ? {
              ...b,
              nombre: formData.nombre,
              tipo: formData.tipo,
              costo: formData.costo,
              metrosComprados: formData.metrosComprados,
              proveedor: formData.proveedor,
            } as BloqueOLote
          : b
      ))
      resetForm()
      return
    }

    const newBloque: BloqueOLote = {
      id: formData.tipo === 'Bloque' 
        ? `BL${String(bloques.filter(b => b.tipo === 'Bloque').length + 1).padStart(3, '0')}`
        : `LT${String(bloques.filter(b => b.tipo === 'Lote').length + 1).padStart(3, '0')}`,
      nombre: formData.nombre,
      tipo: formData.tipo,
      costo: formData.costo,
      metrosComprados: formData.metrosComprados,
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

  const handleEdit = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    setEditingBloque(bloque)
    setFormData({
      nombre: bloque.nombre,
      tipo: bloque.tipo,
      costo: bloque.costo,
      metrosComprados: bloque.metrosComprados,
      proveedor: bloque.proveedor,
    })
    setNumericTouched({
      costo: true,
      metrosComprados: true,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    if (confirm('Eliminar este bloque/lote?')) {
      setBloques(bloques.filter(b => b.id !== bloque.id))
    }
  }

  const toggleEstado = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return

    setBloques(bloques.map(b => 
      b.id === bloque.id 
        ? { ...b, estado: b.estado === 'activo' ? 'agotado' : 'activo' } as BloqueOLote
        : b
    ))
  }

  const resetForm = () => {
    setEditingBloque(null)
    setFormData({
      nombre: '',
      tipo: 'Bloque',
      costo: 0,
      metrosComprados: 0,
      proveedor: ''
    })
    setNumericTouched({
      costo: false,
      metrosComprados: false,
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
    { 
      key: 'metrosComprados', 
      header: 'm2 Comprados',
      render: (b) => `${b.metrosComprados.toFixed(1)} m2`
    },
    { key: 'fechaIngreso', header: 'Ingreso' },
    { key: 'proveedor', header: 'Proveedor' },
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
      render: (b) => {
        const allowed = canModify(b.fechaIngreso)
        const blockedTitle = 'Solo administrador despues del dia'
        return (
          <div className="flex flex-wrap gap-2">
            <Button size="icon" variant="ghost" onClick={() => setSelectedBloque(b)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleEdit(b)}
              disabled={!allowed}
              title={allowed ? 'Editar' : blockedTitle}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleDelete(b)}
              disabled={!allowed}
              title={allowed ? 'Eliminar' : blockedTitle}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleEstado(b)}
              disabled={!allowed}
              title={allowed ? (b.estado === 'activo' ? 'Agotar' : 'Reactivar') : blockedTitle}
            >
              {b.estado === 'activo' ? 'Agotar' : 'Reactivar'}
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sans">
            Materia prima
          </h1>
          <p className="mt-1 text-muted-foreground font-sans">
            Gestiona el origen de la materia prima y sus entradas registradas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Bloque/Lote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBloque ? 'Editar Bloque/Lote' : 'Registrar Nuevo Bloque/Lote'}</DialogTitle>
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
                    placeholder="0"
                    value={
                      editingBloque || numericTouched.costo || formData.costo > 0
                        ? formData.costo
                        : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value
                      setNumericTouched((prev) => ({ ...prev, costo: value !== '' }))
                      setFormData({ ...formData, costo: value === '' ? 0 : Number(value) })
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad comprada (m2)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={
                      editingBloque || numericTouched.metrosComprados || formData.metrosComprados > 0
                        ? formData.metrosComprados
                        : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value
                      setNumericTouched((prev) => ({ ...prev, metrosComprados: value !== '' }))
                      setFormData({ ...formData, metrosComprados: value === '' ? 0 : Number(value) })
                    }}
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
                  {editingBloque ? 'Guardar' : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Principio del sistema */}
      <div className="rounded-[24px] border border-sky-200/70 bg-sky-50/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Boxes className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Principio del Sistema</h4>
            <p className="text-sm text-blue-700">
              Cada bloque o lote registra su costo, metros comprados, proveedor y fecha de ingreso.
              La produccion y las ganancias se consultan en los modulos correspondientes.
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
              placeholder="Buscar por nombre o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredBloques}
        columns={columns}
        emptyMessage="No hay bloques o lotes registrados"
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedBloque} onOpenChange={() => setSelectedBloque(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
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
                    <p className="text-muted-foreground">Cantidad comprada</p>
                    <p className="font-medium">{selectedBloque.metrosComprados.toFixed(1)} m2</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Proveedor</p>
                    <p className="font-medium">{selectedBloque.proveedor}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Costo</p>
                    <p className="font-medium">${selectedBloque.costo.toLocaleString()}</p>
                  </div>
                </div>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AdminShell>
  )
}


