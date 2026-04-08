'use client'

import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, Plus, Search, Trash2 } from 'lucide-react'
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
import {
  dimensionOptions,
  formatMoney,
  getDimensionAreaM2,
  metrosToLosasEquivalentes,
} from '../lib/ventas-helpers'
import { useVentasPageState } from '../hooks/use-ventas-page-state'

const estadoInventarioOrden = ['Picado', 'Escuadrado', 'Devastado', 'Resinado', 'Pulido'] as const
const tipoProductoOrden = ['Plancha', 'Piso'] as const

export default function VentasPage() {
  const {
    productos,
    ventas,
    searchTerm,
    setSearchTerm,
    isDialogOpen,
    setIsDialogOpen,
    selectedVenta,
    setSelectedVenta,
    formData,
    numericTouched,
    loading,
    loadError,
    formError,
    groupedByDate,
    fechasOrdenadas,
    ventasCompletadas,
    totalRevenue,
    totalM2PorDimension,
    totalM2Vendidos,
    totalLosasEquivalentesPorDimension,
    totalLosasEquivalentesVendidas,
    avgSaleValue,
    recentVentas,
    detallesCalculados,
    totalM2Form,
    subtotalCalculado,
    metrosPorDimensionForm,
    losasEquivalentesPorDimensionForm,
    descuentoCalculado,
    totalCalculado,
    getPrecioProducto,
    getMetrosVenta,
    getVentaDetalles,
    getVentaProductoResumen,
    getVentaBloquesResumen,
    getLosasEquivalentesPorDimensionVenta,
    updateDetalleFormulario,
    handleAgregarDetalleProducto,
    handleEliminarDetalleProducto,
    handleDetalleMetrosChange,
    handleDetalleUnidadesChange,
    handleDescuentoChange,
    handleClienteFieldChange,
    handleSubmit,
    resetForm,
  } = useVentasPageState()

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
            <span>Losas equivalentes</span>
            <span className="font-semibold">{totalLosasEquivalentesVendidas.toFixed(1)} losas eq</span>
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
              <span className="text-right">
                <span className="block font-semibold text-slate-900">{totalM2PorDimension[dimension].toFixed(2)} m2</span>
                <span className="block text-[11px] text-slate-500">{totalLosasEquivalentesPorDimension[dimension].toFixed(1)} losas eq</span>
              </span>
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
                <p className="text-xs font-semibold text-slate-900">{getVentaProductoResumen(venta)}</p>
                <p className="text-[11px] text-slate-500">{getVentaBloquesResumen(venta)}</p>
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

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Ventas</h1>
            {loadError ? <p className="mt-2 text-sm text-destructive">{loadError}</p> : null}
            {loading ? <p className="mt-2 text-sm text-muted-foreground">Cargando ventas...</p> : null}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm(false)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar nueva venta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Detalle de productos</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAgregarDetalleProducto}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Agregar producto
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.detallesProductos.map((detalle, index) => {
                      const productoSeleccionado = productos.find((item) => item.id === detalle.productoId)
                      const tiposDisponibles = tipoProductoOrden.filter((tipo) =>
                        productos.some((producto) => producto.tipo === tipo),
                      )
                      const bloquesDisponibles = Array.from(
                        new Map(
                          productos
                            .filter((producto) => producto.tipo === detalle.tipo)
                            .map((producto) => [producto.origenId, producto.origenNombre]),
                        ).entries(),
                      )
                        .map(([id, nombre]) => ({ id, nombre }))
                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      const dimensionesDisponibles = detalle.tipo && detalle.origenId
                        ? dimensionOptions.filter((dimension) =>
                            productos.some(
                              (producto) =>
                                producto.tipo === detalle.tipo &&
                                producto.origenId === detalle.origenId &&
                                producto.dimension === dimension,
                            ),
                          )
                        : []
                      const estadosDisponibles =
                        detalle.tipo && detalle.origenId && detalle.dimension
                          ? estadoInventarioOrden.filter((estado) =>
                              productos.some(
                                (producto) =>
                                  producto.tipo === detalle.tipo &&
                                  producto.origenId === detalle.origenId &&
                                  producto.dimension === detalle.dimension &&
                                  producto.estado === estado,
                              ),
                            )
                          : []
                      const precioM2 = productoSeleccionado ? getPrecioProducto(productoSeleccionado) : 0
                      const isPlancha = productoSeleccionado?.tipo === 'Plancha'
                      const areaM2 = productoSeleccionado ? getDimensionAreaM2(productoSeleccionado.dimension) : 0
                      const cantidadUnidades = Math.max(0, Math.trunc(detalle.cantidadUnidades || 0))
                      const metrosDetalle = isPlancha
                        ? Number((cantidadUnidades * areaM2).toFixed(2))
                        : detalle.metrosCuadrados
                      const precioUnidad = isPlancha ? precioM2 * areaM2 : 0
                      const subtotalItem = metrosDetalle * precioM2

                      return (
                        <div key={detalle.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Item {index + 1}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarDetalleProducto(detalle.id)}
                              disabled={formData.detallesProductos.length === 1}
                              title="Eliminar item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-4">
                            <div className="min-w-0 space-y-2">
                              <Label>Tipo</Label>
                              <Select
                                value={detalle.tipo}
                                onValueChange={(value) =>
                                  updateDetalleFormulario(detalle.id, { tipo: value as typeof detalle.tipo })
                                }
                              >
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tiposDisponibles.map((tipo) => (
                                    <SelectItem key={`${detalle.id}-${tipo}`} value={tipo}>
                                      {tipo}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="min-w-0 space-y-2">
                              <Label>Bloque</Label>
                              <Select
                                value={detalle.origenId}
                                onValueChange={(value) =>
                                  updateDetalleFormulario(detalle.id, { origenId: value })
                                }
                                disabled={!detalle.tipo}
                              >
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bloquesDisponibles.map((bloque) => (
                                    <SelectItem key={bloque.id} value={bloque.id}>
                                      {bloque.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="min-w-0 space-y-2">
                              <Label>Dimension</Label>
                              <Select
                                value={detalle.dimension}
                                onValueChange={(value) =>
                                  updateDetalleFormulario(detalle.id, { dimension: value as typeof detalle.dimension })
                                }
                                disabled={!detalle.tipo || !detalle.origenId}
                              >
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {dimensionesDisponibles.map((dimension) => (
                                    <SelectItem key={`${detalle.id}-${dimension}`} value={dimension}>
                                      {dimension}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="min-w-0 space-y-2">
                              <Label>Estado</Label>
                              <Select
                                value={detalle.estado}
                                onValueChange={(value) =>
                                  updateDetalleFormulario(detalle.id, { estado: value as typeof detalle.estado })
                                }
                                disabled={!detalle.tipo || !detalle.origenId || !detalle.dimension}
                              >
                                <SelectTrigger className="w-full min-w-0">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {estadosDisponibles.map((estado) => (
                                    <SelectItem key={`${detalle.id}-${estado}`} value={estado}>
                                      {estado}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{isPlancha ? 'Unidades' : 'M2 vendidos'}</Label>
                              {isPlancha ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  value={detalle.cantidadUnidades > 0 ? detalle.cantidadUnidades : ''}
                                  onChange={(event) =>
                                    handleDetalleUnidadesChange(detalle.id, event.target.value)
                                  }
                                />
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="0"
                                  value={detalle.metrosCuadrados > 0 ? detalle.metrosCuadrados : ''}
                                  onChange={(event) =>
                                    handleDetalleMetrosChange(detalle.id, event.target.value)
                                  }
                                />
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>{isPlancha ? 'Precio unidad' : 'Precio m2'}</Label>
                              <Input
                                value={
                                  productoSeleccionado
                                    ? formatMoney(isPlancha ? precioUnidad : precioM2)
                                    : '-'
                                }
                                disabled
                              />
                            </div>
                          </div>

                          <div className="mt-3 rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
                            <p>Bloque: {productoSeleccionado?.origenNombre ?? '-'}</p>
                            <p>
                              Dimension:{' '}
                              {productoSeleccionado
                                ? isPlancha
                                  ? `${productoSeleccionado.dimension} (fija)`
                                  : productoSeleccionado.dimension
                                : '-'}
                            </p>
                            {isPlancha ? <p>Total m2 eq: {metrosDetalle.toFixed(2)} m2</p> : null}
                            <p>Subtotal item: {productoSeleccionado ? formatMoney(subtotalItem) : '-'}</p>
                          </div>
                        </div>
                      )
                    })}
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
                    onChange={(event) => handleDescuentoChange(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre del cliente</Label>
                  <Input
                    value={formData.clienteNombre}
                    onChange={(event) => handleClienteFieldChange('clienteNombre', event.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.clienteEmail}
                      onChange={(event) => handleClienteFieldChange('clienteEmail', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input
                      type="tel"
                      value={formData.clienteTelefono}
                      onChange={(event) => handleClienteFieldChange('clienteTelefono', event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Motivo de salida de almacen</Label>
                  <Input
                    value={formData.motivoMovimientoAlmacen}
                    onChange={(event) => handleClienteFieldChange('motivoMovimientoAlmacen', event.target.value)}
                    placeholder="Ej: salida por venta cliente Hotel X"
                    required
                  />
                </div>
                {detallesCalculados.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-medium text-slate-900">Resumen de venta</h4>
                    <div className="mt-3 space-y-1.5 text-sm">
                      {detallesCalculados.map((detalle, index) => (
                        <div key={`${detalle.productoId}-${index}`} className="flex items-center justify-between text-slate-600">
                          <span>
                            {detalle.cantidadUnidades && detalle.cantidadUnidades > 0 ? (
                              <>
                                {detalle.origenNombre}: {detalle.cantidadUnidades} und x{' '}
                                {formatMoney(detalle.precioM2 * getDimensionAreaM2(detalle.dimension))}
                                {' '}({detalle.metrosCuadrados.toFixed(2)} m2 eq)
                              </>
                            ) : (
                              <>
                                {detalle.origenNombre} - {detalle.dimension}: {detalle.metrosCuadrados.toFixed(2)} m2 x{' '}
                                {formatMoney(detalle.precioM2)}
                                {' '}({metrosToLosasEquivalentes(detalle.metrosCuadrados, detalle.dimension).toFixed(2)} losas eq)
                              </>
                            )}
                          </span>
                          <span>{formatMoney(detalle.subtotal)}</span>
                        </div>
                      ))}

                      <div className="mt-2 rounded-md border border-slate-200 bg-white/80 px-2.5 py-2 text-xs text-slate-600">
                        {dimensionOptions.map((dimension) => (
                          <div key={dimension} className="flex items-center justify-between">
                            <span>{dimension}</span>
                            <span className="text-right font-semibold text-slate-800">
                              <span className="block">{metrosPorDimensionForm[dimension].toFixed(2)} m2</span>
                              <span className="block text-[10px] font-normal text-slate-500">
                                {losasEquivalentesPorDimensionForm[dimension].toFixed(2)} losas eq
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>

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

                {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => resetForm()} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={detallesCalculados.length === 0 || totalM2Form <= 0 || formData.motivoMovimientoAlmacen.trim().length < 5}>
                    Registrar venta
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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

                      <div className="hidden lg:grid lg:grid-cols-[90px_minmax(0,1.4fr)_120px_160px] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Venta</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Cliente / Bloques</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Total</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Acciones</span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {ventasFecha.map((venta) => {
                          const detallesVenta = getVentaDetalles(venta)
                          const bloquesUnicos = Array.from(new Set(detallesVenta.map((detalle) => detalle.origenNombre)))

                          return (
                            <div key={venta.id} className="px-4 py-3">
                              <div className="grid gap-2 lg:grid-cols-[90px_minmax(0,1.4fr)_120px_160px] lg:items-center">
                                <div className="text-sm font-semibold text-slate-900">{venta.id}</div>

                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{venta.clienteNombre}</p>
                                  <p className="text-[11px] text-slate-500">{getVentaProductoResumen(venta)}</p>
                                  <p className="text-[11px] text-slate-500">
                                    Bloques: {bloquesUnicos.length > 0 ? bloquesUnicos.join(', ') : 'Sin bloque'}
                                  </p>
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
                      <p className="font-medium">{getVentaProductoResumen(selectedVenta)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bloques</p>
                      <p className="font-medium">{getVentaBloquesResumen(selectedVenta)}</p>
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
                    <div>
                      <p className="text-muted-foreground">Losas equivalentes</p>
                      <p className="font-medium">
                        {dimensionOptions
                          .reduce((sum, dimension) => {
                            return sum + getLosasEquivalentesPorDimensionVenta(selectedVenta)[dimension]
                          }, 0)
                          .toFixed(2)}{' '}
                        losas eq
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Detalle por bloque/producto</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      {getVentaDetalles(selectedVenta).length === 0 ? (
                        <p className="text-xs text-slate-500">Sin detalle de bloques en este registro.</p>
                      ) : (
                        getVentaDetalles(selectedVenta).map((detalle, index) => (
                          <div
                            key={`${selectedVenta.id}-${detalle.productoId}-${index}`}
                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white/70 px-2.5 py-1.5"
                          >
                            <div>
                              <p className="font-medium text-slate-900">{detalle.origenNombre}</p>
                              <p className="text-xs text-slate-500">
                                {detalle.productoNombre} - {detalle.dimension}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-600">
                                {detalle.cantidadUnidades && detalle.cantidadUnidades > 0 ? (
                                  <>
                                    {detalle.cantidadUnidades} und x{' '}
                                    {formatMoney(detalle.precioM2 * getDimensionAreaM2(detalle.dimension))}{' '}
                                    ({detalle.metrosCuadrados.toFixed(2)} m2 eq)
                                  </>
                                ) : (
                                  <>
                                    {detalle.metrosCuadrados.toFixed(2)} m2 |{' '}
                                    {metrosToLosasEquivalentes(detalle.metrosCuadrados, detalle.dimension).toFixed(2)} losas eq
                                  </>
                                )}
                              </p>
                              <p className="font-semibold text-slate-900">{formatMoney(detalle.subtotal)}</p>
                            </div>
                          </div>
                        ))
                      )}
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
                            <span className="text-right font-semibold text-slate-900">
                              <span className="block">{getMetrosVenta(selectedVenta)[dimension].toFixed(2)} m2</span>
                              <span className="block text-[10px] font-normal text-slate-500">
                                {getLosasEquivalentesPorDimensionVenta(selectedVenta)[dimension].toFixed(2)} losas eq
                              </span>
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
