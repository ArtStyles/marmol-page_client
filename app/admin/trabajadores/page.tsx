'use client'

import React from "react"
import { useEffect, useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import {
  trabajadores as initialTrabajadores,
  produccionDiaria as initialProduccion,
  historialPagos as initialHistorial,
} from '@/lib/data'
import type { Trabajador, ProduccionDiaria, HistorialPago, AccionLosa } from '@/lib/types'
import { losasAMetros } from '@/lib/types'
import { ADMIN_STORAGE_KEY, getAccessForRole, type AdminUser } from '@/lib/admin-auth'
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Eye } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const roles: Trabajador['rol'][] = [
  'Administrador',
  'Gestor de Ventas',
  'Jefe de Turno de Producción',
  'Obrero',
]

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(initialTrabajadores)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Trabajador | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<Trabajador | null>(null)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [formError, setFormError] = useState('')
  const produccion = initialProduccion
  const historialPagos = initialHistorial
  const [formData, setFormData] = useState<Partial<Trabajador>>({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'Obrero',
    estado: 'activo',
    usuario: '',
    contrasena: '',
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

  const canManageWorkers = currentUser
    ? getAccessForRole(currentUser.role).canManageWorkers
    : false
  const selectedRole = (formData.rol ?? 'Obrero') as Trabajador['rol']
  const requiresAccount = selectedRole !== 'Obrero'

  const filteredTrabajadores = trabajadores.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.rol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.usuario ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estadísticas
  const activos = trabajadores.filter(t => t.estado === 'activo')
  const totalLosasProducidas = trabajadores.reduce((sum, t) => sum + t.losasProducidas, 0)
  const totalPagos = trabajadores.reduce((sum, t) => sum + t.pagosTotales, 0)
  const totalBonos = trabajadores.reduce((sum, t) => sum + t.bonosTotales, 0)
  const topTrabajadores = [...trabajadores]
    .sort((a, b) => b.losasProducidas - a.losasProducidas)
    .slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen equipo" meta={`${trabajadores.length} perfiles`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Activos</span>
            <span className="font-semibold">{activos.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Inactivos</span>
            <span className="font-semibold">{trabajadores.filter(t => t.estado === 'inactivo').length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Losas producidas</span>
            <span className="font-semibold">{totalLosasProducidas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pagos totales</span>
            <span className="font-semibold">${totalPagos.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Bonos</span>
            <span className="font-semibold">${totalBonos.toLocaleString()}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top productores" meta="Losas acumuladas">
        <div className="space-y-2 text-sm text-slate-700">
          {topTrabajadores.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros disponibles.</p>
          ) : (
            topTrabajadores.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{worker.nombre}</p>
                  <p className="text-[11px] text-slate-500">{worker.rol}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{worker.losasProducidas} losas</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const roleValue = (formData.rol ?? 'Obrero') as Trabajador['rol']
    const needsAccount = roleValue !== 'Obrero'

    if (!editingWorker && !canManageWorkers) {
      setFormError('Solo el administrador puede crear nuevos usuarios.')
      return
    }

    if (needsAccount && (!formData.usuario || !formData.contrasena)) {
      setFormError('Este rol requiere usuario y contrasena.')
      return
    }

    setFormError('')

    if (editingWorker) {
      const updatedForm: Partial<Trabajador> = { ...formData, rol: roleValue }
      if (!needsAccount) {
        updatedForm.usuario = undefined
        updatedForm.contrasena = undefined
      }
      setTrabajadores(trabajadores.map(t => 
        t.id === editingWorker.id 
          ? { ...t, ...updatedForm } as Trabajador
          : t
      ))
    } else {
      const newTrabajador: Trabajador = {
        id: `T${String(trabajadores.length + 1).padStart(3, '0')}`,
        nombre: formData.nombre || '',
        email: formData.email || '',
        telefono: formData.telefono || '',
        rol: roleValue,
        fechaIngreso: new Date().toISOString().split('T')[0],
        estado: formData.estado as 'activo' | 'inactivo',
        usuario: needsAccount ? (formData.usuario || '') : undefined,
        contrasena: needsAccount ? (formData.contrasena || '') : undefined,
        losasProducidas: 0,
        pagosTotales: 0,
        bonosTotales: 0
      }
      setTrabajadores([...trabajadores, newTrabajador])
    }
    resetForm()
  }

  const handleEdit = (worker: Trabajador) => {
    setEditingWorker(worker)
    setFormData({
      ...worker,
      usuario: worker.usuario ?? '',
      contrasena: worker.contrasena ?? '',
    })
    setFormError('')
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (!canManageWorkers) return
    if (confirm('¿Estás seguro de eliminar este trabajador?')) {
      setTrabajadores(trabajadores.filter(t => t.id !== id))
    }
  }

  const toggleStatus = (id: string) => {
    if (!canManageWorkers) return
    setTrabajadores(trabajadores.map(t => 
      t.id === id 
        ? { ...t, estado: t.estado === 'activo' ? 'inactivo' : 'activo' } as Trabajador
        : t
    ))
  }


  const resetForm = () => {
    setEditingWorker(null)
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      rol: 'Obrero',
      estado: 'activo',
      usuario: '',
      contrasena: '',
    })
    setFormError('')
    setIsDialogOpen(false)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const columns: Column<Trabajador>[] = [
    { 
      key: 'nombre', 
      header: 'Trabajador',
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(t.nombre)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{t.nombre}</p>
            <p className="text-xs text-muted-foreground">{t.email}</p>
          </div>
        </div>
      )
    },
    { key: 'rol', header: 'Rol' },
    { key: 'telefono', header: 'Teléfono' },
    { 
      key: 'losasProducidas', 
      header: 'Losas Producidas',
      render: (t) => <span className="font-medium">{t.losasProducidas}</span>
    },
    { 
      key: 'pagosTotales', 
      header: 'Pagos Totales',
      render: (t) => `$${t.pagosTotales.toLocaleString()}`
    },
    { 
      key: 'bonosTotales', 
      header: 'Bonos',
      render: (t) => (
        <span className={t.bonosTotales > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
          {t.bonosTotales > 0 ? `+$${t.bonosTotales.toLocaleString()}` : '-'}
        </span>
      )
    },
    { 
      key: 'estado', 
      header: 'Estado',
      render: (t) => (
        <Badge variant={t.estado === 'activo' ? 'default' : 'secondary'}>
          {t.estado}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (t) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setSelectedWorker(t)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => toggleStatus(t.id)}
            title={canManageWorkers ? (t.estado === 'activo' ? 'Desactivar' : 'Activar') : 'Solo administrador'}
            disabled={!canManageWorkers}
          >
            {t.estado === 'activo' 
              ? <UserX className="h-4 w-4" /> 
              : <UserCheck className="h-4 w-4" />
            }
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleEdit(t)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(t.id)}
            title={canManageWorkers ? 'Eliminar' : 'Solo administrador'}
            disabled={!canManageWorkers}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    }
  ]

  const selectedProduccion: ProduccionDiaria[] = selectedWorker
    ? produccion.filter((p) => p.trabajadorId === selectedWorker.id)
    : []
  const selectedPagos: HistorialPago[] = selectedWorker
    ? historialPagos.filter((h) => h.trabajadorId === selectedWorker.id)
    : []

  const accionesResumen = selectedProduccion.reduce<Record<AccionLosa, number>>(
    (acc, item) => {
      acc[item.accion] += losasAMetros(item.cantidadLosas, item.dimension)
      return acc
    },
    { picar: 0, pulir: 0, escuadrar: 0 },
  )
  const totalM2 = accionesResumen.picar + accionesResumen.pulir + accionesResumen.escuadrar

  const produccionPorFecha = selectedProduccion.reduce<
    Record<
      string,
      { fecha: string; m2: Record<AccionLosa, number>; totalPago: number }
    >
  >((acc, item) => {
    if (!acc[item.fecha]) {
      acc[item.fecha] = {
        fecha: item.fecha,
        m2: { picar: 0, pulir: 0, escuadrar: 0 },
        totalPago: 0,
      }
    }
    acc[item.fecha].m2[item.accion] += losasAMetros(item.cantidadLosas, item.dimension)
    acc[item.fecha].totalPago += item.pagoFinal
    return acc
  }, {})

  const produccionDiariaList = Object.values(produccionPorFecha).sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  )

  const totalGanado = selectedProduccion.reduce((sum, item) => sum + item.pagoFinal, 0)
  const totalPagado = selectedPagos.reduce((sum, item) => sum + item.totalPagado, 0)
  const balancePendiente = totalGanado - totalPagado

  const historialMovimientos = [
    ...produccionDiariaList.map((item) => ({
      type: 'produccion' as const,
      fecha: item.fecha,
      m2: item.m2,
      totalPago: item.totalPago,
    })),
    ...selectedPagos.map((item) => ({
      type: 'pago' as const,
      fecha: item.fecha,
      totalPagado: item.totalPagado,
      produccionIds: item.produccionIds,
      bonoExtra: item.bonoExtra,
      motivoBonoExtra: item.motivoBonoExtra,
      observaciones: item.observaciones,
    })),
  ].sort((a, b) => {
    if (a.fecha === b.fecha) {
      return a.type === 'pago' ? 1 : -1
    }
    return b.fecha.localeCompare(a.fecha)
  })

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Trabajadores
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona el equipo de trabajo
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              disabled={!canManageWorkers}
              title={canManageWorkers ? 'Nuevo Trabajador' : 'Solo administrador'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Trabajador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select 
                    value={formData.rol} 
                    onValueChange={(value: Trabajador['rol']) => {
                      const nextForm = { ...formData, rol: value }
                      if (value === 'Obrero') {
                        nextForm.usuario = ''
                        nextForm.contrasena = ''
                      }
                      setFormData(nextForm)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((rol) => (
                        <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select 
                    value={formData.estado} 
                    onValueChange={(value: 'activo' | 'inactivo') => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {requiresAccount ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Input
                      value={formData.usuario}
                      onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                      placeholder="usuario@marmol.local"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contrasena</Label>
                    <Input
                      type="password"
                      value={formData.contrasena}
                      onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                      placeholder="********"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  El rol de obrero no requiere acceso al sistema.
                </div>
              )}

              {formError && <p className="text-sm text-destructive">{formError}</p>}
              
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingWorker ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar trabajadores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredTrabajadores}
        columns={columns}
        emptyMessage="No se encontraron trabajadores"
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedWorker} onOpenChange={() => setSelectedWorker(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {selectedWorker && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedWorker.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedWorker.nombre}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Rol</p>
                    <p className="font-medium">{selectedWorker.rol}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estado</p>
                    <Badge variant={selectedWorker.estado === 'activo' ? 'default' : 'secondary'}>
                      {selectedWorker.estado}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedWorker.email}</p>
                  </div>
                  {selectedWorker.usuario && (
                    <div>
                      <p className="text-muted-foreground">Usuario</p>
                      <p className="font-medium">{selectedWorker.usuario}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{selectedWorker.telefono}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha de Ingreso</p>
                    <p className="font-medium">{selectedWorker.fechaIngreso}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="mb-3 font-medium">Resumen de produccion</h4>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-2xl font-bold text-emerald-700">
                        {accionesResumen.pulir.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">m2 pulidos</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-2xl font-bold text-slate-700">{totalM2.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">m2 totales</p>
                    </div>
                    <div className="rounded-lg bg-white/80 p-3">
                      <p className="text-2xl font-bold text-slate-900">
                        ${totalGanado.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Ganado total</p>
                    </div>
                    <div className="rounded-lg bg-white/80 p-3">
                      <p className="text-2xl font-bold text-slate-900">
                        ${balancePendiente.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance pendiente</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="mb-3 font-medium">Historico de produccion y pagos</h4>
                  <div className="space-y-3">
                    {historialMovimientos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sin registros de produccion ni pagos.
                      </p>
                    ) : (
                      historialMovimientos.map((item, index) => (
                        <div
                          key={`${item.fecha}-${item.type}-${index}`}
                          className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2"
                        >
                          {item.type === 'produccion' ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-slate-900">Produccion diaria</p>
                                <span className="text-xs text-slate-500">{item.fecha}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                {item.m2.picar > 0 && (
                                  <span className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5">
                                    Picar {item.m2.picar.toFixed(2)} m2
                                  </span>
                                )}
                                {item.m2.pulir > 0 && (
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                    Pulir {item.m2.pulir.toFixed(2)} m2
                                  </span>
                                )}
                                {item.m2.escuadrar > 0 && (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                                    Escuadrar {item.m2.escuadrar.toFixed(2)} m2
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Pago del dia</span>
                                <span className="font-semibold text-slate-900">
                                  ${item.totalPago.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-slate-900">Pago realizado</p>
                                <span className="text-xs text-slate-500">{item.fecha}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">
                                  {item.produccionIds.length} registros incluidos
                                </span>
                                <span className="font-semibold text-emerald-700">
                                  -${item.totalPagado.toLocaleString()}
                                </span>
                              </div>
                              {item.bonoExtra > 0 && (
                                <p className="text-xs text-amber-700">
                                  Bono extra: +${item.bonoExtra.toLocaleString()}{' '}
                                  {item.motivoBonoExtra ? `(${item.motivoBonoExtra})` : ''}
                                </p>
                              )}
                              {item.observaciones && (
                                <p className="text-xs text-slate-500">{item.observaciones}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
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



