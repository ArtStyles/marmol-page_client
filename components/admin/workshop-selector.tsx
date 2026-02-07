'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/admin/admin-button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AdminUser } from '@/lib/admin-auth'
import type { WorkshopCreateInput, WorkshopTenant } from '@/lib/workshops'
import { Factory, MapPin, Plus, TrendingUp, Users } from 'lucide-react'

type AdminWorkshopSelectorProps = {
  user: AdminUser
  workshops: WorkshopTenant[]
  onSelect: (workshopId: string) => void
  onCreate: (input: WorkshopCreateInput) => void
  onToggleStatus: (workshopId: string) => void
  onDelete: (workshopId: string) => void
  onLogout: () => void
}

const statusStyles: Record<WorkshopTenant['estado'], string> = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'en-implementacion': 'border-amber-200 bg-amber-50 text-amber-700',
  pausado: 'border-slate-200 bg-slate-100 text-slate-600',
}

const backgroundStyle = {
  '--dash-bg': 'linear-gradient(135deg, #f6f7fb 0%, #e9eef7 45%, #f7f2eb 100%)',
  backgroundImage: 'var(--dash-bg)',
} as React.CSSProperties

export function AdminWorkshopSelector({
  user,
  workshops,
  onSelect,
  onCreate,
  onToggleStatus,
  onDelete,
  onLogout,
}: AdminWorkshopSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<WorkshopCreateInput>({
    nombre: '',
    ciudad: '',
    direccion: '',
    encargado: '',
    telefono: '',
    correo: '',
  })

  const formatMoney = (value: number) => {
    const sign = value < 0 ? '-' : ''
    const absolute = Math.abs(Math.round(value))
    return `${sign}$${absolute.toLocaleString()}`
  }

  const sortedWorkshops = useMemo(
    () =>
      [...workshops].sort((a, b) => {
        if (a.estado === b.estado) return a.nombre.localeCompare(b.nombre)
        if (a.estado === 'activo') return -1
        if (b.estado === 'activo') return 1
        return a.estado.localeCompare(b.estado)
      }),
    [workshops],
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onCreate(formData)
    setIsDialogOpen(false)
    setFormData({
      nombre: '',
      ciudad: '',
      direccion: '',
      encargado: '',
      telefono: '',
      correo: '',
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden p-6" style={backgroundStyle}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-[#dbe7ff] opacity-70 blur-3xl" />
        <div className="absolute -bottom-24 left-[-40px] h-72 w-72 rounded-full bg-[#f6e7d2] opacity-70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.5),transparent_50%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Seleccion de taller</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Bienvenido, {user.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Elige el taller que deseas administrar o crea uno nuevo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge variant="secondary" className="uppercase tracking-[0.2em] text-[10px]">
              {user.role}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Cerrar sesion
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedWorkshops.map((workshop) => (
            <div
              key={workshop.id}
              className="rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Taller</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{workshop.nombre}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{workshop.ciudad}</span>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyles[workshop.estado]}>
                  {workshop.estado.replace('-', ' ')}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Empleados
                  </span>
                  <span className="font-semibold text-slate-900">{workshop.empleados}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Factory className="h-3.5 w-3.5" />
                    Produccion mes
                  </span>
                  <span className="font-semibold text-slate-900">
                    {workshop.produccionMesM2.toFixed(0)} m2
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Ventas mes
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(workshop.ventasMes)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="rounded-2xl bg-white/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Margen</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {(workshop.margenOperativo * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Ordenes</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {workshop.ordenesActivas}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Ultima actualizacion</span>
                <span className="font-medium text-slate-700">{workshop.ultimaActualizacion}</span>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  className="w-full"
                  onClick={() => onSelect(workshop.id)}
                  disabled={workshop.estado === 'pausado'}
                >
                  {workshop.estado === 'pausado' ? 'Taller pausado' : 'Administrar taller'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => onToggleStatus(workshop.id)}
                  >
                    {workshop.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-rose-600 hover:text-rose-700"
                    onClick={() => onDelete(workshop.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  <p className="mt-1 text-xs text-slate-500">
                    Registra un taller adicional y comienza su configuracion.
                  </p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo taller</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del taller</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={formData.ciudad}
                      onChange={(event) => setFormData({ ...formData, ciudad: event.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Encargado</Label>
                    <Input
                      value={formData.encargado}
                      onChange={(event) =>
                        setFormData({ ...formData, encargado: event.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Direccion</Label>
                  <Input
                    value={formData.direccion}
                    onChange={(event) => setFormData({ ...formData, direccion: event.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input
                      value={formData.telefono}
                      onChange={(event) => setFormData({ ...formData, telefono: event.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input
                      type="email"
                      value={formData.correo}
                      onChange={(event) => setFormData({ ...formData, correo: event.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  El taller se crea en estado de implementacion y listo para conectar con la API.
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Crear taller
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
