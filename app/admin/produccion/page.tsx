'use client'

import React from "react"
import { useEffect, useState } from 'react'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { 
  produccionDiaria as initialProduccion, 
  trabajadores, 
  bloquesYLotes,
  tiposProducto,
  dimensiones
} from '@/lib/data'
import type { ProduccionDiaria, AccionLosa, Dimension, TipoProducto } from '@/lib/types'
import { losasAMetros } from '@/lib/types'
import { ADMIN_STORAGE_KEY, type AdminUser } from '@/lib/admin-auth'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { Plus, Search } from 'lucide-react'

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


type AccionResumen = {
  accion: AccionLosa
  totalLosas: number
  totalM2: number
  totalPago: number
  tipos: Set<TipoProducto>
  dimensiones: Set<Dimension>
}

type ProduccionLoteGroup = {
  origenId: string
  origenNombre: string
  acciones: Record<AccionLosa, AccionResumen>
}

type ProduccionWorkerGroup = {
  trabajadorId: string
  trabajadorNombre: string
  lotes: ProduccionLoteGroup[]
  resumenAcciones: Record<AccionLosa, { losas: number; m2: number; totalPago: number }>
  totalPago: number
}

export default function ProduccionPage() {
  const { config } = useConfiguracion()
  const [produccion, setProduccion] = useState<ProduccionDiaria[]>(initialProduccion)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    trabajadorId: '',
    origenId: '',
    tipo: 'Piso' as TipoProducto,
    dimension: '60x40' as Dimension,
    cantidadPicar: 0,
    cantidadPulir: 0,
    cantidadEscuadrar: 0
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

  const isAdmin = currentUser?.role === 'Administrador'

  const filteredProduccion = produccion.filter(p => 
    p.trabajadorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.origenNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.accion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estadísticas
  const today = new Date().toISOString().split('T')[0]
  const produccionHoy = produccion.filter(p => p.fecha === today)
  const totalLosasHoy = produccionHoy.reduce((sum, p) => sum + p.cantidadLosas, 0)
  const totalPagosHoy = produccionHoy.reduce((sum, p) => sum + p.pagoFinal, 0)
  const trabajadoresActivos = new Set(produccion.map(p => p.trabajadorId)).size
  const resumenAcciones = produccionHoy.reduce<Record<AccionLosa, { losas: number; m2: number }>>(
    (acc, p) => {
      acc[p.accion].losas += p.cantidadLosas
      acc[p.accion].m2 += losasAMetros(p.cantidadLosas, p.dimension)
      return acc
    },
    {
      picar: { losas: 0, m2: 0 },
      pulir: { losas: 0, m2: 0 },
      escuadrar: { losas: 0, m2: 0 },
    },
  )
  const resumenTrabajadoresHoy = produccionHoy.reduce<Record<string, { nombre: string; losas: number; m2: number }>>(
    (acc, item) => {
      if (!acc[item.trabajadorId]) {
        acc[item.trabajadorId] = { nombre: item.trabajadorNombre, losas: 0, m2: 0 }
      }
      acc[item.trabajadorId].losas += item.cantidadLosas
      acc[item.trabajadorId].m2 += losasAMetros(item.cantidadLosas, item.dimension)
      return acc
    },
    {},
  )
  const topTrabajadoresHoy = Object.values(resumenTrabajadoresHoy)
    .sort((a, b) => b.m2 - a.m2)
    .slice(0, 3)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const trabajador = trabajadores.find(t => t.id === formData.trabajadorId)
    const origen = bloquesYLotes.find(b => b.id === formData.origenId)
    
    if (!trabajador || !origen) return

    const accionesRegistradas: Array<{ accion: AccionLosa; cantidad: number }> = [
      { accion: 'picar', cantidad: formData.cantidadPicar },
      { accion: 'pulir', cantidad: formData.cantidadPulir },
      { accion: 'escuadrar', cantidad: formData.cantidadEscuadrar },
    ].filter((item) => item.cantidad > 0)

    if (accionesRegistradas.length === 0) {
      setFormError('Ingresa al menos una cantidad de losas.')
      return
    }

    setFormError('')

    const baseIndex = produccion.length + 1
    const fecha = new Date().toISOString().split('T')[0]
    const nuevasProducciones: ProduccionDiaria[] = accionesRegistradas.map((item, index) => {
      const pagoPorLosa = config.tarifasGlobales[item.accion]
      const pagoTotal = pagoPorLosa * item.cantidad

      return {
        id: `PD${String(baseIndex + index).padStart(3, '0')}`,
        fecha,
        trabajadorId: formData.trabajadorId,
        trabajadorNombre: trabajador.nombre,
        accion: item.accion,
        origenId: formData.origenId,
        origenNombre: origen.nombre,
        tipo: formData.tipo,
        dimension: formData.dimension,
        cantidadLosas: item.cantidad,
        pagoPorLosa,
        pagoTotal,
        bono: 0,
        pagoFinal: pagoTotal,
        pagado: false
      }
    })

    setProduccion([...nuevasProducciones, ...produccion])
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      trabajadorId: '',
      origenId: '',
      tipo: 'Piso',
      dimension: '60x40',
      cantidadPicar: 0,
      cantidadPulir: 0,
      cantidadEscuadrar: 0
    })
    setFormError('')
    setIsDialogOpen(false)
  }


  const accionColors: Record<AccionLosa, string> = {
    picar: 'bg-blue-100 text-blue-800',
    pulir: 'bg-green-100 text-green-800',
    escuadrar: 'bg-amber-100 text-amber-800'
  }

  const actionOrder: AccionLosa[] = ['picar', 'pulir', 'escuadrar']

  const createResumenAcciones = () => ({
    picar: { losas: 0, m2: 0, totalPago: 0 },
    pulir: { losas: 0, m2: 0, totalPago: 0 },
    escuadrar: { losas: 0, m2: 0, totalPago: 0 },
  })

  const createAccionResumen = (accion: AccionLosa): AccionResumen => ({
    accion,
    totalLosas: 0,
    totalM2: 0,
    totalPago: 0,
    tipos: new Set<TipoProducto>(),
    dimensiones: new Set<Dimension>(),
  })

  const groupedProduccion = filteredProduccion.reduce<ProduccionWorkerGroup[]>((acc, item) => {
    let worker = acc.find((entry) => entry.trabajadorId === item.trabajadorId)
    if (!worker) {
      worker = {
        trabajadorId: item.trabajadorId,
        trabajadorNombre: item.trabajadorNombre,
        lotes: [],
        resumenAcciones: createResumenAcciones(),
        totalPago: 0,
      }
      acc.push(worker)
    }

    const m2 = losasAMetros(item.cantidadLosas, item.dimension)
    worker.resumenAcciones[item.accion].losas += item.cantidadLosas
    worker.resumenAcciones[item.accion].m2 += m2
    worker.resumenAcciones[item.accion].totalPago += item.pagoFinal
    worker.totalPago += item.pagoFinal

    let lote = worker.lotes.find((entry) => entry.origenId === item.origenId)
    if (!lote) {
      lote = {
        origenId: item.origenId,
        origenNombre: item.origenNombre,
        acciones: {
          picar: createAccionResumen('picar'),
          pulir: createAccionResumen('pulir'),
          escuadrar: createAccionResumen('escuadrar'),
        },
      }
      worker.lotes.push(lote)
    }

    const accionResumen = lote.acciones[item.accion]
    accionResumen.totalLosas += item.cantidadLosas
    accionResumen.totalM2 += m2
    accionResumen.totalPago += item.pagoFinal
    accionResumen.tipos.add(item.tipo)
    accionResumen.dimensiones.add(item.dimension)

    return acc
  }, [])

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen diario" meta={today}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Losas hoy</span>
            <span className="font-semibold">{totalLosasHoy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>m2 hoy</span>
            <span className="font-semibold">
              {produccionHoy.reduce((sum, p) => sum + losasAMetros(p.cantidadLosas, p.dimension), 0).toFixed(2)} m2
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Trabajadores</span>
            <span className="font-semibold">{trabajadoresActivos}</span>
          </div>
          {isAdmin && (
            <div className="flex items-center justify-between">
              <span>Pagos hoy</span>
              <span className="font-semibold">${totalPagosHoy.toLocaleString()}</span>
            </div>
          )}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Acciones hoy" meta="Resumen por accion">
        <div className="space-y-2 text-sm text-slate-700">
          {actionOrder.map((accion) => (
            <div key={accion} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
              <span className="capitalize">{accion}</span>
              <div className="text-right">
                <p className="text-[11px] text-slate-500">{resumenAcciones[accion].losas} losas</p>
                <p className="text-xs font-semibold text-slate-900">
                  {resumenAcciones[accion].m2.toFixed(2)} m2
                </p>
              </div>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Top trabajadores" meta="Hoy">
        <div className="space-y-2 text-sm text-slate-700">
          {topTrabajadoresHoy.length === 0 ? (
            <p className="text-xs text-slate-500">Sin produccion registrada hoy.</p>
          ) : (
            topTrabajadoresHoy.map((item) => (
              <div key={item.nombre} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.nombre}</p>
                  <p className="text-[11px] text-slate-500">{item.losas} losas</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{item.m2.toFixed(2)} m2</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Producción Diaria
          </h1>
          <p className="mt-1 text-muted-foreground">
            Registra las losas picadas, pulidas y escuadradas por cada trabajador
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Producción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Producción</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Trabajador</Label>
                  <Select 
                    value={formData.trabajadorId} 
                    onValueChange={(value) => setFormData({ ...formData, trabajadorId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {trabajadores.filter(t => t.estado === 'activo').map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bloque/Lote de Origen</Label>
                <Select 
                  value={formData.origenId} 
                  onValueChange={(value) => setFormData({ ...formData, origenId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloquesYLotes.filter(b => b.estado === 'activo').map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nombre} ({b.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Producto</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value: TipoProducto) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposProducto.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dimensión</Label>
                  <Select 
                    value={formData.dimension} 
                    onValueChange={(value: Dimension) => setFormData({ ...formData, dimension: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensiones.map((d) => (
                        <SelectItem key={d} value={d}>{d} cm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Producción por acción</Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Losas Picadas</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.cantidadPicar}
                      onChange={(e) => setFormData({ ...formData, cantidadPicar: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Losas Pulidas</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.cantidadPulir}
                      onChange={(e) => setFormData({ ...formData, cantidadPulir: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Losas Escuadradas</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.cantidadEscuadrar}
                      onChange={(e) => setFormData({ ...formData, cantidadEscuadrar: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingresa 0 si no hubo producción en alguna acción.
                </p>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Registrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tarifas Info */}
      <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
        <h3 className="mb-2 font-medium">Tarifas por Acción (por losa)</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">Picar</Badge>
            <span className="font-bold">${config.tarifasGlobales.picar}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">Pulir</Badge>
            <span className="font-bold">${config.tarifasGlobales.pulir}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800">Escuadrar</Badge>
            <span className="font-bold">${config.tarifasGlobales.escuadrar}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] p-3 shadow-[var(--dash-shadow)] backdrop-blur-xl">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por trabajador, origen o acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Produccion */}
      <Card className="rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] py-0 shadow-[var(--dash-shadow)] backdrop-blur-xl">
        <CardContent className="pb-4 pt-4">
          {groupedProduccion.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No hay registros de produccion
            </div>
          ) : (
            <div className="space-y-3">
              {groupedProduccion.map((worker) => (
                <div
                  key={worker.trabajadorId}
                  className="rounded-[22px] border border-[var(--dash-border)] bg-white/80 p-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Trabajador</p>
                      <p className="text-base font-semibold text-slate-900">{worker.trabajadorNombre}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-xl border border-white/80 bg-white/70 px-2.5 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Picadas</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {worker.resumenAcciones.picar.losas}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/80 bg-white/70 px-2.5 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Pulidas</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {worker.resumenAcciones.pulir.losas}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/80 bg-white/70 px-2.5 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Escuadradas</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {worker.resumenAcciones.escuadrar.losas}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1.5 text-emerald-700">
                          <p className="text-[10px] uppercase tracking-[0.2em]">Total</p>
                          <p className="text-sm font-semibold">
                            ${worker.totalPago.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {worker.lotes.map((lote) => (
                      <div key={`${worker.trabajadorId}-${lote.origenId}`} className="space-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                            Bloque/Lote
                          </p>
                          <p className="text-sm font-semibold text-slate-900">{lote.origenNombre}</p>
                        </div>

                        <div className="rounded-2xl border border-white/70 bg-white/70">
                          <div className="divide-y divide-white/60">
                            {actionOrder.map((accion) => {
                              const resumen = lote.acciones[accion]
                              if (!resumen || resumen.totalLosas === 0) return null
                              const tipoList = Array.from(resumen.tipos)
                              const dimensionList = Array.from(resumen.dimensiones)
                              const tipoLabel = tipoList.length === 1 ? tipoList[0] : 'Mixto'
                              const dimensionLabel = dimensionList.length === 1 ? dimensionList[0] : 'Mixto'
                              const promedioPago =
                                resumen.totalLosas > 0 ? resumen.totalPago / resumen.totalLosas : 0

                              return (
                                <div key={`${lote.origenId}-${accion}`} className="px-3 py-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Badge className={`capitalize ${accionColors[accion]}`}>{accion}</Badge>
                                      <span className="text-[11px] text-slate-500">
                                        {tipoLabel} / {dimensionLabel}
                                      </span>
                                    </div>
                                    {isAdmin && (
                                      <div className="text-sm font-semibold text-emerald-700">
                                        ${resumen.totalPago.toLocaleString()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                        Losas
                                      </p>
                                      <p className="font-medium text-slate-900">{resumen.totalLosas}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                        M2
                                      </p>
                                      <p className="text-slate-900">{resumen.totalM2.toFixed(2)} m2</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                        Prom. $/Losa
                                      </p>
                                      <p className="text-slate-900">${promedioPago.toFixed(0)}</p>
                                    </div>
                                    {isAdmin && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                          Total
                                        </p>
                                        <p className="font-semibold text-emerald-700">
                                          ${resumen.totalPago.toLocaleString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminShell>
  )
}


