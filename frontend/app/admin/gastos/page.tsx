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
import { useFinancialSummary } from '@/hooks/use-financial-summary'
import {
  gastoFlujos,
  gastoTipos,
  gastoTiposManuales,
  useGastosStore,
  type GastoFlujo,
  type GastoManualTipo,
  type GastoRegistro,
} from '@/hooks/use-gastos'
import { Ban, Plus, ReceiptText, Search, TrendingDown, UserRound } from 'lucide-react'

type TipoFilter = 'todos' | (typeof gastoTipos)[number]
type FlujoFilter = 'todos' | GastoFlujo

type GastoFormData = {
  fecha: string
  costo: number
  tipo: GastoManualTipo
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

const formatOriginLabel = (gasto: GastoRegistro) =>
  gasto.origen === 'manual'
    ? 'Manual'
    : gasto.origenModulo === 'bloques'
      ? 'Sistema / Bloques'
      : 'Sistema / Pagos'

export default function GastosPage() {
  const { gastos, addGasto, cancelGasto, loading, error } = useGastosStore()
  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    reload: reloadSummary,
  } = useFinancialSummary({ scope: 'gastos' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [costTouched, setCostTouched] = useState(false)
  const [formData, setFormData] = useState<GastoFormData>(buildDefaultForm)
  const [gastoToCancel, setGastoToCancel] = useState<GastoRegistro | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancelPending, setCancelPending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos')
  const [flujoFilter, setFlujoFilter] = useState<FlujoFilter>('todos')

  const gastosFiltrados = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()

    return [...gastos]
      .sort((left, right) => {
        const byFecha = right.fecha.localeCompare(left.fecha)
        if (byFecha !== 0) return byFecha
        return right.id.localeCompare(left.id)
      })
      .filter((gasto) => {
        const matchTipo = tipoFilter === 'todos' || gasto.tipo === tipoFilter
        const matchFlujo = flujoFilter === 'todos' || gasto.flujo === flujoFilter
        const matchQuery =
          query.length === 0 ||
          gasto.descripcion.toLowerCase().includes(query) ||
          gasto.encargado.toLowerCase().includes(query) ||
          gasto.fecha.includes(query) ||
          formatOriginLabel(gasto).toLowerCase().includes(query) ||
          (gasto.creadoPorNombre ?? '').toLowerCase().includes(query)

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

  const openCancelDialog = (gasto: GastoRegistro) => {
    setGastoToCancel(gasto)
    setCancelReason('')
    setCancelError('')
  }

  const closeCancelDialog = (force = false) => {
    if (cancelPending && !force) return
    setGastoToCancel(null)
    setCancelReason('')
    setCancelError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
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

    const created = await addGasto({
      fecha: formData.fecha || getTodayDateIso(),
      costo: Number(costo.toFixed(2)),
      tipo: formData.tipo,
      flujo: formData.flujo,
      descripcion,
      encargado,
    })
    if (created) {
      reloadSummary()
      closeDialog()
      return
    }
    setFormError('No se pudo guardar el gasto en el backend.')
  }

  const handleCancelSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!gastoToCancel) return

    const motivoAnulacion = cancelReason.trim()
    if (motivoAnulacion.length < 6) {
      setCancelError('Indica un motivo de anulacion con al menos 6 caracteres.')
      return
    }

    setCancelPending(true)
    setCancelError('')

    try {
      const cancelled = await cancelGasto(gastoToCancel.id, motivoAnulacion)
      if (!cancelled) {
        setCancelError('No se pudo anular el gasto en el backend.')
        return
      }

      reloadSummary()
      closeCancelDialog(true)
    } finally {
      setCancelPending(false)
    }
  }

  const expenseSummary = summary?.gastos
  const activeBreakdown = expenseSummary?.porTipo.slice(0, 5) ?? []
  const topEncargados = expenseSummary?.topEncargados ?? []

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen gastos" meta={`${expenseSummary?.cantidadActivos ?? 0} activos`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total del libro</span>
            <span className="font-semibold text-rose-700">{formatMoney(expenseSummary?.totalActivo ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total del mes</span>
            <span className="font-semibold">{formatMoney(expenseSummary?.totalMesActual ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Promedio por registro</span>
            <span className="font-semibold">{formatMoney(expenseSummary?.promedioActivo ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Peso sobre ingresos</span>
            <span className="font-semibold">{formatPercent(expenseSummary?.ratioContraIngresos ?? 0)}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top encargados" meta="Costo activo">
        <div className="space-y-2 text-sm text-slate-700">
          {topEncargados.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros activos.</p>
          ) : (
            topEncargados.map((item) => (
              <div
                key={item.encargado}
                className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2"
              >
                <span className="text-xs font-semibold text-slate-900">{item.encargado}</span>
                <span className="text-xs font-semibold text-rose-700">{formatMoney(item.total)}</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Origen del gasto" meta="Activo">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Manual</span>
            <span className="font-semibold">{formatMoney(expenseSummary?.totalManualActivo ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Sistema</span>
            <span className="font-semibold">{formatMoney(expenseSummary?.totalSistemaActivo ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Balance contra ingresos</span>
            <span
              className={`font-semibold ${
                (expenseSummary?.balanceContraIngresos ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatMoney(expenseSummary?.balanceContraIngresos ?? 0)}
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
            <h1 className="font-sans text-3xl font-bold text-foreground">Gastos</h1>
            <p className="mt-1 font-sans text-muted-foreground">
              Libro de gastos manuales y automaticos. Materia prima, transporte y nomina se generan
              desde sus modulos origen.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            {summaryError ? <p className="mt-2 text-sm text-destructive">{summaryError}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              Ledger unificado
            </Badge>
            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
              Tipos manuales limitados
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
                  <DialogTitle>Nuevo gasto manual</DialogTitle>
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
                      <Label>Tipo de gasto manual</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) => setFormData({ ...formData, tipo: value as GastoManualTipo })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gastoTiposManuales.map((tipo) => (
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
            <Dialog
              open={Boolean(gastoToCancel)}
              onOpenChange={(open) => {
                if (!open) closeCancelDialog()
              }}
            >
              <DialogContent className="w-[96vw] max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>Anular gasto manual</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCancelSubmit} className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
                    <p className="font-semibold">
                      {gastoToCancel?.tipo} · {gastoToCancel ? formatMoney(gastoToCancel.costo) : '$0'}
                    </p>
                    <p className="mt-1 text-xs text-amber-900/80">{gastoToCancel?.descripcion}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo de anulacion</Label>
                    <Textarea
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Explica por que se anula este gasto..."
                      className="min-h-[96px]"
                      disabled={cancelPending}
                    />
                  </div>

                  {cancelError ? <p className="text-sm text-destructive">{cancelError}</p> : null}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => closeCancelDialog()}
                      className="flex-1 bg-transparent"
                      disabled={cancelPending}
                    >
                      Cerrar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={cancelPending}>
                      {cancelPending ? 'Anulando...' : 'Confirmar anulacion'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Gasto activo</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-600">
                <TrendingDown className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(expenseSummary?.totalActivo ?? 0)}
            </p>
            <p className="text-xs text-slate-500">{expenseSummary?.cantidadActivos ?? 0} registros activos</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Mes actual</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <ReceiptText className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(expenseSummary?.totalMesActual ?? 0)}
            </p>
            <p className="text-xs text-slate-500">{expenseSummary?.cantidadMesActual ?? 0} gastos del mes</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Promedio registro</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <UserRound className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatMoney(expenseSummary?.promedioActivo ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Costo medio por movimiento activo</p>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Peso sobre ingresos</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <ReceiptText className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatPercent(expenseSummary?.ratioContraIngresos ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Relacion entre gastos activos e ingresos operativos</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Impacto del ledger</p>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Ingresos operativos de referencia</span>
                <span className="font-semibold">{formatMoney(summary?.operacion.ingresosOperativos ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total gastos activos</span>
                <span className="font-semibold text-rose-700">{formatMoney(expenseSummary?.totalActivo ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Manual activo</span>
                <span className="font-semibold">{formatMoney(expenseSummary?.totalManualActivo ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sistema activo</span>
                <span className="font-semibold">{formatMoney(expenseSummary?.totalSistemaActivo ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/70 pt-3">
                <span>Balance contra ingresos</span>
                <span
                  className={`font-semibold ${
                    (expenseSummary?.balanceContraIngresos ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatMoney(expenseSummary?.balanceContraIngresos ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/60 bg-white/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Distribucion por tipo</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {activeBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500">Sin gastos activos.</p>
              ) : (
                activeBreakdown.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2"
                  >
                    <span>{item.label}</span>
                    <span className="font-semibold">{formatMoney(item.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[var(--agent-radius-panel)] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_200px]">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por motivo, encargado, creador o fecha..."
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

        <Card className="border-none bg-transparent p-0 shadow-none outline-none">
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-[var(--agent-radius-panel-tight)] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <div className="overflow-x-auto">
                <div className="min-w-[1160px]">
                  <div className="grid grid-cols-[120px_180px_minmax(240px,1fr)_170px_210px_140px_140px] gap-3 border-b border-slate-200/70 bg-slate-50/70 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    <span>Fecha</span>
                    <span>Tipo / Flujo</span>
                    <span>Descripcion / motivo</span>
                    <span>Encargado</span>
                    <span>Origen / estado</span>
                    <span>Costo</span>
                    <span>Acciones</span>
                  </div>
                  <div className="divide-y divide-slate-200/60">
                    {loading || summaryLoading ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">Cargando gastos...</div>
                    ) : gastosFiltrados.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay gastos para los filtros seleccionados.
                      </div>
                    ) : (
                      gastosFiltrados.map((gasto) => (
                        <div
                          key={gasto.id}
                          className={`grid grid-cols-[120px_180px_minmax(240px,1fr)_170px_210px_140px_140px] items-center gap-3 px-4 py-3 ${
                            gasto.estado === 'anulado' ? 'bg-slate-50/50 opacity-75' : ''
                          }`}
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

                          <div>
                            <p className="text-sm text-slate-700">{gasto.descripcion}</p>
                            {gasto.creadoPorNombre ? (
                              <p className="mt-1 text-[11px] text-slate-500">Creado por {gasto.creadoPorNombre}</p>
                            ) : null}
                          </div>

                          <p className="text-sm font-medium text-slate-800">{gasto.encargado}</p>

                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-100 text-slate-700">
                              {formatOriginLabel(gasto)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                gasto.estado === 'activo'
                                  ? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'w-fit border-amber-200 bg-amber-50 text-amber-700'
                              }
                            >
                              {gasto.estado === 'activo' ? 'Activo' : 'Anulado'}
                            </Badge>
                          </div>

                          <p className="text-right text-sm font-semibold text-rose-700">{formatMoney(gasto.costo)}</p>

                          <div className="flex justify-end">
                            {gasto.origen === 'manual' && gasto.estado === 'activo' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-transparent"
                                onClick={() => openCancelDialog(gasto)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Anular
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {gasto.origen === 'sistema' ? 'Desde origen' : 'Sin accion'}
                              </span>
                            )}
                          </div>
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
