'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ventas as initialVentas } from '@/lib/data'
import type { Venta } from '@/lib/types'
import { useProductosStore } from '@/hooks/use-productos'
import { Plus, Search, Eye, DollarSign, Clock, CheckCircle, ShoppingCart } from 'lucide-react'
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

export default function VentasPage() {
  const { productos } = useProductosStore()
  const [ventas, setVentas] = useState<Venta[]>(initialVentas)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [formData, setFormData] = useState({
    productoId: '',
    cantidadM2: 1,
    descuento: 0,
    fondoOperativo: 0,
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: ''
  })

  const filteredVentas = ventas.filter(v => {
    const matchesSearch = 
      v.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.productoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || v.estado === statusFilter
    return matchesSearch && matchesStatus
  })

    // Estadísticas
  const ventasCompletadas = ventas.filter(v => v.estado === 'completada')
  const totalRevenue = ventasCompletadas.reduce((sum, v) => sum + v.total, 0)
  const ventasPendientes = ventas.filter(v => v.estado === 'pendiente')
  const totalM2Vendidos = ventasCompletadas.reduce((sum, v) => sum + v.cantidadM2, 0)
  const avgSaleValue = ventasCompletadas.length > 0 
    ? totalRevenue / ventasCompletadas.length 
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const producto = productos.find(p => p.id === formData.productoId)
    if (!producto) return

    const subtotal = formData.cantidadM2 * producto.precioM2
    const descuentoMonto = subtotal * (formData.descuento / 100)
    const total = subtotal - descuentoMonto + formData.fondoOperativo

    const newVenta: Venta = {
      id: `V${String(ventas.length + 1).padStart(3, '0')}`,
      productoId: formData.productoId,
      productoNombre: producto.nombre,
      cantidadM2: formData.cantidadM2,
      precioM2: producto.precioM2,
      descuento: formData.descuento,
      fondoOperativo: formData.fondoOperativo,
      subtotal,
      total,
      clienteNombre: formData.clienteNombre,
      clienteEmail: formData.clienteEmail,
      clienteTelefono: formData.clienteTelefono,
      fecha: new Date().toISOString().split('T')[0],
      estado: 'pendiente'
    }
    setVentas([newVenta, ...ventas])
    resetForm()
  }

  const updateStatus = (id: string, estado: Venta['estado']) => {
    setVentas(ventas.map(v => v.id === id ? { ...v, estado } : v))
  }

  const resetForm = () => {
    setFormData({
      productoId: '',
      cantidadM2: 1,
      descuento: 0,
      fondoOperativo: 0,
      clienteNombre: '',
      clienteEmail: '',
      clienteTelefono: ''
    })
    setIsDialogOpen(false)
  }

  // Calcular precio en tiempo real
  const productoSeleccionado = productos.find(p => p.id === formData.productoId)
  const subtotalCalculado = productoSeleccionado 
    ? formData.cantidadM2 * productoSeleccionado.precioM2 
    : 0
  const descuentoCalculado = subtotalCalculado * (formData.descuento / 100)
  const totalCalculado = subtotalCalculado - descuentoCalculado + formData.fondoOperativo

  const columns: Column<Venta>[] = [
    { key: 'id', header: 'ID' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'productoNombre', header: 'Producto' },
    { key: 'clienteNombre', header: 'Cliente' },
    { 
      key: 'cantidadM2', 
      header: 'm²',
      render: (v) => <span className="font-medium">{v.cantidadM2} m²</span>
    },
    { 
      key: 'precioM2', 
      header: 'Precio/m²',
      render: (v) => `$${v.precioM2}`
    },
    { 
      key: 'descuento', 
      header: 'Descuento',
      render: (v) => v.descuento > 0 
        ? <span className="text-green-600">-{v.descuento}%</span> 
        : '-'
    },
    { 
      key: 'fondoOperativo', 
      header: 'Fondo Op.',
      render: (v) => v.fondoOperativo > 0 ? `+$${v.fondoOperativo}` : '-'
    },
    { 
      key: 'total', 
      header: 'Total',
      render: (v) => <span className="font-bold text-primary">${v.total.toLocaleString()}</span>
    },
    { 
      key: 'estado', 
      header: 'Estado',
      render: (v) => {
        const colors: Record<string, string> = {
          completada: 'bg-green-100 text-green-800',
          pendiente: 'bg-amber-100 text-amber-800',
          cancelada: 'bg-red-100 text-red-800'
        }
        return <Badge className={colors[v.estado]}>{v.estado}</Badge>
      }
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (v) => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={() => setSelectedVenta(v)}>
            <Eye className="h-4 w-4" />
          </Button>
          {v.estado === 'pendiente' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateStatus(v.id, 'completada')}
            >
              Completar
            </Button>
          )}
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
            Ventas
          </h1>
          <p className="mt-1 text-muted-foreground">
            Las ventas se manejan en metros cuadrados. Incluyen precio, descuentos y fondo operativo.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Venta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select 
                  value={formData.productoId} 
                  onValueChange={(value) => setFormData({ ...formData, productoId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((producto) => (
                      <SelectItem key={producto.id} value={producto.id}>
                        {producto.nombre} - ${producto.precioM2}/m² ({producto.metrosCuadrados.toFixed(1)} m² disp.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cantidad (m²)</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.cantidadM2}
                    onChange={(e) => setFormData({ ...formData, cantidadM2: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descuento (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.descuento}
                    onChange={(e) => setFormData({ ...formData, descuento: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fondo Operativo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.fondoOperativo}
                    onChange={(e) => setFormData({ ...formData, fondoOperativo: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nombre del Cliente</Label>
                <Input
                  value={formData.clienteNombre}
                  onChange={(e) => setFormData({ ...formData, clienteNombre: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.clienteEmail}
                    onChange={(e) => setFormData({ ...formData, clienteEmail: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    type="tel"
                    value={formData.clienteTelefono}
                    onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Cálculo en tiempo real */}
              {productoSeleccionado && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-medium">Resumen de Venta</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Subtotal ({formData.cantidadM2} m² x ${productoSeleccionado.precioM2}):</span>
                    <span className="text-right">${subtotalCalculado.toFixed(2)}</span>
                    <span className="text-muted-foreground">Descuento ({formData.descuento}%):</span>
                    <span className="text-right text-green-600">-${descuentoCalculado.toFixed(2)}</span>
                    <span className="text-muted-foreground">Fondo operativo:</span>
                    <span className="text-right">+${formData.fondoOperativo}</span>
                    <span className="font-medium">Total:</span>
                    <span className="text-right font-bold text-primary">${totalCalculado.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Registrar Venta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Principio */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <ShoppingCart className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Principio del Sistema</h4>
            <p className="text-sm text-blue-700">
              Las ventas se manejan en metros cuadrados. El dinero nunca manda sobre la realidad física, 
              solo la refleja. No puede existir una venta sin inventario previo.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos Totales"
          value={`$${totalRevenue.toLocaleString()}`}
          description="ventas completadas"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="m² Vendidos"
          value={`${totalM2Vendidos.toFixed(1)} m²`}
          description="metros cuadrados"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <StatCard
          title="Ventas Pendientes"
          value={ventasPendientes.length}
          description="requieren atención"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Valor Promedio"
          value={`$${Math.round(avgSaleValue).toLocaleString()}`}
          description="por venta"
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ventas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="completada">Completadas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={filteredVentas}
        columns={columns}
        emptyMessage="No se encontraron ventas"
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedVenta} onOpenChange={() => setSelectedVenta(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedVenta && (
            <>
              <DialogHeader>
                <DialogTitle>Detalle de Venta {selectedVenta.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Producto</p>
                    <p className="font-medium">{selectedVenta.productoNombre}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cantidad</p>
                    <p className="font-medium">{selectedVenta.cantidadM2} m²</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedVenta.clienteNombre}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedVenta.clienteEmail}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{selectedVenta.clienteTelefono}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha</p>
                    <p className="font-medium">{selectedVenta.fecha}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${selectedVenta.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento ({selectedVenta.descuento}%):</span>
                    <span className="text-green-600">-${(selectedVenta.subtotal * selectedVenta.descuento / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fondo operativo:</span>
                    <span>+${selectedVenta.fondoOperativo}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-xl text-primary">${selectedVenta.total.toLocaleString()}</span>
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

