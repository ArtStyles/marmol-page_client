'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { catalogoItems } from '@/lib/catalogo-data'
import { dimensiones, estadosLosa, tiposProducto } from '@/lib/data'
import type { CatalogoItem, Dimension, EstadoLosa, TipoProducto } from '@/lib/types'
import { losasAMetros } from '@/lib/types'
import { Plus, Search, Star, Eye, EyeOff, Edit, Trash2 } from 'lucide-react'
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

type CatalogoAdminItem = CatalogoItem & { visible: boolean }

const initialItems: CatalogoAdminItem[] = catalogoItems.map((item) => ({
  ...item,
  visible: true,
}))

export default function CatalogoAdminPage() {
  const [items, setItems] = useState<CatalogoAdminItem[]>(initialItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [acabadoFilter, setAcabadoFilter] = useState<string>('all')
  const [dimensionFilter, setDimensionFilter] = useState<string>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all')
  const [featuredFilter, setFeaturedFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogoAdminItem | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Piso' as TipoProducto,
    acabado: 'Pulido' as EstadoLosa,
    dimension: '60x40' as Dimension,
    precioM2: 0,
    stockLosas: 0,
    destacado: false,
    visible: true,
    descripcion: '',
    imagen: '/marble-carrara.jpg',
  })

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = tipoFilter === 'all' || item.tipo === tipoFilter
    const matchesAcabado = acabadoFilter === 'all' || item.acabado === acabadoFilter
    const matchesDimension = dimensionFilter === 'all' || item.dimension === dimensionFilter
    const matchesVisibility =
      visibilityFilter === 'all' ||
      (visibilityFilter === 'visible' && item.visible) ||
      (visibilityFilter === 'oculto' && !item.visible)
    const matchesFeatured =
      featuredFilter === 'all' ||
      (featuredFilter === 'destacado' && item.destacado) ||
      (featuredFilter === 'normal' && !item.destacado)

    return (
      matchesSearch &&
      matchesTipo &&
      matchesAcabado &&
      matchesDimension &&
      matchesVisibility &&
      matchesFeatured
    )
  })

  const totalVisibles = items.filter((item) => item.visible).length
  const totalDestacados = items.filter((item) => item.destacado).length
  const totalStock = items.reduce((sum, item) => sum + item.stockLosas, 0)
  const valorEstimado = items.reduce(
    (sum, item) => sum + losasAMetros(item.stockLosas, item.dimension) * item.precioM2,
    0,
  )
  const visiblesRecientes = items.filter((item) => item.visible).slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen catalogo" meta={`${items.length} items`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Visibles</span>
            <span className="font-semibold">{totalVisibles}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Destacados</span>
            <span className="font-semibold">{totalDestacados}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Stock total</span>
            <span className="font-semibold">{totalStock} losas</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Valor estimado</span>
            <span className="font-semibold">${valorEstimado.toLocaleString()}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Visibles recientes" meta="Landing">
        <div className="space-y-2 text-sm text-slate-700">
          {visiblesRecientes.length === 0 ? (
            <p className="text-xs text-slate-500">Sin items visibles.</p>
          ) : (
            visiblesRecientes.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-900">{item.nombre}</p>
                  {item.destacado && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.2em]">
                      Destacado
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {item.dimension} · ${item.precioM2}/m2
                </p>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (editingItem) {
      setItems(items.map((item) => (item.id === editingItem.id ? { ...editingItem, ...formData } : item)))
    } else {
      const newItem: CatalogoAdminItem = {
        id: `C${String(items.length + 1).padStart(3, '0')}`,
        ...formData,
      }
      setItems([newItem, ...items])
    }
    resetForm()
  }

  const handleEdit = (item: CatalogoAdminItem) => {
    setEditingItem(item)
    setFormData({ ...item })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Estas seguro de eliminar este item del catalogo?')) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const toggleVisibility = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item)))
  }

  const toggleFeatured = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, destacado: !item.destacado } : item)))
  }

  const resetForm = () => {
    setEditingItem(null)
    setFormData({
      nombre: '',
      tipo: 'Piso',
      acabado: 'Pulido',
      dimension: '60x40',
      precioM2: 0,
      stockLosas: 0,
      destacado: false,
      visible: true,
      descripcion: '',
      imagen: '/marble-carrara.jpg',
    })
    setIsDialogOpen(false)
  }

  const columns: Column<CatalogoAdminItem>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Nombre' },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (item) => <Badge variant="outline">{item.tipo}</Badge>,
    },
    {
      key: 'acabado',
      header: 'Acabado',
      render: (item) => (
        <Badge variant={item.acabado === 'Pulido' ? 'default' : 'secondary'}>
          {item.acabado}
        </Badge>
      ),
    },
    { key: 'dimension', header: 'Dimension' },
    {
      key: 'precioM2',
      header: 'Precio/m2',
      render: (item) => `$${item.precioM2}`,
    },
    {
      key: 'stockLosas',
      header: 'Stock',
      render: (item) => <span className="font-medium">{item.stockLosas} losas</span>,
    },
    {
      key: 'visible',
      header: 'Visible',
      render: (item) => (
        <Badge variant={item.visible ? 'default' : 'secondary'}>
          {item.visible ? 'Visible' : 'Oculto'}
        </Badge>
      ),
    },
    {
      key: 'destacado',
      header: 'Destacado',
      render: (item) => (
        <Badge variant={item.destacado ? 'default' : 'outline'}>
          {item.destacado ? 'Destacado' : 'Normal'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (item) => (
        <div className="flex flex-wrap gap-2">
          <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => toggleVisibility(item.id)}>
            {item.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => toggleFeatured(item.id)}>
            <Star className={`h-4 w-4 ${item.destacado ? 'text-amber-500' : ''}`} />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Catálogo landing</h1>
          <p className="mt-1 text-muted-foreground">
            Administra la seleccion que se muestra en el catalogo del landing. Datos mock por ahora.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar item del catalogo' : 'Agregar item al catalogo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.nombre}
                  onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                  placeholder="Calacatta Gold Signature 80x40"
                  required
                />
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: TipoProducto) =>
                      setFormData({ ...formData, tipo: value })
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
                  <Label>Acabado</Label>
                  <Select
                    value={formData.acabado}
                    onValueChange={(value: EstadoLosa) =>
                      setFormData({ ...formData, acabado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosLosa.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dimension</Label>
                  <Select
                    value={formData.dimension}
                    onValueChange={(value: Dimension) =>
                      setFormData({ ...formData, dimension: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensiones.map((dimensionValue) => (
                        <SelectItem key={dimensionValue} value={dimensionValue}>
                          {dimensionValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Precio por m2</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.precioM2}
                    onChange={(event) =>
                      setFormData({ ...formData, precioM2: Number(event.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock (losas)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.stockLosas}
                    onChange={(event) =>
                      setFormData({ ...formData, stockLosas: Number(event.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
                  placeholder="Breve descripcion para el catalogo."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Imagen (ruta)</Label>
                <Input
                  value={formData.imagen}
                  onChange={(event) => setFormData({ ...formData, imagen: event.target.value })}
                  placeholder="/marble-carrara.jpg"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Visible en landing</p>
                    <p className="text-xs text-muted-foreground">Controla si se muestra al publico</p>
                  </div>
                  <Switch
                    checked={formData.visible}
                    onCheckedChange={(checked) => setFormData({ ...formData, visible: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Destacado</p>
                    <p className="text-xs text-muted-foreground">Prioriza en orden y seccion</p>
                  </div>
                  <Switch
                    checked={formData.destacado}
                    onCheckedChange={(checked) => setFormData({ ...formData, destacado: checked })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingItem ? 'Guardar cambios' : 'Agregar al catalogo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="flex-1">
            <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Buscar</Label>
            <div className="mt-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre o descripcion"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:flex md:flex-wrap">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Tipo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposProducto.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Acabado</Label>
              <Select value={acabadoFilter} onValueChange={setAcabadoFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Acabado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estadosLosa.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Dimension</Label>
              <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {dimensiones.map((dimensionValue) => (
                    <SelectItem key={dimensionValue} value={dimensionValue}>
                      {dimensionValue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Visibilidad</Label>
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Visibilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="oculto">Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Destacados</Label>
              <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Destacados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="destacado">Destacado</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        title="Productos del catalogo landing"
        data={filteredItems}
        columns={columns}
        emptyMessage="No hay productos para mostrar en el catalogo."
      />
      </div>
    </AdminShell>
  )
}
