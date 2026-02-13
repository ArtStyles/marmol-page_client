'use client'

import React from 'react'
import { useState } from 'react'
import { AdminPanelCard, AdminShell } from '@/components/admin/admin-shell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { estadosInventario, tiposProducto } from '@/lib/data'
import type { Producto } from '@/lib/types'
import { useInventarioStore } from '@/hooks/use-inventario'
import { cn } from '@/lib/utils'
import { Package, Search } from 'lucide-react'

type OrigenGroup = {
  origenId: string
  origenNombre: string
  items: Producto[]
  totalLosas: number
  totalM2: number
  totalValor: number
}

export default function InventarioPage() {
  const estadoBadgeClass: Record<Producto['estado'], string> = {
    Picado: 'border-blue-200 bg-blue-50 text-blue-700',
    Pulido: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Escuadrado: 'border-amber-200 bg-amber-50 text-amber-700',
  }
  const { productos } = useInventarioStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')

  const filteredProductos = productos.filter((producto) => {
    const query = searchTerm.toLowerCase()
    const matchesSearch =
      producto.nombre.toLowerCase().includes(query) ||
      producto.origenNombre.toLowerCase().includes(query) ||
      producto.id.toLowerCase().includes(query)
    const matchesTipo = tipoFilter === 'all' || producto.tipo === tipoFilter
    const matchesEstado = estadoFilter === 'all' || producto.estado === estadoFilter
    return matchesSearch && matchesTipo && matchesEstado
  })

  const totalLosas = productos.reduce((sum, item) => sum + item.cantidadLosas, 0)
  const totalM2 = productos.reduce((sum, item) => sum + item.metrosCuadrados, 0)
  const valorInventario = productos.reduce((sum, item) => sum + item.metrosCuadrados * item.precioM2, 0)
  const productosStockBajo = productos.filter((item) => item.cantidadLosas < 20)

  const groupedByOrigen = filteredProductos.reduce<Record<string, OrigenGroup>>((acc, item) => {
    if (!acc[item.origenId]) {
      acc[item.origenId] = {
        origenId: item.origenId,
        origenNombre: item.origenNombre,
        items: [],
        totalLosas: 0,
        totalM2: 0,
        totalValor: 0,
      }
    }

    acc[item.origenId].items.push(item)
    acc[item.origenId].totalLosas += item.cantidadLosas
    acc[item.origenId].totalM2 += item.metrosCuadrados
    acc[item.origenId].totalValor += item.metrosCuadrados * item.precioM2

    return acc
  }, {})

  const origenesOrdenados = Object.values(groupedByOrigen).sort((a, b) => b.totalM2 - a.totalM2)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen inventario" meta={`${productos.length} items`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total losas</span>
            <span className="font-semibold">{totalLosas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total m2</span>
            <span className="font-semibold">{totalM2.toFixed(1)} m2</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Valor inventario</span>
            <span className="font-semibold">${Math.round(valorInventario).toLocaleString()}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Stock bajo" meta={`${productosStockBajo.length} alertas`}>
        <div className="space-y-2 text-sm text-slate-700">
          {productosStockBajo.length === 0 ? (
            <p className="text-xs text-slate-500">Sin alertas pendientes.</p>
          ) : (
            productosStockBajo
              .sort((a, b) => a.cantidadLosas - b.cantidadLosas)
              .slice(0, 3)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{item.nombre}</p>
                    <p className="text-[11px] text-slate-500">{item.origenNombre}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700">{item.cantidadLosas} losas</span>
                </div>
              ))
          )}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Fuente de datos" meta="Modo actual">
        <p className="text-xs text-slate-600">
          Inventario en solo lectura. Se alimenta desde produccion diaria, ventas y mermas.
          Actualmente usa datos mock; luego vendra desde API.
        </p>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Inventario</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Vista de solo lectura. No se agregan productos manualmente en este modulo.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
            Solo lectura
          </Badge>
        </div>

        <div className="rounded-[24px] border border-emerald-200/70 bg-emerald-50/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Package className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-medium text-green-800">Flujo operativo</h4>
              <p className="text-sm text-green-700">
                El inventario se calcula con entradas desde produccion diaria y salidas por ventas y mermas.
                Esta pantalla refleja ese estado con datos mockeados temporalmente.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</Label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tipo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
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
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Estado</Label>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estadosInventario.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] py-0 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <CardContent className="pb-4 pt-4">
            {origenesOrdenados.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No hay productos en inventario
              </div>
            ) : (
              <div className="space-y-3">
                {origenesOrdenados.map((group) => (
                  <div
                    key={group.origenId}
                    className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-200/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Origen</p>
                        <p className="text-base font-semibold text-slate-900">{group.origenNombre}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Losas</p>
                          <p className="text-sm font-semibold text-slate-900">{group.totalLosas}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-right text-emerald-700">
                          <p className="text-[10px] uppercase tracking-[0.2em]">M2</p>
                          <p className="text-sm font-semibold">{group.totalM2.toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Valor</p>
                          <p className="text-sm font-semibold text-slate-900">${Math.round(group.totalValor).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.4fr)_90px_110px_100px_110px_130px] border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Producto</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Dim.</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Estado</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Losas</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">M2</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Valor</span>
                    </div>

                    <div className="divide-y divide-slate-200/60">
                      {group.items.map((item) => {
                        const isLowStock = item.cantidadLosas < 20
                        const valorItem = item.metrosCuadrados * item.precioM2

                        return (
                          <div key={item.id} className="px-4 py-3">
                            <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_90px_110px_100px_110px_130px] lg:items-center">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.nombre}</p>
                                <p className="text-[11px] text-slate-500">
                                  {item.tipo} · ${item.precioM2}/m2
                                </p>
                              </div>

                              <div className="text-sm text-slate-700">{item.dimension}</div>

                              <div>
                                <Badge variant="outline" className={estadoBadgeClass[item.estado]}>
                                  {item.estado}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Losas</span>
                                <span className={cn('font-semibold', isLowStock ? 'text-amber-700' : 'text-slate-900')}>
                                  {item.cantidadLosas}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">M2</span>
                                <span className="font-semibold text-emerald-700">{item.metrosCuadrados.toFixed(2)}</span>
                              </div>

                              <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Valor</span>
                                <span className="font-semibold text-slate-900">${Math.round(valorItem).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}

