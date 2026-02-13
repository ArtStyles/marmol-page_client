'use client'

import React from 'react'
import { useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ventas as initialVentas, dimensiones } from '@/lib/data'
import type { Dimension, Venta } from '@/lib/types'
import { useInventarioStore } from '@/hooks/use-inventario'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { cn } from '@/lib/utils'
import { Eye, Plus, Search, ShoppingCart } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'

const dimensionOptions: Dimension[] = dimensiones as Dimension[]

const createEmptyMetros = (): Record<Dimension, number> => ({
  '40x40': 0,
  '60x40': 0,
  '80x40': 0,
})

export default function VentasPage() {
  const { productos } = useInventarioStore()
  const { config } = useConfiguracion()

  const [ventas, setVentas] = useState<Venta[]>(
    initialVentas.map((venta) => ({ ...venta, estado: 'completada' })),
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [numericTouched, setNumericTouched] = useState({
    descuento: false,
    metrosPorDimension: {
      '40x40': false,
      '60x40': false,
      '80x40': false,
    } as Record<Dimension, boolean>,
  })
  const [formData, setFormData] = useState({
    productoId: '',
    descuento: 0,
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: '',
    metrosPorDimension: createEmptyMetros(),
  })

  const formatMoney = (value: number) => `$${Math.round(value).toLocaleString()}`

  const getMetrosVenta = (venta: Venta): Record<Dimension, number> => {
    if (venta.metrosPorDimension) {
      return {
        '40x40': venta.metrosPorDimension['40x40'] ?? 0,
        '60x40': venta.metrosPorDimension['60x40'] ?? 0,
        '80x40': venta.metrosPorDimension['80x40'] ?? 0,
      }
    }

    const producto = productos.find((p) => p.id === venta.productoId)
    const fallback = createEmptyMetros()
    if (producto) {
      fallback[producto.dimension] = venta.cantidadM2
    }
    return fallback
  }

  const filteredVentas = ventas.filter((venta) => {
    const query = searchTerm.toLowerCase()
    return (
      venta.id.toLowerCase().includes(query) ||
      venta.productoNombre.toLowerCase().includes(query) ||
      venta.clienteNombre.toLowerCase().includes(query)
    )
  })

  const groupedByDate = filteredVentas.reduce<Record<string, Venta[]>>((acc, venta) => {
    if (!acc[venta.fecha]) {
      acc[venta.fecha] = []
    }
    acc[venta.fecha].push(venta)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const ventasCompletadas = ventas
  const totalRevenue = ventasCompletadas.reduce((sum, venta) => sum + venta.total, 0)

  const totalM2PorDimension = ventasCompletadas.reduce<Record<Dimension, number>>(
    (acc, venta) => {
      const metros = getMetrosVenta(venta)
      acc['40x40'] += metros['40x40']
      acc['60x40'] += metros['60x40']
      acc['80x40'] += metros['80x40']
      return acc
    },
    createEmptyMetros(),
  )

  const totalM2Vendidos =
    totalM2PorDimension['40x40'] + totalM2PorDimension['60x40'] + totalM2PorDimension['80x40']

  const avgSaleValue = ventasCompletadas.length > 0 ? totalRevenue / ventasCompletadas.length : 0

  const recentVentas = [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen ventas" meta={`${ventas.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Ingresos</span>
            <span className="font-semibold">{formatMoney(totalRevenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>m2 vendidos</span>
            <span className="font-semibold">{totalM2Vendidos.toFixed(1)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Completadas</span>
            <span className="font-semibold">{ventasCompletadas.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Promedio</span>
            <span className="font-semibold">{formatMoney(avgSaleValue)}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="m2 por dimension" meta="Ventas completadas">
        <div className="space-y-2 text-sm text-slate-700">
          {dimensionOptions.map((dimension) => (
            <div key={dimension} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span>{dimension}</span>
              <span className="font-semibold text-slate-900">{totalM2PorDimension[dimension].toFixed(2)} m2</span>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Ultimas ventas" meta="Ultimos registros">
        <div className="space-y-2 text-sm text-slate-700">
          {recentVentas.length === 0 ? (
            <p className="text-xs text-slate-500">Sin ventas recientes.</p>
          ) : (
            recentVentas.map((venta) => (
              <div key={venta.id} className="rounded-2xl bg-white/70 px-3 py-2">
                <p className="text-xs font-semibold text-slate-900">{venta.productoNombre}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{venta.fecha}</span>
                  <span>{formatMoney(venta.total)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const productoSeleccionado = productos.find((producto) => producto.id === formData.productoId)

  const getPrecioDimension = (dimension: Dimension): number => {
    if (!productoSeleccionado) return 0
    const estado = productoSeleccionado.estado === 'Pulido' ? 'pulido' : 'crudo'
    return config.preciosM2[dimension][estado]
  }

  const totalM2Form = dimensionOptions.reduce(
    (sum, dimension) => sum + (formData.metrosPorDimension[dimension] || 0),
    0,
  )

  const subtotalCalculado = dimensionOptions.reduce((sum, dimension) => {
    const metros = formData.metrosPorDimension[dimension] || 0
    return sum + metros * getPrecioDimension(dimension)
  }, 0)

  const descuentoCalculado = subtotalCalculado * (formData.descuento / 100)
  const totalCalculado = subtotalCalculado - descuentoCalculado

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const producto = productos.find((p) => p.id === formData.productoId)
    if (!producto) return
    if (totalM2Form <= 0) return

    const precioPromedio = totalM2Form > 0 ? subtotalCalculado / totalM2Form : 0

    const newVenta: Venta = {
      id: `V${String(ventas.length + 1).padStart(3, '0')}`,
      productoId: producto.id,
      productoNombre: producto.nombre,
      cantidadM2: totalM2Form,
      metrosPorDimension: {
        '40x40': formData.metrosPorDimension['40x40'] || 0,
        '60x40': formData.metrosPorDimension['60x40'] || 0,
        '80x40': formData.metrosPorDimension['80x40'] || 0,
      },
      precioM2: precioPromedio,
      descuento: formData.descuento,
      fondoOperativo: 0,
      subtotal: subtotalCalculado,
      total: totalCalculado,
      clienteNombre: formData.clienteNombre,
      clienteEmail: formData.clienteEmail,
      clienteTelefono: formData.clienteTelefono,
      fecha: new Date().toISOString().split('T')[0],
      estado: 'completada',
    }

    setVentas([newVenta, ...ventas])
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      productoId: '',
      descuento: 0,
      clienteNombre: '',
      clienteEmail: '',
      clienteTelefono: '',
      metrosPorDimension: createEmptyMetros(),
    })
    setNumericTouched({
      descuento: false,
      metrosPorDimension: {
        '40x40': false,
        '60x40': false,
        '80x40': false,
      },
    })
    setIsDialogOpen(false)
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Ventas</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Registra ventas por metros cuadrados distribuidos por dimensiones en una misma compra.
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
                <DialogTitle>Registrar nueva venta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Producto base</Label>
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
                          {producto.nombre} ({producto.estado})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Metros cuadrados por dimension</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {dimensionOptions.map((dimension) => (
                      <div key={dimension} className="space-y-1.5">
                        <Label>{dimension}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={
                            numericTouched.metrosPorDimension[dimension] || formData.metrosPorDimension[dimension] > 0
                              ? formData.metrosPorDimension[dimension]
                              : ''
                          }
                          onChange={(event) => {
                            const value = event.target.value
                            const parsedValue = value === '' ? 0 : Number(value)
                            setNumericTouched((prev) => ({
                              ...prev,
                              metrosPorDimension: {
                                ...prev.metrosPorDimension,
                                [dimension]: value !== '',
                              },
                            }))
                            setFormData({
                              ...formData,
                              metrosPorDimension: {
                                ...formData.metrosPorDimension,
                                [dimension]: parsedValue,
                              },
                            })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descuento (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={numericTouched.descuento || formData.descuento > 0 ? formData.descuento : ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setNumericTouched((prev) => ({ ...prev, descuento: value !== '' }))
                      setFormData({ ...formData, descuento: value === '' ? 0 : Number(value) })
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre del cliente</Label>
                  <Input
                    value={formData.clienteNombre}
                    onChange={(event) => setFormData({ ...formData, clienteNombre: event.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.clienteEmail}
                      onChange={(event) => setFormData({ ...formData, clienteEmail: event.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input
                      type="tel"
                      value={formData.clienteTelefono}
                      onChange={(event) => setFormData({ ...formData, clienteTelefono: event.target.value })}
                      required
                    />
                  </div>
                </div>

                {productoSeleccionado && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-medium text-slate-900">Resumen de venta</h4>
                    <div className="mt-3 space-y-1.5 text-sm">
                      {dimensionOptions.map((dimension) => {
                        const metros = formData.metrosPorDimension[dimension]
                        if (metros <= 0) return null
                        const precio = getPrecioDimension(dimension)
                        return (
                          <div key={dimension} className="flex items-center justify-between text-slate-600">
                            <span>
                              {dimension}: {metros.toFixed(2)} m2 x {formatMoney(precio)}
                            </span>
                            <span>{formatMoney(metros * precio)}</span>
                          </div>
                        )
                      })}
                      <div className="mt-2 border-t border-slate-200 pt-2 text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>Subtotal</span>
                          <span>{formatMoney(subtotalCalculado)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Descuento ({formData.descuento}%)</span>
                          <span className="text-emerald-700">-{formatMoney(descuentoCalculado)}</span>
                        </div>
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>Total</span>
                          <span>{formatMoney(totalCalculado)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={!formData.productoId || totalM2Form <= 0}>
                    Registrar venta
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-[24px] border border-sky-200/70 bg-sky-50/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <ShoppingCart className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-800">Principio del sistema</h4>
              <p className="text-sm text-blue-700">
                Una venta puede agrupar diferentes dimensiones. El registro comercial debe reflejar lo realmente
                vendido por dimension y mantener trazabilidad de inventario.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</Label>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            {fechasOrdenadas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No se encontraron ventas
              </div>
            ) : (
              <div className="space-y-3">
                {fechasOrdenadas.map((fecha) => {
                  const ventasFecha = groupedByDate[fecha]
                  const totalFecha = ventasFecha.reduce((sum, venta) => sum + venta.total, 0)

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
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Ventas</p>
                            <p className="text-sm font-semibold text-slate-900">{ventasFecha.length}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-right text-emerald-700">
                            <p className="text-[10px] uppercase tracking-[0.2em]">Total</p>
                            <p className="text-sm font-semibold">{formatMoney(totalFecha)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="hidden lg:grid lg:grid-cols-[90px_minmax(0,1.2fr)_minmax(0,1fr)_120px_160px] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Venta</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Cliente / Producto</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Dimensiones</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Total</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Acciones</span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {ventasFecha.map((venta) => {
                          const metros = getMetrosVenta(venta)
                          const dimensionesActivas = dimensionOptions.filter((dimension) => metros[dimension] > 0)

                          return (
                            <div key={venta.id} className="px-4 py-3">
                              <div className="grid gap-2 lg:grid-cols-[90px_minmax(0,1.2fr)_minmax(0,1fr)_120px_160px] lg:items-center">
                                <div className="text-sm font-semibold text-slate-900">{venta.id}</div>

                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{venta.clienteNombre}</p>
                                  <p className="text-[11px] text-slate-500">{venta.productoNombre}</p>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
                                  <div className="grid grid-cols-[1fr_92px] border-b border-slate-200/70 px-2.5 py-1">
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Dimension</span>
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-right text-slate-500">M2</span>
                                  </div>
                                  {dimensionesActivas.map((dimension, index) => (
                                    <div
                                      key={`${venta.id}-${dimension}`}
                                      className={cn(
                                        'grid grid-cols-[1fr_92px] items-center gap-2 px-2.5 py-1.5',
                                        index < dimensionesActivas.length - 1 && 'border-b border-slate-200/70',
                                      )}
                                    >
                                      <span className="text-sm font-medium text-slate-700">{dimension}</span>
                                      <span className="text-right text-sm font-semibold text-emerald-700">
                                        {metros[dimension].toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                  <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Total</span>
                                  <span className="font-semibold text-slate-900">{formatMoney(venta.total)}</span>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <Button size="icon" variant="ghost" onClick={() => setSelectedVenta(venta)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
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

        <Dialog open={!!selectedVenta} onOpenChange={() => setSelectedVenta(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            {selectedVenta && (
              <>
                <DialogHeader>
                  <DialogTitle>Detalle de venta {selectedVenta.id}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Producto</p>
                      <p className="font-medium">{selectedVenta.productoNombre}</p>
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
                      <p className="text-muted-foreground">Telefono</p>
                      <p className="font-medium">{selectedVenta.clienteTelefono}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha</p>
                      <p className="font-medium">{selectedVenta.fecha}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total m2</p>
                      <p className="font-medium">{selectedVenta.cantidadM2.toFixed(2)} m2</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Metros por dimension</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      {dimensionOptions
                        .filter((dimension) => getMetrosVenta(selectedVenta)[dimension] > 0)
                        .map((dimension) => (
                          <div key={dimension} className="flex items-center justify-between">
                            <span className="text-slate-600">{dimension}</span>
                            <span className="font-semibold text-slate-900">
                              {getMetrosVenta(selectedVenta)[dimension].toFixed(2)} m2
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatMoney(selectedVenta.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descuento ({selectedVenta.descuento}%):</span>
                      <span className="text-green-600">
                        -{formatMoney((selectedVenta.subtotal * selectedVenta.descuento) / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total:</span>
                      <span className="text-xl font-bold text-primary">{formatMoney(selectedVenta.total)}</span>
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
