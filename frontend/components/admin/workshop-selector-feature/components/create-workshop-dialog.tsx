'use client'

import { Button } from '@/components/admin/admin-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkshopCreateInput } from '@/lib/workshops'
import { Plus } from 'lucide-react'

type CreateWorkshopDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  formData: WorkshopCreateInput
  onFieldChange: <K extends keyof WorkshopCreateInput>(field: K, value: WorkshopCreateInput[K]) => void
  onSubmit: (event: React.FormEvent) => void
}

export const CreateWorkshopDialog = ({
  isOpen,
  onOpenChange,
  formData,
  onFieldChange,
  onSubmit,
}: CreateWorkshopDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <button
        type="button"
        className="flex h-full min-h-[340px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-slate-200 bg-white/60 p-6 text-left text-slate-600 transition hover:border-slate-300 hover:bg-white/80"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
          <Plus className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Crear nuevo taller</p>
          <p className="mt-1 text-xs text-slate-500">Registra un taller adicional y comienza su configuracion.</p>
        </div>
      </button>
    </DialogTrigger>
    <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nuevo taller</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nombre del taller</Label>
          <Input value={formData.nombre} onChange={(event) => onFieldChange('nombre', event.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Ciudad</Label>
            <Input value={formData.ciudad} onChange={(event) => onFieldChange('ciudad', event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Encargado</Label>
            <Input
              value={formData.encargado}
              onChange={(event) => onFieldChange('encargado', event.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Direccion</Label>
          <Input
            value={formData.direccion}
            onChange={(event) => onFieldChange('direccion', event.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input value={formData.telefono} onChange={(event) => onFieldChange('telefono', event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Correo</Label>
            <Input
              type="email"
              value={formData.correo}
              onChange={(event) => onFieldChange('correo', event.target.value)}
              required
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          El taller se crea en estado de implementacion y listo para conectar con la API.
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            Crear taller
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
)
