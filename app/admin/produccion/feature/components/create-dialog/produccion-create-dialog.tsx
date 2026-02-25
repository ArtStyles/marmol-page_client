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
import { type AccionLosa, type Dimension, type Equipo, type Trabajador } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type {
  DateEditPolicy,
  FormData,
  UpdateActionUsageDimensionFn,
  UpdateActionUsageFn,
} from '../../model/types'
import { actionOrder } from '../../lib/produccion-helpers'
import { ProduccionActionSection } from './produccion-action-section'

type ProduccionCreateDialogProps = {
  addUsage: (accion: AccionLosa) => void
  dateEditPolicy: DateEditPolicy
  equiposActivos: Equipo[]
  formData: FormData
  formError: string
  handleSubmit: (event: FormEvent) => void
  isDialogOpen: boolean
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
  dateEditPolicy,
  equiposActivos,
  formData,
  formError,
  handleSubmit,
  isDialogOpen,
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
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={prepareNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Produccion
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] w-[96vw] max-w-[96vw] overflow-y-auto lg:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Registrar produccion diaria (directo por equipo)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Fecha de produccion</Label>
              <Input
                type="date"
                max={today}
                value={formData.fecha}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, fecha: event.target.value }))
                }
              />
            </div>
          </div>

          {dateEditPolicy.hasRecords ? (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                dateEditPolicy.canMutate
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700',
              )}
            >
              {dateEditPolicy.message}
            </div>
          ) : (
            <p className="text-xs text-slate-500">{dateEditPolicy.message}</p>
          )}

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 text-sm text-slate-700">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Captura flexible por accion
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              Primero captura bloque, equipo, personal y tipo.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Luego elige una o varias dimensiones; cada una crea su subfila de losas.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Produccion por equipo</Label>

            {actionOrder.map((accion) => (
              <ProduccionActionSection
                key={accion}
                accion={accion}
                accionState={formData.acciones[accion]}
                addUsage={addUsage}
                equiposActivos={equiposActivos}
                removeUsage={removeUsage}
                toggleUsageDimension={toggleUsageDimension}
                trabajadoresActivos={trabajadoresActivos}
                updateUsage={updateUsage}
                updateUsageDimension={updateUsageDimension}
              />
            ))}
          </div>

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
              disabled={dateEditPolicy.hasRecords && !dateEditPolicy.canMutate}
            >
              {dateEditPolicy.hasRecords ? 'Modificar registro' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
