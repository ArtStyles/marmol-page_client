'use client'

import React from "react"
import { useEffect, useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { trabajadores as initialTrabajadores } from '@/lib/data'
import type { Trabajador } from '@/lib/types'
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
      <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-3 shadow-[var(--dash-shadow)] backdrop-blur-xl">
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
                  <h4 className="font-medium mb-3">Estadísticas de Producción</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-2xl font-bold text-blue-600">{selectedWorker.losasProducidas}</p>
                      <p className="text-xs text-muted-foreground">Losas Producidas</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-2xl font-bold text-green-600">${(selectedWorker.pagosTotales / 1000).toFixed(0)}k</p>
                      <p className="text-xs text-muted-foreground">Pagos Totales</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-2xl font-bold text-amber-600">${(selectedWorker.bonosTotales / 1000).toFixed(0)}k</p>
                      <p className="text-xs text-muted-foreground">Bonos</p>
                    </div>
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


