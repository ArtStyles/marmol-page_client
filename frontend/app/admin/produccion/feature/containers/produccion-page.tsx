'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'
import { Button } from '@/components/admin/admin-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { createRetornoProcesoInventario } from '@/lib/resources-api'
import { Search } from 'lucide-react'
import { useProduccionPageState } from '../hooks/use-produccion-page-state'
import { ProduccionCreateDialog } from '../components/create-dialog/produccion-create-dialog'
import { ProduccionRightPanel } from '../components/produccion-right-panel'
import { ProduccionRegistrosList } from '../components/produccion-registros-list'

export default function ProduccionPage() {
  const {
    addUsage,
    dependenciesError,
    dateEditPolicy,
    dateFilter,
    equiposActivos,
    fechaResumen,
    fechasOrdenadas,
    formData,
    formError,
    getLosasDisponiblesParaAccion,
    getDatePolicy,
    groupedByDate,
    handleSubmit,
    isDialogOpen,
    loadingDependencies,
    origenesActivosByAccion,
    origenesActivosResumen,
    prepareNewForm,
    removeUsage,
    resetFormAndClose,
    resumenAcciones,
    resumenPartidas,
    searchTerm,
    setDateFilter,
    setFormData,
    setIsDialogOpen,
    setSearchTerm,
    stockProcesoDisponible,
    topOrigenesResumen,
    today,
    totalLosasResumen,
    totalM2Resumen,
    toggleUsageDimension,
    trabajadoresActivos,
    resolveOrigenCodigo,
    updateUsage,
    updateUsageDimension,
  } = useProduccionPageState()

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [retornoDialogOpen, setRetornoDialogOpen] = useState(false)
  const [retornoProductoId, setRetornoProductoId] = useState('')
  const [retornoCantidadLosas, setRetornoCantidadLosas] = useState(0)
  const [retornoCantidadTouched, setRetornoCantidadTouched] = useState(false)
  const [retornoMotivo, setRetornoMotivo] = useState('')
  const [retornoDialogError, setRetornoDialogError] = useState<string | null>(null)
  const [retornoDialogSubmitting, setRetornoDialogSubmitting] = useState(false)
  const [retornoNotice, setRetornoNotice] = useState<string | null>(null)

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

  const canSolicitarRetornoProceso = currentUser
    ? hasPermission(currentUser, 'inventario:write')
    : false

  const productosProcesoParaRetorno = useMemo(
    () => [...stockProcesoDisponible].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [stockProcesoDisponible],
  )
  const retornoProductoSeleccionado = useMemo(
    () =>
      productosProcesoParaRetorno.find((producto) => producto.id === retornoProductoId) ?? null,
    [productosProcesoParaRetorno, retornoProductoId],
  )

  const openRetornoDialog = () => {
    if (!canSolicitarRetornoProceso) return
    setRetornoDialogError(null)
    setRetornoProductoId('')
    setRetornoCantidadLosas(0)
    setRetornoCantidadTouched(false)
    setRetornoMotivo('')
    setRetornoDialogOpen(true)
  }

  const closeRetornoDialog = () => {
    if (retornoDialogSubmitting) return
    setRetornoDialogOpen(false)
    setRetornoDialogError(null)
  }

  const confirmRetornoProceso = async () => {
    if (!retornoProductoSeleccionado) {
      setRetornoDialogError('Selecciona un producto de proceso para retornar a almacen.')
      return
    }

    const cantidadLosas = Math.trunc(retornoCantidadLosas)
    if (!Number.isInteger(cantidadLosas) || cantidadLosas <= 0) {
      setRetornoDialogError('La cantidad de losas debe ser entera y mayor a 0.')
      return
    }

    if (cantidadLosas > retornoProductoSeleccionado.cantidadLosas) {
      setRetornoDialogError(
        `La cantidad solicitada excede el stock disponible (${retornoProductoSeleccionado.cantidadLosas} losas).`,
      )
      return
    }

    const motivo = retornoMotivo.trim()
    if (motivo.length < 5) {
      setRetornoDialogError('El motivo debe tener al menos 5 caracteres.')
      return
    }

    setRetornoDialogError(null)
    setRetornoDialogSubmitting(true)
    try {
      const movimiento = await createRetornoProcesoInventario({
        productoId: retornoProductoSeleccionado.id,
        cantidadLosas,
        motivo,
      })
      setRetornoNotice(
        `Solicitud ${movimiento.id} enviada a almacen para retorno sin cambio de estado.`,
      )
      closeRetornoDialog()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la solicitud de retorno a almacen.'
      setRetornoDialogError(message)
    } finally {
      setRetornoDialogSubmitting(false)
    }
  }

  const rightPanel = (
    <ProduccionRightPanel
      fechaResumen={fechaResumen}
      origenesActivosResumen={origenesActivosResumen}
      resumenAcciones={resumenAcciones}
      resumenPartidas={resumenPartidas}
      topOrigenesResumen={topOrigenesResumen}
      totalLosasResumen={totalLosasResumen}
      totalM2Resumen={totalM2Resumen}
    />
  )

  const openEditByFecha = (fecha: string) => {
    prepareNewForm()
    setFormData((prev) => ({
      ...prev,
      fecha,
      accionActiva: '',
    }))
    setIsDialogOpen(true)
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Produccion diaria</h1>
            {dependenciesError ? <p className="mt-2 text-sm text-destructive">{dependenciesError}</p> : null}
            {loadingDependencies ? (
              <p className="mt-2 text-sm text-slate-500">Cargando catalogos de produccion...</p>
            ) : null}
            {retornoNotice ? <p className="mt-2 text-sm text-emerald-700">{retornoNotice}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canSolicitarRetornoProceso ? (
              <Button type="button" variant="outline" onClick={openRetornoDialog}>
                Retirar a almacen
              </Button>
            ) : null}
            <ProduccionCreateDialog
              addUsage={addUsage}
              dateEditPolicy={dateEditPolicy}
              equiposActivos={equiposActivos}
              formData={formData}
              formError={formError}
              getLosasDisponiblesParaAccion={getLosasDisponiblesParaAccion}
              handleSubmit={handleSubmit}
              isDialogOpen={isDialogOpen}
              origenesActivosByAccion={origenesActivosByAccion}
              prepareNewForm={prepareNewForm}
              removeUsage={removeUsage}
              resetFormAndClose={resetFormAndClose}
              setFormData={setFormData}
              setIsDialogOpen={setIsDialogOpen}
              toggleUsageDimension={toggleUsageDimension}
              today={today}
              trabajadoresActivos={trabajadoresActivos}
              updateUsage={updateUsage}
              updateUsageDimension={updateUsageDimension}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_220px_auto] sm:items-end">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fecha, origen, tipo o dimension..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Filtrar fecha</p>
              <Input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => setDateFilter('')}
                disabled={!dateFilter}
              >
                Limpiar fecha
              </Button>
            </div>
          </div>
        </div>

        <Dialog
          open={retornoDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeRetornoDialog()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Retornar losas de proceso a almacen</DialogTitle>
              <DialogDescription>
                Esta solicitud queda pendiente hasta aprobacion de jefatura de almacen.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Producto en proceso</Label>
                <Select
                  value={retornoProductoId}
                  onValueChange={(value) => {
                    setRetornoProductoId(value)
                    if (retornoDialogError) setRetornoDialogError(null)
                  }}
                  disabled={retornoDialogSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productosProcesoParaRetorno.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Sin stock disponible en proceso
                      </SelectItem>
                    ) : (
                      productosProcesoParaRetorno.map((producto) => (
                        <SelectItem key={producto.id} value={producto.id}>
                          {producto.nombre} · {producto.estado} · {producto.cantidadLosas} losas
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {retornoProductoSeleccionado ? (
                <p className="text-xs text-slate-600">
                  Disponible en proceso: {retornoProductoSeleccionado.cantidadLosas} losas (
                  {retornoProductoSeleccionado.metrosCuadrados.toFixed(2)} m2)
                </p>
              ) : null}

              <div className="space-y-1">
                <Label>Cantidad de losas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={retornoCantidadTouched || retornoCantidadLosas > 0 ? retornoCantidadLosas : ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setRetornoCantidadTouched(value !== '')
                    setRetornoCantidadLosas(value === '' ? 0 : Math.trunc(Number(value)))
                    if (retornoDialogError) setRetornoDialogError(null)
                  }}
                  disabled={retornoDialogSubmitting}
                />
              </div>

              <div className="space-y-1">
                <Label>Motivo</Label>
                <Textarea
                  value={retornoMotivo}
                  onChange={(event) => {
                    setRetornoMotivo(event.target.value)
                    if (retornoDialogError) setRetornoDialogError(null)
                  }}
                  placeholder="Motivo del retorno (minimo 5 caracteres)."
                  rows={3}
                  disabled={retornoDialogSubmitting}
                />
              </div>

              {retornoDialogError ? (
                <p className="text-xs text-destructive">{retornoDialogError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeRetornoDialog}
                disabled={retornoDialogSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void confirmRetornoProceso()
                }}
                disabled={retornoDialogSubmitting || !retornoProductoSeleccionado || retornoCantidadLosas <= 0}
              >
                {retornoDialogSubmitting ? 'Guardando...' : 'Solicitar retorno'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProduccionRegistrosList
          fechasOrdenadas={fechasOrdenadas}
          groupedByDate={groupedByDate}
          getDatePolicy={getDatePolicy}
          resolveOrigenCodigo={resolveOrigenCodigo}
          onEditFecha={openEditByFecha}
        />
      </div>
    </AdminShell>
  )
}
