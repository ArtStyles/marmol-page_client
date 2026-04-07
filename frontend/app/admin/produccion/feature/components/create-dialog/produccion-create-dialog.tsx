'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Button } from '@/components/admin/admin-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type AccionLosa, type BloqueOLote, type Dimension, type Equipo, type Trabajador } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type {
  DateEditPolicy,
  FormData,
  UpdateActionUsageDimensionFn,
  UpdateActionUsageFn,
} from '../../model/types'
import { actionLabels, actionOrder } from '../../lib/produccion-helpers'
import { ProduccionActionSection } from './produccion-action-section'

type ProduccionCreateDialogProps = {
  addUsage: (accion: AccionLosa) => void
  canWriteProduccion: boolean
  dateEditPolicy: DateEditPolicy
  equiposActivos: Equipo[]
  formData: FormData
  formError: string
  getLosasDisponiblesParaAccion: (
    accion: AccionLosa,
    origenId: string,
    tipo: 'Piso' | 'Plancha' | '',
    dimension: Dimension,
  ) => number | null
  handleSubmit: (event: FormEvent) => void
  isDialogOpen: boolean
  origenesActivosByAccion: Record<AccionLosa, BloqueOLote[]>
  prepareNewForm: () => void
  removeUsage: (accion: AccionLosa, usageId: string) => void
  resetFormAndClose: () => void
  setFormData: Dispatch<SetStateAction<FormData>>
  setIsDialogOpen: (open: boolean) => void
  toggleUsageDimension: (
    accion: AccionLosa,
    usageId: string,
    dimension: Dimension,
    enabled: boolean,
  ) => void
  today: string
  trabajadoresActivos: Trabajador[]
  updateUsage: UpdateActionUsageFn
  updateUsageDimension: UpdateActionUsageDimensionFn
}

export function ProduccionCreateDialog({
  addUsage,
  canWriteProduccion,
  dateEditPolicy,
  equiposActivos,
  formData,
  formError,
  getLosasDisponiblesParaAccion,
  handleSubmit,
  isDialogOpen,
  origenesActivosByAccion,
  prepareNewForm,
  removeUsage,
  resetFormAndClose,
  setFormData,
  setIsDialogOpen,
  toggleUsageDimension,
  today,
  trabajadoresActivos,
  updateUsage,
  updateUsageDimension,
}: ProduccionCreateDialogProps) {
  const accionActiva = formData.accionActiva

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        if (open && !canWriteProduccion) return
        setIsDialogOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button
          onClick={prepareNewForm}
          disabled={!canWriteProduccion}
          title={canWriteProduccion ? 'Registrar Produccion' : 'Sin permiso para registrar produccion'}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Produccion
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] w-[96vw] max-w-[96vw] overflow-y-auto lg:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Registrar produccion diaria</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            if (!canWriteProduccion) {
              event.preventDefault()
              return
            }
            handleSubmit(event)
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="max-w-md space-y-2">
              <Label>Fecha de produccion</Label>
              <Input
                type="date"
                max={today}
                value={formData.fecha}
                disabled={!canWriteProduccion}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, fecha: event.target.value }))
                }
              />
            </div>

            {accionActiva ? (
              <div className="sm:justify-self-end">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent"
                  disabled={!canWriteProduccion}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      accionActiva: '',
                    }))
                  }
                >
                  Cambiar accion
                </Button>
              </div>
            ) : null}
          </div>

          {dateEditPolicy.hasRecords && !dateEditPolicy.canMutate ? (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                'border-amber-200 bg-amber-50 text-amber-700',
              )}
            >
              {dateEditPolicy.message}
            </div>
          ) : null}

          {!accionActiva ? (
            <div className="space-y-3">
              <Label>Selecciona accion</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {actionOrder.map((accion) => (
                  <Button
                    key={accion}
                    type="button"
                    variant="outline"
                    className="justify-center bg-transparent"
                    disabled={!canWriteProduccion}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        accionActiva: accion,
                      }))
                    }
                  >
                    {actionLabels[accion]}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <ProduccionActionSection
                accion={accionActiva}
                accionState={formData.acciones[accionActiva]}
                addUsage={addUsage}
                equiposActivos={equiposActivos}
                getLosasDisponiblesParaAccion={getLosasDisponiblesParaAccion}
                origenesActivos={origenesActivosByAccion[accionActiva]}
                removeUsage={removeUsage}
                toggleUsageDimension={toggleUsageDimension}
                trabajadoresActivos={trabajadoresActivos}
                updateUsage={updateUsage}
                updateUsageDimension={updateUsageDimension}
              />
            </div>
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetFormAndClose}
              className="flex-1 bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                !canWriteProduccion ||
                (dateEditPolicy.hasRecords && !dateEditPolicy.canMutate) ||
                !accionActiva
              }
            >
              {dateEditPolicy.hasRecords ? 'Registrar otro envio' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
