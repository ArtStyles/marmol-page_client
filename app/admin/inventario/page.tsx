'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  bloquesYLotes,
  tiposProducto,
  estadosLosa,
  dimensiones
} from '@/lib/data'
import { losasAMetros } from '@/lib/types'
import type { Producto, Dimension, TipoProducto, EstadoLosa } from '@/lib/types'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { useProductosStore } from '@/hooks/use-productos'
import { Plus, Search, Edit, Trash2, Package, Ruler } from 'lucide-react'
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

export default function InventarioPage() {
  const { config } = useConfiguracion()

  const getPrecioDefault = (dimension: Dimension, estado: EstadoLosa) => {
    const tipo = estado === 'Pulido' ? 'pulido' : 'crudo'
    return config.preciosM2[dimension][tipo]
  }

  const { productos, setProductos } = useProductosStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Piso' as TipoProducto,
    estado: 'Crudo' as EstadoLosa,
    dimension: '60x40' as Dimension,
    origenId: '',
    cantidadLosas: 0,
    precioM2: getPrecioDefault('60x40', 'Crudo'),
    imagen: '/marble-carrara.jpg'
  })

  const filteredProductos = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.origenNombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = tipoFilter === 'all' || p.tipo === tipoFilter
    const matchesEstado = estadoFilter === 'all' || p.estado === estadoFilter
    return matchesSearch && matchesTipo && matchesEstado
  })

  // Estadísticas
  const totalLosas = productos.reduce((sum, p) => sum + p.cantidadLosas, 0)
  const totalM2 = productos.reduce((sum, p) => sum + p.metrosCuadrados, 0)
  const valorInventario = productos.reduce((sum, p) => sum + (p.metrosCuadrados * p.precioM2), 0)
  const productosStockBajo = productos.filter(p => p.cantidadLosas < 20).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const origen = bloquesYLotes.find(b => b.id === formData.origenId)
    if (!origen) return

    const metrosCuadrados = losasAMetros(formData.cantidadLosas, formData.dimension)

    if (editingProduct) {
      setProductos(productos.map(p => 
        p.id === editingProduct.id 
          ? { 
              ...p, 
              ...formData,
              origenNombre: origen.nombre,
              metrosCuadrados
            } as Producto
          : p
      ))
    } else {
      const newProducto: Producto = {
        id: `P${String(productos.length + 1).padStart(3, '0')}`,
        nombre: formData.nombre,
        tipo: formData.tipo,
        estado: formData.estado,
        dimension: formData.dimension,
        origenId: formData.origenId,
        origenNombre: origen.nombre,
        cantidadLosas: formData.cantidadLosas,
        metrosCuadrados,
        precioM2: formData.precioM2,
        imagen: formData.imagen
      }
      setProductos([...productos, newProducto])
    }
    resetForm()
  }

  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto)
    setFormData({
      nombre: producto.nombre,
      tipo: producto.tipo,
      estado: producto.estado,
      dimension: producto.dimension,
      origenId: producto.origenId,
      cantidadLosas: producto.cantidadLosas,
      precioM2: producto.precioM2,
      imagen: producto.imagen
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto del inventario?')) {
      setProductos(productos.filter(p => p.id !== id))
    }
  }

  const resetForm = () => {
    setEditingProduct(null)
    setFormData({
      nombre: '',
      tipo: 'Piso',
      estado: 'Crudo',
      dimension: '60x40',
      origenId: '',
      cantidadLosas: 0,
      precioM2: getPrecioDefault('60x40', 'Crudo'),
      imagen: '/marble-carrara.jpg'
    })
    setIsDialogOpen(false)
  }

  // Calcular m2 en tiempo real
  const m2Calculados = losasAMetros(formData.cantidadLosas, formData.dimension)

  const columns: Column<Producto>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nombre', header: 'Nombre' },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: (p) => <Badge variant="outline">{p.tipo}</Badge>
    },
    { 
      key: 'estado', 
      header: 'Estado',
      render: (p) => (
        <Badge variant={p.estado === 'Pulido' ? 'default' : 'secondary'}>
          {p.estado}
        </Badge>
      )
    },
    { key: 'dimension', header: 'Dimensión' },
    { key: 'origenNombre', header: 'Origen' },
    { 
      key: 'cantidadLosas', 
      header: 'Losas',
      render: (p) => (
        <span className={p.cantidadLosas < 20 ? 'text-destructive font-bold' : 'font-medium'}>
          {p.cantidadLosas}
        </span>
      )
    },
    { 
      key: 'metrosCuadrados', 
      header: 'm²',
      render: (p) => `${p.metrosCuadrados.toFixed(1)} m²`
    },
    { 
      key: 'precioM2', 
      header: 'Precio/m²',
      render: (p) => `$${p.precioM2}`
    },
    { 
      key: 'valor', 
      header: 'Valor Total',
      render: (p) => (
        <span className="font-bold text-primary">
          ${(p.metrosCuadrados * p.precioM2).toLocaleString()}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (p) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
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
            Inventario
          </h1>
          <p className="mt-1 text-muted-foreground">
            Material disponible para vender. Se alimenta desde producción y se descuenta desde ventas.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar al Inventario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Agregar al Inventario'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Producto</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Piso Carrara 60x40 Pulido"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
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
                  <Label>Estado</Label>
                  <Select 
                    value={formData.estado} 
                    onValueChange={(value: EstadoLosa) => setFormData((prev) => ({
                      ...prev,
                      estado: value,
                      precioM2: getPrecioDefault(prev.dimension, value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosLosa.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dimensión</Label>
                  <Select 
                    value={formData.dimension} 
                    onValueChange={(value: Dimension) => setFormData((prev) => ({
                      ...prev,
                      dimension: value,
                      precioM2: getPrecioDefault(value, prev.estado)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensiones.map((d) => (
                        <SelectItem key={d} value={d}>{d} cm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                  <Label>Cantidad de Losas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.cantidadLosas}
                    onChange={(e) => setFormData({ ...formData, cantidadLosas: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio por m²</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.precioM2}
                    onChange={(e) => setFormData({ ...formData, precioM2: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {/* Cálculo automático */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h4 className="font-medium">Conversión Automática</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Losas:</span>
                  <span className="text-right">{formData.cantidadLosas}</span>
                  <span className="text-muted-foreground">Metros cuadrados:</span>
                  <span className="text-right font-bold">{m2Calculados.toFixed(2)} m²</span>
                  <span className="text-muted-foreground">Valor total:</span>
                  <span className="text-right font-bold text-primary">
                    ${(m2Calculados * formData.precioM2).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Principio */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800">Principio del Sistema</h4>
            <p className="text-sm text-green-700">
              El inventario representa material real disponible para vender. Se alimenta únicamente 
              desde la producción diaria y se descuenta únicamente desde las ventas.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Losas"
          value={totalLosas}
          description="losas en inventario"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Total m²"
          value={`${totalM2.toFixed(1)} m²`}
          description="metros cuadrados"
          icon={<Ruler className="h-5 w-5" />}
        />
        <StatCard
          title="Valor del Inventario"
          value={`$${valorInventario.toLocaleString()}`}
          description="a precio de venta"
        />
        <StatCard
          title="Stock Bajo"
          value={productosStockBajo}
          description="productos < 20 losas"
          trend={productosStockBajo > 0 ? { value: productosStockBajo, isPositive: false } : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {tiposProducto.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {estadosLosa.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredProductos}
        columns={columns}
        emptyMessage="No hay productos en inventario"
      />
    </div>
  )
}
