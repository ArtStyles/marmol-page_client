'use client'

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Eye, Plus, Search, Trash2 } from 'lucide-react'
import { formatMoney, slabStateOrder } from '../lib/ventas-helpers'
import { useVentasPageState } from '../hooks/use-ventas-page-state'

export default function VentasPage() {
  const {
    bloques,
    formData,
    formError,
    getVentaBloqueResumen,
    getVentaSections,
    groupedByDate,
    hasSlabStockAvailable,
    handleBlockChange,
    handleSubmit,
    isDialogOpen,
    loadError,
    loading,
    openCreateDialog,
    orderedDates,
    recentVentas,
    resetForm,
    resolvedFloorRows,
    resolvedSlabRows,
    responsableValidacionNombre,
    responsableVentasNombre,
    searchTerm,
    selectedBlockCode,
    selectedVenta,
    setFormData,
    setIsDialogOpen,
    setSearchTerm,
    setSelectedVenta,
    subtotalForm,
    totalBloques,
    totalIngresos,
    totalLiquidaciones,
    updateFloorRow,
    updateSlabRow,
    addSlabRow,
    removeSlabRow,
    ventas,
  } = useVentasPageState()

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen ventas" meta={`${ventas.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Ingresos registrados</span>
            <span className="font-semibold">{formatMoney(totalIngresos)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Bloques con ventas</span>
            <span className="font-semibold">{totalBloques}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Liquidaciones</span>
            <span className="font-semibold">{totalLiquidaciones}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Ultimos registros" meta="Actividad reciente">
        <div className="space-y-2 text-sm text-slate-700">
          {recentVentas.length === 0 ? (
            <p className="text-xs text-slate-500">Sin ventas recientes.</p>
          ) : (
            recentVentas.map((venta) => (
              <div key={venta.id} className="rounded-xl bg-white/70 px-3 py-2">
                <p className="text-xs font-semibold text-slate-900">
                  {getVentaBloqueResumen(venta, []) || venta.id}
                </p>
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
            <h1 className="text-3xl font-bold text-foreground font-sans">Resumen de ventas del bloque</h1>
            {loadError ? <p className="mt-2 text-sm text-destructive">{loadError}</p> : null}
            {loading ? <p className="mt-2 text-sm text-muted-foreground">Cargando ventas y bloques...</p> : null}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar venta
              </Button>
            </DialogTrigger>
            <DialogContent className="h-[96vh] max-h-[96vh] w-[calc(100vw-1rem)] max-w-none overflow-y-auto overflow-x-hidden p-4 sm:w-[calc(100vw-2rem)] sm:max-w-[1600px] sm:p-6">
              <DialogHeader>
                <DialogTitle>Registrar resumen de ventas del bloque</DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSubmit()
                }}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Bloque</Label>
                    <Select value={formData.bloqueId} onValueChange={handleBlockChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar bloque" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloques.map((bloque) => (
                          <SelectItem key={bloque.id} value={bloque.id}>
                            {bloque.codigo ?? bloque.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de registro</Label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, fecha: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Responsable de ventas</Label>
                    <Input value={responsableVentasNombre} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label>Codigo del bloque</Label>
                    <Input value={selectedBlockCode || '--'} disabled />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                        Ventas de piso
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Filas fijas por dimension y estado segun la guia funcional.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                      Piso en m2
                    </Badge>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Dimension</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Disponible</TableHead>
                          <TableHead>Cantidad (m2)</TableHead>
                          <TableHead>Precio por m2</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resolvedFloorRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium text-slate-900">Piso</TableCell>
                            <TableCell>{row.dimension}</TableCell>
                            <TableCell>{row.estado}</TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {row.producto ? `${row.disponibleM2.toFixed(2)} m2` : 'Sin stock'}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.cantidadM2 > 0 ? row.cantidadM2 : ''}
                                onChange={(event) =>
                                  updateFloorRow(row.id, {
                                    cantidadM2: event.target.value === '' ? 0 : Number(event.target.value),
                                  })
                                }
                                disabled={!row.producto}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.precioM2 > 0 ? row.precioM2 : ''}
                                onChange={(event) =>
                                  updateFloorRow(row.id, {
                                    precioM2: event.target.value === '' ? 0 : Number(event.target.value),
                                  })
                                }
                                disabled={!row.producto}
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-slate-900">
                              {formatMoney(row.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                        Ventas de planchas
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        La dimension cambia por bloque y el total se calcula por unidad vendida.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSlabRow}
                      disabled={!formData.bloqueId || !hasSlabStockAvailable}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar plancha
                    </Button>
                  </div>

                  {!formData.bloqueId ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                      Selecciona un bloque para cargar las planchas disponibles.
                    </div>
                  ) : !hasSlabStockAvailable ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                      No hay planchas con stock disponible en este bloque.
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Dimension</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Disponible</TableHead>
                            <TableHead>Cantidad (unid.)</TableHead>
                            <TableHead>Precio por unidad</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resolvedSlabRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium text-slate-900">Plancha</TableCell>
                              <TableCell>
                                <Select
                                  value={row.dimension}
                                  onValueChange={(value) => updateSlabRow(row.id, { dimension: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Dimension" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {row.dimensionOptions.map((dimension) => (
                                      <SelectItem key={`${row.id}-${dimension}`} value={dimension}>
                                        {dimension}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={row.estado}
                                  onValueChange={(value) =>
                                    updateSlabRow(row.id, { estado: value as (typeof slabStateOrder)[number] })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {slabStateOrder.map((estado) => (
                                      <SelectItem key={`${row.id}-${estado}`} value={estado}>
                                        {estado}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {row.producto ? `${row.disponibleUnidades} unid.` : 'Sin stock'}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={row.cantidadUnidades > 0 ? row.cantidadUnidades : ''}
                                  onChange={(event) =>
                                    updateSlabRow(row.id, {
                                      cantidadUnidades:
                                        event.target.value === '' ? 0 : Math.trunc(Number(event.target.value)),
                                    })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.precioUnitario > 0 ? row.precioUnitario : ''}
                                  onChange={(event) =>
                                    updateSlabRow(row.id, {
                                      precioUnitario: event.target.value === '' ? 0 : Number(event.target.value),
                                    })
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-semibold text-slate-900">
                                {formatMoney(row.total)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSlabRow(row.id)}
                                  disabled={resolvedSlabRows.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Observaciones</Label>
                      <Textarea
                        value={formData.observaciones}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, observaciones: event.target.value }))
                        }
                        rows={4}
                        placeholder="Descuentos aplicados, ventas parciales, acuerdos especiales o incidencias."
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Fecha de liquidacion</Label>
                        <Input
                          type="date"
                          value={formData.fechaLiquidacion}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, fechaLiquidacion: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Responsable de validacion</Label>
                        <Input value={responsableValidacionNombre ?? '--'} disabled />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      Total final
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">
                      {formatMoney(subtotalForm)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Suma automatica de piso + planchas. Este valor no es editable manualmente.
                    </p>
                  </div>
                </div>

                {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => resetForm()} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Guardar resumen de ventas
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-[var(--agent-radius-panel)] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</Label>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por bloque, fecha o responsable..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Card className="border-none bg-transparent p-0 shadow-none">
          <CardContent className="p-0">
            {orderedDates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No se encontraron ventas registradas.
              </div>
            ) : (
              <div className="space-y-3">
                {orderedDates.map((fecha) => {
                  const ventasFecha = groupedByDate[fecha]
                  const totalFecha = ventasFecha.reduce((sum, venta) => sum + venta.total, 0)

                  return (
                    <div
                      key={fecha}
                      className="overflow-hidden rounded-[var(--agent-radius-panel-tight)] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha</p>
                          <p className="text-base font-semibold text-slate-900">{fecha}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-1.5 text-right text-emerald-700">
                          <p className="text-[10px] uppercase tracking-[0.2em]">Total</p>
                          <p className="text-sm font-semibold">{formatMoney(totalFecha)}</p>
                        </div>
                      </div>

                      <div className="hidden lg:grid lg:grid-cols-[120px_180px_180px_150px_120px_120px] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Venta</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Bloque</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Responsable</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Liquidacion</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Total</span>
                        <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Acciones</span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {ventasFecha.map((venta) => (
                          <div key={venta.id} className="px-4 py-3">
                            <div className="grid gap-2 lg:grid-cols-[120px_180px_180px_150px_120px_120px] lg:items-center">
                              <div className="text-sm font-semibold text-slate-900">{venta.id}</div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {getVentaBloqueResumen(venta, [])}
                                </p>
                                <p className="text-[11px] text-slate-500">{venta.bloqueId ?? 'Sin id de bloque'}</p>
                              </div>
                              <div className="text-sm text-slate-700">{venta.creadoPorNombre ?? 'Sin responsable'}</div>
                              <div className="text-sm text-slate-700">{venta.fechaLiquidacion ?? 'Pendiente'}</div>
                              <div className="text-sm font-semibold text-slate-900 lg:text-right">
                                {formatMoney(venta.total)}
                              </div>
                              <div className="flex justify-end">
                                <Button size="icon" variant="ghost" onClick={() => setSelectedVenta(venta)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
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

        <Dialog open={!!selectedVenta} onOpenChange={() => setSelectedVenta(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            {selectedVenta ? (
              <>
                <DialogHeader>
                  <DialogTitle>Detalle de venta {selectedVenta.id}</DialogTitle>
                </DialogHeader>

                {(() => {
                  const sections = getVentaSections(selectedVenta)
                  return (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bloque</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {getVentaBloqueResumen(selectedVenta, [])}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Fecha</p>
                          <p className="mt-1 font-semibold text-slate-900">{selectedVenta.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Responsable</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {selectedVenta.creadoPorNombre ?? 'Sin responsable'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Liquidacion</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {selectedVenta.fechaLiquidacion ?? 'Pendiente'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                          Ventas de piso
                        </h3>
                        {sections.floorRows.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-500">Sin filas de piso en este registro.</p>
                        ) : (
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Dimension</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Cantidad</TableHead>
                                  <TableHead>Precio por m2</TableHead>
                                  <TableHead>Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sections.floorRows.map((row, index) => (
                                  <TableRow key={`${selectedVenta.id}-floor-${index}`}>
                                    <TableCell>{row.dimension}</TableCell>
                                    <TableCell>{row.estadoDocumento}</TableCell>
                                    <TableCell>{row.metrosCuadrados.toFixed(2)} m2</TableCell>
                                    <TableCell>{formatMoney(row.precioM2)}</TableCell>
                                    <TableCell className="font-semibold text-slate-900">
                                      {formatMoney(row.subtotal)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                          Ventas de planchas
                        </h3>
                        {sections.slabRows.length === 0 ? (
                          <p className="mt-3 text-sm text-slate-500">Sin filas de planchas en este registro.</p>
                        ) : (
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Dimension</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Cantidad</TableHead>
                                  <TableHead>Precio por unidad</TableHead>
                                  <TableHead>Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sections.slabRows.map((row, index) => (
                                  <TableRow key={`${selectedVenta.id}-slab-${index}`}>
                                    <TableCell>{row.dimension}</TableCell>
                                    <TableCell>{row.estadoDocumento}</TableCell>
                                    <TableCell>{row.cantidadUnidades ?? 0} unid.</TableCell>
                                    <TableCell>{formatMoney(row.precioUnitario ?? 0)}</TableCell>
                                    <TableCell className="font-semibold text-slate-900">
                                      {formatMoney(row.subtotal)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Observaciones</p>
                        <p className="mt-2 text-sm text-slate-700">
                          {selectedVenta.observaciones || 'Sin observaciones.'}
                        </p>
                      </div>

                      <div className="border-t pt-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Total ingresos del bloque</span>
                          <span className="text-xl font-semibold text-slate-950">
                            {formatMoney(selectedVenta.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  )
}
