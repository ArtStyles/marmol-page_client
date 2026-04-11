'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { Card, CardContent } from '@/components/ui/card'
import { dimensiones } from '@/lib/data'
import { losasAMetros, type BloqueOLote, type Dimension } from '@/lib/types'
import {
  createBloque,
  createProducto,
  deleteBloque,
  getBloques,
  updateBloque,
} from '@/lib/resources-api'
import { ADMIN_STORAGE_KEY, hasPermission, type AdminUser } from '@/lib/admin-auth'
import { getBloqueCodigo } from '@/lib/bloque-codigo'
import { Plus, Search, Eye, Edit, Trash2, CircleOff, RotateCcw } from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function BloquesPage() {
  const [bloques, setBloques] = useState<BloqueOLote[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBloque, setSelectedBloque] = useState<BloqueOLote | null>(null)
  const [editingBloque, setEditingBloque] = useState<BloqueOLote | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BloqueOLote | null>(null)
  const [statusTarget, setStatusTarget] = useState<BloqueOLote | null>(null)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [numericTouched, setNumericTouched] = useState({
    metrosComprados: false,
    costo: false,
    costoTransporte: false,
  })
  const [formData, setFormData] = useState({
    tipo: 'Bloque' as 'Bloque' | 'Lote',
    dimensionBase: '60x40' as Dimension,
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
    () =>
      bloques
        .filter((bloque) => bloque.tipo === 'Bloque')
        .reduce((sum, bloque) => sum + bloque.metrosComprados, 0),
    [bloques],
  )

  const totalLosasLotes = useMemo(
    () =>
      bloques
        .filter((bloque) => bloque.tipo === 'Lote')
        .reduce((sum, bloque) => sum + bloque.metrosComprados, 0),
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

      <AdminPanelCard title="Volumen comprado" meta="bloques y lotes">
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Total bloques (m3)</span>
            <span className="font-semibold">{totalMetrosComprados.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
            <span>Total lotes (losas)</span>
            <span className="font-semibold">{Math.trunc(totalLosasLotes).toLocaleString()}</span>
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
                  {bloque.tipo === 'Lote'
                    ? `${Math.trunc(bloque.metrosComprados).toLocaleString()} losas`
                    : `${bloque.metrosComprados.toLocaleString()} m3`}
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
          dimensionBase: formData.dimensionBase,
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
        dimensionBase: formData.dimensionBase,
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

      if (formData.tipo === 'Lote') {
        const cantidadLosas = Math.max(0, Math.trunc(formData.metrosComprados))
        if (cantidadLosas > 0) {
          const metrosCuadrados = Number(
            losasAMetros(cantidadLosas, formData.dimensionBase).toFixed(2),
          )
          const costoTotal = formData.costo + formData.costoTransporte
          const precioM2 = metrosCuadrados > 0 ? Number((costoTotal / metrosCuadrados).toFixed(2)) : 0
          const codigoOrigen = getBloqueCodigo(newBloque)

          try {
            await createProducto({
              nombre: `Piso ${codigoOrigen} ${formData.dimensionBase} Picado`,
              tipo: 'Piso',
              estado: 'Picado',
              ubicacion: 'almacen',
              dimension: formData.dimensionBase,
              origenId: newBloque.id,
              origenNombre: codigoOrigen,
              cantidadLosas,
              metrosCuadrados,
              precioM2,
              imagen: '',
            })
          } catch (error) {
            setActionError(
              `Lote ${codigoOrigen} registrado, pero no se pudo crear su entrada en inventario: ${
                error instanceof Error ? error.message : 'error desconocido'
              }`,
            )
          }
        }
      }

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
      dimensionBase: bloque.dimensionBase,
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

  const openDeleteConfirm = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    setDeleteTarget(bloque)
  }

  const confirmDelete = async (bloque: BloqueOLote) => {
    setIsDeleting(true)
    setActionError(null)
    try {
      await deleteBloque(bloque.id)
      setBloques((prev) => prev.filter((item) => item.id !== bloque.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo eliminar el bloque/lote.')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const openEstadoConfirm = (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    setStatusTarget(bloque)
  }

  const confirmToggleEstado = async (bloque: BloqueOLote) => {
    if (!canModify(bloque.fechaIngreso)) return
    setIsUpdatingStatus(true)
    setActionError(null)
    try {
      const updated = await updateBloque(bloque.id, {
        estado: bloque.estado === 'activo' ? 'agotado' : 'activo',
      })
      setBloques((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo actualizar el estado.')
    } finally {
      setIsUpdatingStatus(false)
      setStatusTarget(null)
    }
  }

  const resetForm = () => {
    setEditingBloque(null)
    setFormData({
      tipo: 'Bloque',
      dimensionBase: '60x40',
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
      <div className="grid w-fit grid-cols-2 gap-1 justify-self-start lg:justify-self-end">
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
          onClick={() => openDeleteConfirm(bloque)}
          disabled={!allowed}
          title={allowed ? 'Eliminar' : blockedTitle}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => openEstadoConfirm(bloque)}
          disabled={!allowed}
          title={allowed ? (bloque.estado === 'activo' ? 'Agotar' : 'Reactivar') : blockedTitle}
        >
          {bloque.estado === 'activo' ? (
            <CircleOff className="h-4 w-4 text-amber-600" />
          ) : (
            <RotateCcw className="h-4 w-4 text-emerald-600" />
          )}
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
                    onValueChange={(value: 'Bloque' | 'Lote') =>
                      setFormData((prev) => ({
                        ...prev,
                        tipo: value,
                        dimensionBase: value === 'Lote' ? prev.dimensionBase : '60x40',
                      }))
                    }
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

                {formData.tipo === 'Lote' ? (
                  <div className="space-y-2">
                    <Label>Medida base</Label>
                    <Select
                      value={formData.dimensionBase}
                      onValueChange={(value: Dimension) =>
                        setFormData({ ...formData, dimensionBase: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dimensiones.map((dimensionValue) => (
                          <SelectItem key={dimensionValue} value={dimensionValue}>
                            {dimensionValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{formData.tipo === 'Lote' ? 'Cantidad losas' : 'Dimension (m3)'}</Label>
                    <Input
                      type="number"
                      min="0"
                      step={formData.tipo === 'Lote' ? '1' : '0.01'}
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
                placeholder="Buscar por codigo..."
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
                  <div className="space-y-3 lg:min-w-[980px]">
                    <div className="hidden rounded-[16px] border border-slate-200/70 bg-slate-50/70 px-4 py-2 lg:grid lg:grid-cols-[minmax(0,1.15fr)_90px_150px_120px_150px] lg:gap-x-4">
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Codigo</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Cantidad</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Costo total</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Estado</span>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-right text-slate-500">Acciones</span>
                    </div>

                    <div className="divide-y divide-slate-200/60 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/80 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl">
                      {filteredBloques.map((bloque) => (
                        <div key={bloque.id} className="px-4 py-3">
                          <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_90px_150px_120px_150px] lg:items-center lg:gap-x-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{getBloqueCodigo(bloque)}</p>
                              <p className="text-[11px] text-slate-500">Ingreso {bloque.fechaIngreso}</p>
                            </div>

                            <div className="text-sm font-semibold text-slate-800">
                              {bloque.tipo === 'Lote'
                                ? `${Math.trunc(bloque.metrosComprados).toLocaleString()} losas`
                                : `${bloque.metrosComprados.toLocaleString()} m3`}
                            </div>

                            <div className="flex items-center justify-between text-sm lg:block">
                              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500 lg:hidden">Costo total</span>
                              <span className="font-semibold text-slate-900">
                                ${(bloque.costo + bloque.costoTransporte).toLocaleString()}
                              </span>
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

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar bloque/lote</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion eliminara el registro definitivamente y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {deleteTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Codigo: <span className="font-semibold">{getBloqueCodigo(deleteTarget)}</span>
                </p>
                <p>
                  Estado actual: <span className="font-semibold">{deleteTarget.estado}</span>
                </p>
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700"
                disabled={!deleteTarget || isDeleting}
                onClick={(event) => {
                  event.preventDefault()
                  if (deleteTarget) void confirmDelete(deleteTarget)
                }}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!statusTarget}
          onOpenChange={(open) => {
            if (!open && !isUpdatingStatus) setStatusTarget(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {statusTarget?.estado === 'activo' ? 'Agotar bloque/lote' : 'Reactivar bloque/lote'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion cambiara el estado del registro seleccionado.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {statusTarget ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  Codigo: <span className="font-semibold">{getBloqueCodigo(statusTarget)}</span>
                </p>
                <p>
                  Estado actual: <span className="font-semibold">{statusTarget.estado}</span>
                </p>
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdatingStatus}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!statusTarget || isUpdatingStatus}
                onClick={(event) => {
                  event.preventDefault()
                  if (statusTarget) void confirmToggleEstado(statusTarget)
                }}
              >
                {isUpdatingStatus
                  ? 'Guardando...'
                  : statusTarget?.estado === 'activo'
                    ? 'Confirmar agotado'
                    : 'Confirmar reactivacion'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                    {selectedBloque.tipo === 'Lote' ? (
                      <div>
                        <p className="text-muted-foreground">Medida base</p>
                        <p className="font-medium">{selectedBloque.dimensionBase}</p>
                      </div>
                    ) : null}
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
                      <p className="text-muted-foreground">
                        {selectedBloque.tipo === 'Lote' ? 'Cantidad losas' : 'Dimension (m3)'}
                      </p>
                      <p className="font-medium">
                        {selectedBloque.tipo === 'Lote'
                          ? `${Math.trunc(selectedBloque.metrosComprados).toLocaleString()} losas`
                          : `${selectedBloque.metrosComprados.toLocaleString()} m3`}
                      </p>
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
