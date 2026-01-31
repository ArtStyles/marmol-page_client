'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { trabajadores as initialTrabajadores, acciones } from '@/lib/data'
import { useConfiguracion } from '@/hooks/use-configuracion'
import type { Trabajador, AccionLosa } from '@/lib/types'
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Users, DollarSign, Factory, Eye } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'

const roles = ['Operario', 'Supervisor', 'Administrador']

export default function TrabajadoresPage() {
  const { config } = useConfiguracion()
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(initialTrabajadores)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Trabajador | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<Trabajador | null>(null)
  const [formData, setFormData] = useState<Partial<Trabajador>>({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'Operario',
    especialidad: [],
    estado: 'activo'
  })

  const filteredTrabajadores = trabajadores.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.rol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // EstadÃ­sticas
  const activos = trabajadores.filter(t => t.estado === 'activo')
  const totalLosasProducidas = trabajadores.reduce((sum, t) => sum + t.losasProducidas, 0)
  const totalPagos = trabajadores.reduce((sum, t) => sum + t.pagosTotales, 0)
  const totalBonos = trabajadores.reduce((sum, t) => sum + t.bonosTotales, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingWorker) {
      setTrabajadores(trabajadores.map(t => 
        t.id === editingWorker.id 
          ? { ...t, ...formData } as Trabajador
          : t
      ))
    } else {
      const newTrabajador: Trabajador = {
        id: `T${String(trabajadores.length + 1).padStart(3, '0')}`,
        nombre: formData.nombre || '',
        email: formData.email || '',
        telefono: formData.telefono || '',
        rol: formData.rol as Trabajador['rol'],
        especialidad: formData.especialidad || [],
        fechaIngreso: new Date().toISOString().split('T')[0],
        estado: formData.estado as 'activo' | 'inactivo',
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
    setFormData(worker)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Â¿EstÃ¡s seguro de eliminar este trabajador?')) {
      setTrabajadores(trabajadores.filter(t => t.id !== id))
    }
  }

  const toggleStatus = (id: string) => {
    setTrabajadores(trabajadores.map(t => 
      t.id === id 
        ? { ...t, estado: t.estado === 'activo' ? 'inactivo' : 'activo' } as Trabajador
        : t
    ))
  }

  const toggleEspecialidad = (accion: AccionLosa) => {
    const current = formData.especialidad || []
    const updated = current.includes(accion)
      ? current.filter(a => a !== accion)
      : [...current, accion]
    setFormData({ ...formData, especialidad: updated })
  }

  const resetForm = () => {
    setEditingWorker(null)
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      rol: 'Operario',
      especialidad: [],
      estado: 'activo'
    })
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
    { 
      key: 'especialidad', 
      header: 'Especialidad',
      render: (t) => (
        <div className="flex flex-wrap gap-1">
          {t.especialidad.map((e) => (
            <Badge key={e} variant="outline" className="text-xs capitalize">{e}</Badge>
          ))}
        </div>
      )
    },
    { key: 'telefono', header: 'TelÃ©fono' },
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
            title={t.estado === 'activo' ? 'Desactivar' : 'Activar'}
          >
            {t.estado === 'activo' 
              ? <UserX className="h-4 w-4" /> 
              : <UserCheck className="h-4 w-4" />
            }
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleEdit(t)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Trabajadores
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona el equipo de trabajo y sus especialidades
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
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
                  <Label>TelÃ©fono</Label>
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
                    onValueChange={(value: Trabajador['rol']) => setFormData({ ...formData, rol: value })}
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
              
              {/* Especialidades */}
              <div className="space-y-3">
                <Label>Especialidades (acciones que puede realizar)</Label>
                <div className="grid grid-cols-3 gap-4">
                  {acciones.map((accion) => (
                    <div key={accion} className="flex items-center space-x-2">
                      <Checkbox
                        id={accion}
                        checked={formData.especialidad?.includes(accion as AccionLosa)}
                        onCheckedChange={() => toggleEspecialidad(accion as AccionLosa)}
                      />
                      <label htmlFor={accion} className="text-sm font-medium capitalize cursor-pointer">
                        {accion} (${config.tarifasGlobales[accion as AccionLosa]})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Trabajadores Activos"
          value={activos.length}
          description={`de ${trabajadores.length} total`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Losas Producidas"
          value={totalLosasProducidas}
          description="total del equipo"
          icon={<Factory className="h-5 w-5" />}
        />
        <StatCard
          title="Pagos Realizados"
          value={`$${totalPagos.toLocaleString()}`}
          description="total histÃ³rico"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Bonos Otorgados"
          value={`$${totalBonos.toLocaleString()}`}
          description="por desempeÃ±o"
        />
      </div>

      {/* Quick Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-green-800">
          <UserCheck className="h-4 w-4" />
          <span>{activos.length} Activos</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-800">
          <UserX className="h-4 w-4" />
          <span>{trabajadores.filter(t => t.estado === 'inactivo').length} Inactivos</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar trabajadores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
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
                  <div>
                    <p className="text-muted-foreground">TelÃ©fono</p>
                    <p className="font-medium">{selectedWorker.telefono}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha de Ingreso</p>
                    <p className="font-medium">{selectedWorker.fechaIngreso}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Especialidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.especialidad.map((esp) => (
                      <Badge key={esp} className="capitalize">
                        {esp} - ${config.tarifasGlobales[esp]}/losa
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">EstadÃ­sticas de ProducciÃ³n</h4>
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
  )
}

