'use client'

import React, { useMemo, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useGastosStore, gastoFlujos, gastoTipos, type GastoFlujo, type GastoTipo } from '@/hooks/use-gastos'
import { ventas } from '@/lib/data'
import { Plus, ReceiptText, Search, TrendingDown, UserRound } from 'lucide-react'

type TipoFilter = 'todos' | GastoTipo
type FlujoFilter = 'todos' | GastoFlujo

type GastoFormData = {
  fecha: string
  costo: number
  tipo: GastoTipo
  flujo: GastoFlujo
  descripcion: string
  encargado: string
}

const getTodayDateIso = () => new Date().toISOString().split('T')[0]

const buildDefaultForm = (): GastoFormData => ({
  fecha: getTodayDateIso(),
  costo: 0,
  tipo: 'Operacion',
  flujo: 'General',
  descripcion: '',
  encargado: '',
})

const formatMoney = (value: number) => {
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(value))
  return `${sign}$${absolute.toLocaleString()}`
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

export default function GastosPage() {
  const { gastos, addGasto } = useGastosStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [costTouched, setCostTouched] = useState(false)
  const [formData, setFormData] = useState<GastoFormData>(buildDefaultForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos')
  const [flujoFilter, setFlujoFilter] = useState<FlujoFilter>('todos')

  const ingresosOperativos = useMemo(() => {
    const ventasCompletadas = ventas.filter((venta) => venta.estado === 'completada')
    const subtotal = ventasCompletadas.reduce((sum, venta) => sum + venta.subtotal, 0)
    const descuentos = ventasCompletadas.reduce(
      (sum, venta) => sum + venta.subtotal * (venta.descuento / 100),
      0,
    )
    return subtotal - descuentos
  }, [])

  const resumen = useMemo(() => {
    const nowMonth = getTodayDateIso().slice(0, 7)
    const total = gastos.reduce((sum, gasto) => sum + gasto.costo, 0)
    const gastosMes = gastos.filter((gasto) => gasto.fecha.startsWith(nowMonth))
    const totalMes = gastosMes.reduce((sum, gasto) => sum + gasto.costo, 0)
    const promedio = gastos.length ? total / gastos.length : 0
    const ratio = ingresosOperativos > 0 ? total / ingresosOperativos : 0

    const porTipo = gastoTipos
      .map((tipo) => ({
        tipo,
        total: gastos
          .filter((gasto) => gasto.tipo === tipo)
          .reduce((sum, gasto) => sum + gasto.costo, 0),
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)

    const porEncargado = gastos.reduce<Record<string, number>>((acc, gasto) => {
      const key = gasto.encargado.trim() || 'Sin encargado'
      acc[key] = (acc[key] ?? 0) + gasto.costo
      return acc
    }, {})

    const topEncargados = Object.entries(porEncargado)
      .map(([encargado, totalEncargado]) => ({ encargado, total: totalEncargado }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    return {
      total,
      totalMes,
      promedio,
      ratio,
      cantidadMes: gastosMes.length,
      porTipo,
      topEncargados,
    }
  }, [gastos, ingresosOperativos])

  const balanceOperativo = ingresosOperativos - resumen.total

  const gastosFiltrados = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()

    return [...gastos]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
      .filter((gasto) => {
        const matchTipo = tipoFilter === 'todos' || gasto.tipo === tipoFilter
        const matchFlujo = flujoFilter === 'todos' || gasto.flujo === flujoFilter
        const matchQuery =
          query.length === 0 ||
          gasto.descripcion.toLowerCase().includes(query) ||
          gasto.encargado.toLowerCase().includes(query) ||
          gasto.fecha.includes(query)

        return matchTipo && matchFlujo && matchQuery
      })
  }, [gastos, searchTerm, tipoFilter, flujoFilter])

  const resetForm = () => {
    setFormData(buildDefaultForm())
    setFormError('')
    setCostTouched(false)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const costo = Number(formData.costo)
    const descripcion = formData.descripcion.trim()
    const encargado = formData.encargado.trim()

    if (!Number.isFinite(costo) || costo <= 0) {
      setFormError('El costo debe ser mayor que 0.')
      return
    }

    if (descripcion.length < 6) {
      setFormError('Describe el motivo del gasto (minimo 6 caracteres).')
      return
    }

    if (!encargado) {
      setFormError('Indica la persona encargada.')
      return
    }

    addGasto({
      fecha: formData.fecha || getTodayDateIso(),
      costo: Number(costo.toFixed(2)),
      tipo: formData.tipo,
      flujo: formData.flujo,
      descripcion,
      encargado,
    })

    closeDialog()
  }

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen gastos" meta={`${gastos.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total acumulado</span>
            <span className="font-semibold text-rose-700">{formatMoney(resumen.total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total del mes</span>
            <span className="font-semibold">{formatMoney(resumen.totalMes)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Promedio por registro</span>
            <span className="font-semibold">{formatMoney(resumen.promedio)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Peso sobre ingresos</span>
            <span className="font-semibold">{formatPercent(resumen.ratio)}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top encargados" meta="Por costo">
        <div className="space-y-2 text-sm text-slate-700">
          {resumen.topEncargados.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros.</p>
          ) : (
            resumen.topEncargados.map((item) => (
              <div
                key={item.encargado}
                className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2"
              >
                <span className="text-xs font-semibold text-slate-900">{item.encargado}</span>
                <span className="text-xs font-semibold text-rose-700">{formatMoney(item.total)}</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Flujo de negocio" meta="Impacto directo">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Ingresos operativos</span>
            <span className="font-semibold">{formatMoney(ingresosOperativos)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Gastos registrados</span>
            <span className="font-semibold text-rose-700">{formatMoney(resumen.total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Balance estimado</span>
            <span className={`font-semibold ${balanceOperativo >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatMoney(balanceOperativo)}
            </span>
          </div>
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Gastos</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Registra costos operativos por tipo, motivo y responsable para reflejar su impacto en finanzas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              Conectado a flujo financiero
            </Badge>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar gasto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[88vh] w-[96vw] max-w-[680px] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo gasto operativo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={formData.fecha}
                        onChange={(event) => setFormData({ ...formData, fecha: event.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Costo del gasto</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0"
                        value={costTouched || formData.costo > 0 ? formData.costo : ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setCostTouched(value !== '')
                          setFormData({
                            ...formData,
                            costo: value === '' ? 0 : Number(value),
                          })
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tipo de gasto</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) => setFormData({ ...formData, tipo: value as GastoTipo })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gastoTipos.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Flujo del negocio</Label>
                      <Select
                        value={formData.flujo}
                        onValueChange={(value) => setFormData({ ...formData, flujo: value as GastoFlujo })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gastoFlujos.map((flujo) => (
                            <SelectItem key={flujo} value={flujo}>
                              {flujo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripcion / motivo</Label>
                    <Textarea
                      value={formData.descripcion}
                      onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
                      placeholder="Describe por que se realizo el gasto..."
                      className="min-h-[88px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Persona encargada</Label>
                    <Input
                      value={formData.encargado}
                      onChange={(event) => setFormData({ ...formData, encargado: event.target.value })}
                      placeholder="Nombre del responsable"
                    />
                  </div>

                  {formError && <p className="text-sm text-destructive">{formError}</p>}

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={closeDialog} className="flex-1 bg-transparent">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      Guardar gasto
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Gasto total</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-rose-600">
                <TrendingDown className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(resumen.total)}</p>
            <p className="text-xs text-slate-500">{gastos.length} registros acumulados</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Mes actual</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <ReceiptText className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(resumen.totalMes)}</p>
            <p className="text-xs text-slate-500">{resumen.cantidadMes} gastos capturados</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Promedio registro</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <UserRound className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(resumen.promedio)}</p>
            <p className="text-xs text-slate-500">Costo medio por movimiento</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Peso sobre ingresos</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700">
                <ReceiptText className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{formatPercent(resumen.ratio)}</p>
            <p className="text-xs text-slate-500">Relacion gasto vs ingreso operativo</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Impacto operativo</p>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Ingresos operativos de referencia</span>
                <span className="font-semibold">{formatMoney(ingresosOperativos)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total gastos registrados</span>
                <span className="font-semibold text-rose-700">{formatMoney(resumen.total)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/70 pt-3">
                <span>Balance luego de gastos registrados</span>
                <span className={`font-semibold ${balanceOperativo >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatMoney(balanceOperativo)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Distribucion por tipo</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {resumen.porTipo.length === 0 ? (
                <p className="text-xs text-slate-500">Sin gastos registrados.</p>
              ) : (
                resumen.porTipo.slice(0, 5).map((item) => (
                  <div
                    key={item.tipo}
                    className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2"
                  >
                    <span>{item.tipo}</span>
                    <span className="font-semibold">{formatMoney(item.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_200px]">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por motivo, encargado o fecha..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tipo</p>
              <Select value={tipoFilter} onValueChange={(value) => setTipoFilter(value as TipoFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {gastoTipos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Flujo</p>
              <Select value={flujoFilter} onValueChange={(value) => setFlujoFilter(value as FlujoFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {gastoFlujos.map((flujo) => (
                    <SelectItem key={flujo} value={flujo}>
                      {flujo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[120px_180px_minmax(280px,1fr)_180px_140px] gap-3 border-b border-slate-200/70 bg-slate-50/70 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    <span>Fecha</span>
                    <span>Tipo / Flujo</span>
                    <span>Descripcion / motivo</span>
                    <span>Encargado</span>
                    <span>Costo</span>
                  </div>
                  <div className="divide-y divide-slate-200/60">
                    {gastosFiltrados.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay gastos para los filtros seleccionados.
                      </div>
                    ) : (
                      gastosFiltrados.map((gasto) => (
                        <div
                          key={gasto.id}
                          className="grid grid-cols-[120px_180px_minmax(280px,1fr)_180px_140px] items-center gap-3 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{gasto.fecha}</p>
                            <p className="text-[11px] text-slate-500">{gasto.id}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                              {gasto.tipo}
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-600">
                              {gasto.flujo}
                            </Badge>
                          </div>

                          <p className="text-sm text-slate-700">{gasto.descripcion}</p>
                          <p className="text-sm font-medium text-slate-800">{gasto.encargado}</p>
                          <p className="text-right text-sm font-semibold text-rose-700">{formatMoney(gasto.costo)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
