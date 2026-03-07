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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { equipos as initialEquipos } from '@/lib/data'
import type { Equipo, TipoEquipo } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Plus, Search, Wrench } from 'lucide-react'

const tipoOptions: TipoEquipo[] = ['Cortadora', 'Pulidora', 'Escuadradora']

const estadoStyles: Record<Equipo['estado'], string> = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  mantenimiento: 'border-amber-200 bg-amber-50 text-amber-700',
  inactivo: 'border-slate-200 bg-slate-100 text-slate-600',
}

type FormData = {
  nombre: string
  tipo: TipoEquipo
  codigoInterno: string
  estado: Equipo['estado']
  notas: string
}

const emptyForm: FormData = {
  nombre: '',
  tipo: 'Cortadora',
  codigoInterno: '',
  estado: 'activo',
  notas: '',
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>(initialEquipos)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoEquipo>('todos')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState<FormData>(emptyForm)

  const equiposFiltrados = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()

    return equipos.filter((equipo) => {
      const matchTipo = tipoFiltro === 'todos' || equipo.tipo === tipoFiltro
      const matchQuery =
        query.length === 0 ||
        equipo.nombre.toLowerCase().includes(query) ||
        equipo.codigoInterno.toLowerCase().includes(query) ||
        equipo.notas.toLowerCase().includes(query)

      return matchTipo && matchQuery
    })
  }, [equipos, searchTerm, tipoFiltro])

  const resumen = useMemo(() => {
    const activos = equipos.filter((equipo) => equipo.estado === 'activo').length
    const mantenimiento = equipos.filter((equipo) => equipo.estado === 'mantenimiento').length
    const inactivos = equipos.filter((equipo) => equipo.estado === 'inactivo').length

    return { activos, mantenimiento, inactivos, total: equipos.length }
  }, [equipos])

  const porTipo = useMemo(
    () =>
      tipoOptions.map((tipo) => ({
        tipo,
        total: equipos.filter((equipo) => equipo.tipo === tipo).length,
      })),
    [equipos],
  )

  const resetForm = () => {
    setFormData(emptyForm)
    setFormError('')
    setIsDialogOpen(false)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const nombre = formData.nombre.trim()
    const codigoInterno = formData.codigoInterno.trim().toUpperCase()
    const notas = formData.notas.trim()

    if (!nombre || !codigoInterno) {
      setFormError('Completa nombre y codigo interno.')
      return
    }

    if (equipos.some((equipo) => equipo.codigoInterno.toLowerCase() === codigoInterno.toLowerCase())) {
      setFormError('El codigo interno ya existe.')
      return
    }

    const newEquipo: Equipo = {
      id: `EQ${String(equipos.length + 1).padStart(3, '0')}`,
      nombre,
      tipo: formData.tipo,
      codigoInterno,
      estado: formData.estado,
      notas: notas || 'Sin notas',
    }

    setEquipos((prev) => [newEquipo, ...prev])
    resetForm()
  }

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen equipos" meta="Actual">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total</span>
            <span className="font-semibold">{resumen.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Activos</span>
            <span className="font-semibold text-emerald-700">{resumen.activos}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Mantenimiento</span>
            <span className="font-semibold text-amber-700">{resumen.mantenimiento}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Inactivos</span>
            <span className="font-semibold text-slate-700">{resumen.inactivos}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Por tipo" meta="Distribucion">
        <div className="space-y-2 text-sm text-slate-700">
          {porTipo.map((item) => (
            <div
              key={item.tipo}
              className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2"
            >
              <span>{item.tipo}</span>
              <span className="font-semibold">{item.total}</span>
            </div>
          ))}
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Equipos</h1>
            <p className="mt-1 text-muted-foreground font-sans">
              Administra cortadoras, pulidoras y escuadradoras del taller.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setFormData(emptyForm)
                  setFormError('')
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo equipo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar equipo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
                    placeholder="Ej: Pulidora Central 03"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de equipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: TipoEquipo) => setFormData((prev) => ({ ...prev, tipo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoOptions.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value: Equipo['estado']) =>
                        setFormData((prev) => ({ ...prev, estado: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Codigo interno</Label>
                  <Input
                    value={formData.codigoInterno}
                    onChange={(event) => setFormData((prev) => ({ ...prev, codigoInterno: event.target.value }))}
                    placeholder="Ej: PUL-03"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.notas}
                    onChange={(event) => setFormData((prev) => ({ ...prev, notas: event.target.value }))}
                    placeholder="Observaciones del equipo"
                    className="min-h-[88px]"
                  />
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Guardar equipo
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, codigo o nota..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tipo</p>
              <Select value={tipoFiltro} onValueChange={(value: 'todos' | TipoEquipo) => setTipoFiltro(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tipoOptions.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card className=" bg-transparent border-none outline-none shadow-none p-0 ">
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                  <div className="grid grid-cols-[minmax(220px,1.2fr)_140px_140px_140px_minmax(220px,1fr)] gap-3 border-b border-slate-200/70 bg-slate-50/70 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    <span>Equipo</span>
                    <span>Tipo</span>
                    <span>Codigo</span>
                    <span>Estado</span>
                    <span>Notas</span>
                  </div>
                  <div className="divide-y divide-slate-200/60">
                    {equiposFiltrados.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay equipos para los filtros seleccionados.
                      </div>
                    ) : (
                      equiposFiltrados.map((equipo) => (
                        <div
                          key={equipo.id}
                          className="grid grid-cols-[minmax(220px,1.2fr)_140px_140px_140px_minmax(220px,1fr)] items-center gap-3 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <Wrench className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{equipo.nombre}</p>
                              <p className="text-[11px] text-slate-500">{equipo.id}</p>
                            </div>
                          </div>

                          <p className="text-sm text-slate-700">{equipo.tipo}</p>
                          <p className="text-sm font-medium text-slate-800">{equipo.codigoInterno}</p>
                          <Badge variant="outline" className={cn('w-fit', estadoStyles[equipo.estado])}>
                            {equipo.estado}
                          </Badge>
                          <p className="text-sm text-slate-600">{equipo.notas}</p>
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
