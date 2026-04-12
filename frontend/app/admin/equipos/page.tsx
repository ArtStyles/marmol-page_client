'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
import type { Equipo, TipoEquipo } from '@/lib/types'
import { createEquipo, deleteEquipo, getEquipos, updateEquipo } from '@/lib/resources-api'
import { cn } from '@/lib/utils'
import { Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react'

const tipoOptions: TipoEquipo[] = ['Cortadora', 'Pulidora', 'Escuadradora']

const estadoStyles: Record<Equipo['estado'], string> = {
  activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  mantenimiento: 'border-amber-200 bg-amber-50 text-amber-700',
  inactivo: 'border-slate-200 bg-slate-100 text-slate-600',
}

type FormData = {
  tipo: TipoEquipo
  estado: Equipo['estado']
  notas: string
}

const emptyForm: FormData = {
  tipo: 'Cortadora',
  estado: 'activo',
  notas: '',
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoEquipo>('todos')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [editError, setEditError] = useState('')
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null)
  const [editFormData, setEditFormData] = useState<FormData>(emptyForm)

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await getEquipos()
        if (!alive) return
        setEquipos(data)
      } catch (error) {
        if (!alive) return
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar equipos.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const equiposFiltrados = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()

    return equipos.filter((equipo) => {
      const matchTipo = tipoFiltro === 'todos' || equipo.tipo === tipoFiltro
      const matchQuery =
        query.length === 0 ||
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const notas = formData.notas.trim()

    setFormError('')
    setIsSaving(true)
    try {
      const newEquipo = await createEquipo({
        tipo: formData.tipo,
        estado: formData.estado,
        notas,
      })
      setEquipos((prev) => [newEquipo, ...prev])
      resetForm()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el equipo.')
    } finally {
      setIsSaving(false)
    }
  }

  const openEditDialog = (equipo: Equipo) => {
    setEditingEquipo(equipo)
    setEditFormData({
      tipo: equipo.tipo,
      estado: equipo.estado,
      notas: equipo.notas,
    })
    setEditError('')
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    if (isUpdating) return
    setIsEditDialogOpen(false)
    setEditError('')
    setEditingEquipo(null)
    setEditFormData(emptyForm)
  }

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingEquipo) return

    setEditError('')
    setIsUpdating(true)
    try {
      const updated = await updateEquipo(editingEquipo.id, {
        tipo: editFormData.tipo,
        estado: editFormData.estado,
        notas: editFormData.notas.trim(),
      })

      setEquipos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      closeEditDialog()
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'No se pudo actualizar el equipo.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (equipo: Equipo) => {
    const confirmed = window.confirm(
      `¿Eliminar el equipo ${equipo.codigoInterno}? Esta accion no se puede deshacer.`,
    )
    if (!confirmed) return

    setLoadError(null)
    setDeletingId(equipo.id)
    try {
      await deleteEquipo(equipo.id)
      setEquipos((prev) => prev.filter((item) => item.id !== equipo.id))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo eliminar el equipo.')
    } finally {
      setDeletingId(null)
    }
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
            {loadError ? <p className="mt-2 text-sm text-destructive">{loadError}</p> : null}
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
                <p className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  El codigo del equipo se genera automaticamente segun el tipo.
                </p>

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
                  <Button type="submit" className="flex-1" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar equipo'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isEditDialogOpen}
            onOpenChange={(open) => {
              if (!open) closeEditDialog()
            }}
          >
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar equipo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Codigo: <span className="font-semibold">{editingEquipo?.codigoInterno ?? '-'}</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de equipo</Label>
                    <Select
                      value={editFormData.tipo}
                      onValueChange={(value: TipoEquipo) =>
                        setEditFormData((prev) => ({ ...prev, tipo: value }))
                      }
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
                      value={editFormData.estado}
                      onValueChange={(value: Equipo['estado']) =>
                        setEditFormData((prev) => ({ ...prev, estado: value }))
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
                  <Label>Notas</Label>
                  <Textarea
                    value={editFormData.notas}
                    onChange={(event) =>
                      setEditFormData((prev) => ({ ...prev, notas: event.target.value }))
                    }
                    placeholder="Observaciones del equipo"
                    className="min-h-[88px]"
                  />
                </div>

                {editError && <p className="text-sm text-destructive">{editError}</p>}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditDialog}
                    className="flex-1 bg-transparent"
                    disabled={isUpdating}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isUpdating}>
                    {isUpdating ? 'Guardando...' : 'Guardar cambios'}
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
                  placeholder="Buscar por codigo o nota..."
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
                <div className="w-full">
                  <div className="grid grid-cols-[minmax(128px,1.1fr)_92px_96px_minmax(110px,1fr)_72px] gap-x-1 border-b border-slate-200/70 bg-slate-50/70 px-2 py-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    <span>Codigo</span>
                    <span>Tipo</span>
                    <span>Estado</span>
                    <span>Notas</span>
                    <span className="text-right">Acciones</span>
                  </div>
                  <div className="divide-y divide-slate-200/60">
                    {loading ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">Cargando equipos...</div>
                    ) : equiposFiltrados.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay equipos para los filtros seleccionados.
                      </div>
                    ) : (
                      equiposFiltrados.map((equipo) => (
                        <div
                          key={equipo.id}
                          className="grid grid-cols-[minmax(128px,1.1fr)_92px_96px_minmax(110px,1fr)_72px] items-center gap-x-1 px-2 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <Wrench className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{equipo.codigoInterno}</p>
                              <p className="text-[11px] text-slate-500">{equipo.id}</p>
                            </div>
                          </div>

                          <p className="text-sm text-slate-700">{equipo.tipo}</p>
                          <Badge variant="outline" className={cn('w-fit', estadoStyles[equipo.estado])}>
                            {equipo.estado}
                          </Badge>
                          <p className="truncate text-sm text-slate-600">{equipo.notas}</p>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-7 w-7 bg-transparent p-0"
                              onClick={() => openEditDialog(equipo)}
                              disabled={isUpdating || deletingId === equipo.id}
                              title="Editar equipo"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-7 w-7 bg-transparent p-0 text-rose-700 hover:text-rose-800"
                              onClick={() => void handleDelete(equipo)}
                              disabled={isUpdating || deletingId === equipo.id}
                              title="Eliminar equipo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
