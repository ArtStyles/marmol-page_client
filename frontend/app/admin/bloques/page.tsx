'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { Card, CardContent } from '@/components/ui/card'
import type { BloqueOLote } from '@/lib/types'
import { createBloque, deleteBloque, getBloques, updateBloque } from '@/lib/resources-api'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BloquesPage() {
  const [bloques, setBloques] = useState<BloqueOLote[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBloque, setSelectedBloque] = useState<BloqueOLote | null>(null)
  const [editingBloque, setEditingBloque] = useState<BloqueOLote | null>(null)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [numericTouched, setNumericTouched] = useState({
    metrosComprados: false,
    costo: false,
    costoTransporte: false,
  })
  const [formData, setFormData] = useState({
    tipo: 'Bloque' as 'Bloque' | 'Lote',
    metrosComprados: 0,
    costo: 0,
    costoTransporte: 0,
    proveedor: '',
  })

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

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setActionError(null)
      try {
        const data = await getBloques()
        if (!alive) return
        setBloques(data)
      } catch (error) {
        if (!alive) return
        setActionError(error instanceof Error ? error.message : 'No se pudo cargar bloques/lotes.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const canWriteBloques = currentUser ? hasPermission(currentUser, 'bloques:write') : false
  const today = new Date().toISOString().split('T')[0]

  const filteredBloques = useMemo(
    () =>
      bloques.filter(
        (bloque) =>
          getBloqueCodigo(bloque).toLowerCase().includes(searchTerm.toLowerCase()) ||
          bloque.proveedor.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [bloques, searchTerm],
  )

  const bloquesActivos = useMemo(
    () => bloques.filter((bloque) => bloque.estado === 'activo'),
    [bloques],
  )
  const totalCostoMaterial = useMemo(
    () => bloques.reduce((sum, bloque) => sum + bloque.costo, 0),
    [bloques],
  )
  const totalCostoTransporte = useMemo(
    () => bloques.reduce((sum, bloque) => sum + bloque.costoTransporte, 0),
    [bloques],
  )
  const totalInversion = totalCostoMaterial + totalCostoTransporte
  const proveedores = useMemo(() => new Set(bloques.map((bloque) => bloque.proveedor)).size, [bloques])

  const totalMetrosComprados = useMemo(
    () => bloques.reduce((sum, bloque) => sum + bloque.metrosComprados, 0),
    [bloques],
  )

  const canModify = (_fechaIngreso: string) => canWriteBloques

  const recentBloques = [...bloques]
    .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso))
    .slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen materia prima" meta={`${bloques.length} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Activos</span>
            <span className="font-semibold">{bloquesActivos.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Costo material</span>
            <span className="font-semibold">${totalCostoMaterial.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Costo transporte</span>
            <span className="font-semibold">${totalCostoTransporte.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Inversion total</span>
            <span className="font-semibold">${totalInversion.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Proveedores</span>
            <span className="font-semibold">{proveedores}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Volumen comprado" meta="m3 totales registrados">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Total m3</span>
            <span className="font-semibold">{totalMetrosComprados.toLocaleString()}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Entradas recientes" meta="Ultimos registros">
        <div className="space-y-2 text-sm text-slate-700">
          {recentBloques.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros recientes.</p>
          ) : (
            recentBloques.map((bloque) => (
              <div key={bloque.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{getBloqueCodigo(bloque)}</p>
                  <p className="text-[11px] text-slate-500">{bloque.fechaIngreso}</p>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {bloque.metrosComprados.toLocaleString()} m3
                </Badge>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setActionError(null)
    setIsSaving(true)

    if (editingBloque) {
      if (!canModify(editingBloque.fechaIngreso)) {
        setIsSaving(false)
        return
      }
      try {
        const updated = await updateBloque(editingBloque.id, {
          tipo: formData.tipo,
          metrosComprados: formData.metrosComprados,
          costo: formData.costo,
          costoTransporte: formData.costoTransporte,
          proveedor: formData.proveedor,
        })
        setBloques((prev) => prev.map((bloque) => (bloque.id === updated.id ? updated : bloque)))
        resetForm()
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'No se pudo actualizar el bloque/lote.')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (!canWriteBloques) {
      setActionError('No tienes permiso para registrar bloques o lotes.')
      setIsSaving(false)
      return
    }

    try {
      const newBloque = await createBloque({
        tipo: formData.tipo,
        dimensionBase: '60x40',
        costo: formData.costo,
        costoTransporte: formData.costoTransporte,
        metrosComprados: formData.metrosComprados,
        fechaIngreso: today,
        proveedor: formData.proveedor,
        losasProducidas: 0,
        losasPerdidas: 0,
        metrosVendibles: 0,
        gananciaReal: 0,
        estado: 'activo',
      })
      setBloques((prev) => [newBloque, ...prev])
      resetForm()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo crear el bloque/lote.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    setEditingBloque(bloque)
    setFormData({
      tipo: bloque.tipo,
      metrosComprados: bloque.metrosComprados,
      costo: bloque.costo,
      costoTransporte: bloque.costoTransporte,
      proveedor: bloque.proveedor,
    })
    setNumericTouched({
      metrosComprados: true,
      costo: true,
      costoTransporte: true,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    if (confirm('Eliminar este bloque/lote?')) {
      try {
        await deleteBloque(bloque.id)
        setBloques((prev) => prev.filter((item) => item.id !== bloque.id))
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'No se pudo eliminar el bloque/lote.')
      }
    }
  }

  const toggleEstado = async (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    try {
      const updated = await updateBloque(bloque.id, {
        estado: bloque.estado === 'activo' ? 'agotado' : 'activo',
      })
      setBloques((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo actualizar el estado.')
    }
  }

  const resetForm = () => {
    setEditingBloque(null)
    setFormData({
      tipo: 'Bloque',
      metrosComprados: 0,
      costo: 0,
      costoTransporte: 0,
      proveedor: '',
    })
    setNumericTouched({
      metrosComprados: false,
      costo: false,
      costoTransporte: false,
    })
    setIsDialogOpen(false)
  }

  const renderEstado = (bloque: BloqueOLote) => (
    <Badge variant={bloque.estado === 'activo' ? 'default' : 'outline'}>
      {bloque.estado === 'activo' ? 'Activo' : 'Agotado'}
    </Badge>
  )

  const renderAcciones = (bloque: BloqueOLote) => {
    const allowed = canModify(bloque.fechaIngreso)
    const blockedTitle = 'Solo administrador despues del dia'

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="icon" variant="ghost" onClick={() => setSelectedBloque(bloque)} title="Ver detalle">
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleEdit(bloque)}
          disabled={!allowed}
          title={allowed ? 'Editar' : blockedTitle}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleDelete(bloque)}
          disabled={!allowed}
          title={allowed ? 'Eliminar' : blockedTitle}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toggleEstado(bloque)}
          disabled={!allowed}
          title={allowed ? (bloque.estado === 'activo' ? 'Agotar' : 'Reactivar') : blockedTitle}
        >
          {bloque.estado === 'activo' ? 'Agotar' : 'Reactivar'}
        </Button>
      </div>
    )
  }

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-sans">Materia prima</h1>
            {actionError ? <p className="mt-2 text-sm text-destructive">{actionError}</p> : null}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => resetForm()}
                disabled={!canWriteBloques}
                title={canWriteBloques ? 'Nuevo Bloque/Lote' : 'Sin permiso de edicion'}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Bloque/Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBloque ? 'Editar Bloque/Lote' : 'Registrar Nuevo Bloque/Lote'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: 'Bloque' | 'Lote') => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bloque">Bloque</SelectItem>
                      <SelectItem value="Lote">Lote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Dimension (m3)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={
                        editingBloque || numericTouched.metrosComprados || formData.metrosComprados > 0
                          ? formData.metrosComprados
                          : ''
                      }
                      onChange={(event) => {
                        const value = event.target.value
                        setNumericTouched((prev) => ({ ...prev, metrosComprados: value !== '' }))
                        setFormData({ ...formData, metrosComprados: value === '' ? 0 : Number(value) })
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Input
                      value={formData.proveedor}
                      onChange={(event) => setFormData({ ...formData, proveedor: event.target.value })}
                      placeholder="Nombre del proveedor"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Costo material ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={editingBloque || numericTouched.costo || formData.costo > 0 ? formData.costo : ''}
                      onChange={(event) => {
                        const value = event.target.value
                        setNumericTouched((prev) => ({ ...prev, costo: value !== '' }))
                        setFormData({ ...formData, costo: value === '' ? 0 : Number(value) })
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Costo transporte ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={
                        editingBloque || numericTouched.costoTransporte || formData.costoTransporte > 0
                          ? formData.costoTransporte
                          : ''
                      }
                      onChange={(event) => {
                        const value = event.target.value
                        setNumericTouched((prev) => ({ ...prev, costoTransporte: value !== '' }))
                        setFormData({ ...formData, costoTransporte: value === '' ? 0 : Number(value) })
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : editingBloque ? 'Guardar' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por codigo o proveedor..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Card className="bg-transparent border-none outline-none shadow-none p-0">
          <CardContent className="p-0">
            {loading ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Cargando bloques/lotes...
              </div>
            ) : filteredBloques.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No hay bloques o lotes registrados
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <div className="space-y-3 lg:min-w-[1180px]">
                    <div className="hidden rounded-[16px] border border-slate-200/70 bg-slate-50/70 px-4 py-2 lg:grid lg:grid-cols-[minmax(0,1.2fr)_90px_90px_minmax(0,1fr)_120px_120px_110px_minmax(0,1.4fr)]">
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Codigo</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Tipo</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">m3</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Proveedor</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Transporte</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Costo mat.</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Estado</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Acciones</span>
                    </div>

                    <div className="divide-y divide-slate-200/60 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
                      {filteredBloques.map((bloque) => (
                        <div key={bloque.id} className="px-4 py-3">
                          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_90px_90px_minmax(0,1fr)_120px_120px_110px_minmax(0,1.4fr)] lg:items-center">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{getBloqueCodigo(bloque)}</p>
                              <p className="text-[11px] text-slate-500">Ingreso {bloque.fechaIngreso}</p>
                            </div>

                            <div>
                              <Badge variant={bloque.tipo === 'Bloque' ? 'default' : 'secondary'}>
                                {bloque.tipo}
                              </Badge>
                            </div>

                            <div className="text-sm font-semibold text-slate-800">
                              {bloque.metrosComprados.toLocaleString()} m3
                            </div>

                            <div className="text-sm text-slate-700">{bloque.proveedor}</div>

                            <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Transporte</span>
                              <span className="font-semibold text-slate-900">${bloque.costoTransporte.toLocaleString()}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm lg:block lg:text-right">
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Costo</span>
                              <span className="font-semibold text-slate-900">${bloque.costo.toLocaleString()}</span>
                            </div>

                            <div>{renderEstado(bloque)}</div>

                            <div>{renderAcciones(bloque)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedBloque} onOpenChange={() => setSelectedBloque(null)}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            {selectedBloque && (
              <>
                <DialogHeader>
                  <DialogTitle>Codigo {getBloqueCodigo(selectedBloque)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Codigo</p>
                      <p className="font-medium">{getBloqueCodigo(selectedBloque)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">{selectedBloque.tipo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estado</p>
                      <Badge variant={selectedBloque.estado === 'activo' ? 'default' : 'outline'}>
                        {selectedBloque.estado}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha de Ingreso</p>
                      <p className="font-medium">{selectedBloque.fechaIngreso}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dimension (m3)</p>
                      <p className="font-medium">{selectedBloque.metrosComprados.toLocaleString()} m3</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Proveedor</p>
                      <p className="font-medium">{selectedBloque.proveedor}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo material</p>
                      <p className="font-medium">${selectedBloque.costo.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo transporte</p>
                      <p className="font-medium">${selectedBloque.costoTransporte.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo total</p>
                      <p className="font-medium">
                        ${(selectedBloque.costo + selectedBloque.costoTransporte).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  )
}
