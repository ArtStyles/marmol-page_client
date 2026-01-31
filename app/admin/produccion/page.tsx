'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  produccionDiaria as initialProduccion, 
  trabajadores, 
  bloquesYLotes,
  tiposProducto,
  dimensiones,
  acciones
} from '@/lib/data'
import type { ProduccionDiaria, AccionLosa, Dimension, TipoProducto } from '@/lib/types'
import { useConfiguracion } from '@/hooks/use-configuracion'
import { Plus, Search, Factory, DollarSign, Users } from 'lucide-react'
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

export default function ProduccionPage() {
  const { config } = useConfiguracion()
  const [produccion, setProduccion] = useState<ProduccionDiaria[]>(initialProduccion)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    trabajadorId: '',
    accion: 'picar' as AccionLosa,
    origenId: '',
    tipo: 'Piso' as TipoProducto,
    dimension: '60x40' as Dimension,
    cantidadLosas: 1,
    bono: 0
  })

  const filteredProduccion = produccion.filter(p => 
    p.trabajadorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.origenNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.accion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estadísticas
  const totalLosasHoy = produccion
    .filter(p => p.fecha === new Date().toISOString().split('T')[0])
    .reduce((sum, p) => sum + p.cantidadLosas, 0)
  
  const totalPagosHoy = produccion
    .filter(p => p.fecha === new Date().toISOString().split('T')[0])
    .reduce((sum, p) => sum + p.pagoFinal, 0)

  const trabajadoresActivos = new Set(produccion.map(p => p.trabajadorId)).size

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const trabajador = trabajadores.find(t => t.id === formData.trabajadorId)
    const origen = bloquesYLotes.find(b => b.id === formData.origenId)
    
    if (!trabajador || !origen) return

    const pagoPorLosa = config.tarifasGlobales[formData.accion]
    const pagoTotal = pagoPorLosa * formData.cantidadLosas
    const pagoFinal = pagoTotal + formData.bono

    const newProduccion: ProduccionDiaria = {
      id: `PD${String(produccion.length + 1).padStart(3, '0')}`,
      fecha: new Date().toISOString().split('T')[0],
      trabajadorId: formData.trabajadorId,
      trabajadorNombre: trabajador.nombre,
      accion: formData.accion,
      origenId: formData.origenId,
      origenNombre: origen.nombre,
      tipo: formData.tipo,
      dimension: formData.dimension,
      cantidadLosas: formData.cantidadLosas,
      pagoPorLosa,
      pagoTotal,
      bono: formData.bono,
      pagoFinal,
      pagado: false
    }

    setProduccion([newProduccion, ...produccion])
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      trabajadorId: '',
      accion: 'picar',
      origenId: '',
      tipo: 'Piso',
      dimension: '60x40',
      cantidadLosas: 1,
      bono: 0
    })
    setIsDialogOpen(false)
  }

  // Calcular pago en tiempo real
  const pagoCalculado = config.tarifasGlobales[formData.accion] * formData.cantidadLosas
  const pagoTotal = pagoCalculado + formData.bono

  const columns: Column<ProduccionDiaria>[] = [
    { key: 'fecha', header: 'Fecha' },
    { key: 'trabajadorNombre', header: 'Trabajador' },
    { 
      key: 'accion', 
      header: 'Acción',
      render: (p) => {
        const colors: Record<AccionLosa, string> = {
          picar: 'bg-blue-100 text-blue-800',
          pulir: 'bg-green-100 text-green-800',
          escuadrar: 'bg-amber-100 text-amber-800'
        }
        return (
          <Badge className={`capitalize ${colors[p.accion]}`}>
            {p.accion}
          </Badge>
        )
      }
    },
    { key: 'origenNombre', header: 'Bloque/Lote' },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: (p) => <Badge variant="outline">{p.tipo}</Badge>
    },
    { key: 'dimension', header: 'Dimensión' },
    { 
      key: 'cantidadLosas', 
      header: 'Losas',
      render: (p) => <span className="font-medium">{p.cantidadLosas}</span>
    },
    { 
      key: 'pagoPorLosa', 
      header: '$/Losa',
      render: (p) => `$${p.pagoPorLosa}`
    },
    { 
      key: 'bono', 
      header: 'Bono',
      render: (p) => p.bono > 0 ? <span className="text-green-600">+${p.bono}</span> : '-'
    },
    { 
      key: 'pagoFinal', 
      header: 'Total',
      render: (p) => <span className="font-bold text-primary">${p.pagoFinal.toLocaleString()}</span>
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                <div className="space-y-2">
                  <Label>Acción</Label>
                  <Select 
                    value={formData.accion} 
                    onValueChange={(value: AccionLosa) => setFormData({ ...formData, accion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {acciones.map((a) => (
                        <SelectItem key={a} value={a} className="capitalize">
                          {a} - ${config.tarifasGlobales[a as AccionLosa]}/losa
                        </SelectItem>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cantidad de Losas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.cantidadLosas}
                    onChange={(e) => setFormData({ ...formData, cantidadLosas: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bono Extra (opcional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.bono}
                    onChange={(e) => setFormData({ ...formData, bono: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Cálculo en tiempo real */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h4 className="font-medium">Resumen de Pago</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Tarifa por losa:</span>
                  <span className="text-right">${config.tarifasGlobales[formData.accion]}</span>
                  <span className="text-muted-foreground">Losas x Tarifa:</span>
                  <span className="text-right">{formData.cantidadLosas} x ${config.tarifasGlobales[formData.accion]} = ${pagoCalculado}</span>
                  <span className="text-muted-foreground">Bono:</span>
                  <span className="text-right text-green-600">+${formData.bono}</span>
                  <span className="font-medium">Total a pagar:</span>
                  <span className="text-right font-bold text-primary">${pagoTotal.toLocaleString()}</span>
                </div>
              </div>

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
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-medium mb-3">Tarifas por Acción (por losa)</h3>
        <div className="flex flex-wrap gap-4">
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Losas Producidas Hoy"
          value={totalLosasHoy}
          description="losas procesadas"
          icon={<Factory className="h-5 w-5" />}
        />
        <StatCard
          title="Pagos Generados Hoy"
          value={`$${totalPagosHoy.toLocaleString()}`}
          description="en pagos a trabajadores"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Trabajadores Activos"
          value={trabajadoresActivos}
          description="han trabajado recientemente"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
            placeholder="Buscar por trabajador, origen o acción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <DataTable
        data={filteredProduccion}
        columns={columns}
        emptyMessage="No hay registros de producción"
      />
    </div>
  )
}

