'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { Button } from '@/components/admin/admin-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  historialPagos as initialHistorial, 
  trabajadores as initialTrabajadores,
  produccionTrabajadores as initialProduccion
} from '@/lib/data'
import type { HistorialPago, ProduccionTrabajador, RolConSalarioFijo, Trabajador } from '@/lib/types'
import { Search, Wallet, DollarSign, CheckCircle, Eye, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { useConfiguracion } from '@/hooks/use-configuracion'

type AcumuladoPagoTrabajador = Trabajador & {
  produccionesPendientes: ProduccionTrabajador[]
  montoAcciones: number
  montoBonos: number
  totalPendiente: number
  modoPago: 'produccion' | 'salario_fijo'
}

export default function PagosPage() {
  const { config } = useConfiguracion()
  const [historial, setHistorial] = useState<HistorialPago[]>(initialHistorial)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(initialTrabajadores)
  const [produccion, setProduccion] = useState<ProduccionTrabajador[]>(initialProduccion)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPagoDialogOpen, setIsPagoDialogOpen] = useState(false)
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null)
  const [selectedHistorial, setSelectedHistorial] = useState<HistorialPago | null>(null)
  const [bonoExtraTouched, setBonoExtraTouched] = useState(false)
  const [pagoForm, setPagoForm] = useState({
    bonoExtra: 0,
    motivoBonoExtra: '',
    observaciones: ''
  })

  const filteredHistorial = historial.filter(h => 
    h.trabajadorNombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular acumulados pendientes por trabajador
  const acumuladosPorTrabajador: AcumuladoPagoTrabajador[] = trabajadores
    .filter((t) => t.estado === 'activo')
    .map((t) => {
      if (t.rol === 'Obrero') {
        const produccionesPendientes = produccion.filter((p) => p.trabajadorId === t.id && !p.pagado)
        const montoAcciones = produccionesPendientes.reduce((sum, p) => sum + p.pagoTotal, 0)
        const montoBonos = produccionesPendientes.reduce((sum, p) => sum + p.bono, 0)

        return {
          ...t,
          produccionesPendientes,
          montoAcciones,
          montoBonos,
          totalPendiente: montoAcciones + montoBonos,
          modoPago: 'produccion',
        }
      }

      const salarioFijo = config.salariosFijosPorRol[t.rol as RolConSalarioFijo] ?? 0
      return {
        ...t,
        produccionesPendientes: [],
        montoAcciones: salarioFijo,
        montoBonos: 0,
        totalPendiente: salarioFijo,
        modoPago: 'salario_fijo',
      }
    })

    // EstadÃ­sticas
  const totalPendiente = acumuladosPorTrabajador.reduce((sum, t) => sum + t.totalPendiente, 0)
  const totalPagadoHistorico = historial.reduce((sum, h) => sum + h.totalPagado, 0)
  const totalBonosHistorico = historial.reduce((sum, h) => sum + h.montoBonos + h.bonoExtra, 0)
  const trabajadoresConPendiente = acumuladosPorTrabajador.filter(t => t.totalPendiente > 0).length
  const topPendientes = [...acumuladosPorTrabajador]
    .filter((t) => t.totalPendiente > 0)
    .sort((a, b) => b.totalPendiente - a.totalPendiente)
    .slice(0, 3)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen pagos" meta={`${historial.length} pagos`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total pendiente</span>
            <span className="font-semibold">${totalPendiente.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pagado historico</span>
            <span className="font-semibold">${totalPagadoHistorico.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Bonos historicos</span>
            <span className="font-semibold">${totalBonosHistorico.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Con pendiente</span>
            <span className="font-semibold">{trabajadoresConPendiente}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Pendientes altos" meta="Top 3">
        <div className="space-y-2 text-sm text-slate-700">
          {topPendientes.length === 0 ? (
            <p className="text-xs text-slate-500">Sin pendientes.</p>
          ) : (
            topPendientes.map((trabajador) => (
              <div key={trabajador.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{trabajador.nombre}</p>
                  <p className="text-[11px] text-slate-500">
                    {trabajador.modoPago === 'produccion'
                      ? `${trabajador.produccionesPendientes.length} registros de producciÃ³n`
                      : 'Salario fijo por rol'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">${trabajador.totalPendiente.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const openPagoDialog = (trabajador: AcumuladoPagoTrabajador) => {
    setSelectedTrabajador(trabajador)
    setPagoForm({ bonoExtra: 0, motivoBonoExtra: '', observaciones: '' })
    setBonoExtraTouched(false)
    setIsPagoDialogOpen(true)
  }

  const realizarPago = () => {
    if (!selectedTrabajador) return

    const trabajadorData = acumuladosPorTrabajador.find(t => t.id === selectedTrabajador.id)
    if (!trabajadorData || trabajadorData.totalPendiente === 0) return
    const esObrero = trabajadorData.rol === 'Obrero'

    // Crear registro de pago
    const nuevoPago: HistorialPago = {
      id: `HP${String(historial.length + 1).padStart(3, '0')}`,
      trabajadorId: trabajadorData.id,
      trabajadorNombre: trabajadorData.nombre,
      fecha: new Date().toISOString().split('T')[0],
      produccionIds: esObrero ? trabajadorData.produccionesPendientes.map((p) => p.id) : [],
      montoAcciones: trabajadorData.montoAcciones,
      montoBonos: esObrero ? trabajadorData.montoBonos : 0,
      bonoExtra: pagoForm.bonoExtra,
      motivoBonoExtra: pagoForm.motivoBonoExtra,
      totalPagado: trabajadorData.totalPendiente + pagoForm.bonoExtra,
      observaciones: pagoForm.observaciones
    }

    // Actualizar historial
    setHistorial([nuevoPago, ...historial])

    // Marcar producciones como pagadas (solo obreros)
    if (esObrero) {
      setProduccion(produccion.map((p) => {
        if (trabajadorData.produccionesPendientes.some((pp) => pp.id === p.id)) {
          return { ...p, pagado: true }
        }
        return p
      }))
    }

    // Actualizar trabajador
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorData.id) {
        return {
          ...t,
          pagosTotales: t.pagosTotales + nuevoPago.totalPagado,
          bonosTotales: t.bonosTotales + nuevoPago.montoBonos + nuevoPago.bonoExtra,
          acumuladoPendiente: 0
        }
      }
      return t
    }))

    setIsPagoDialogOpen(false)
    setSelectedTrabajador(null)
  }

  const historialColumns: Column<HistorialPago>[] = [
    { key: 'id', header: 'ID' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'trabajadorNombre', header: 'Trabajador' },
    { 
      key: 'produccionIds', 
      header: 'Producciones',
      render: (h) => (
        h.produccionIds.length > 0
          ? <Badge variant="outline">{h.produccionIds.length} registros</Badge>
          : <Badge variant="outline">Salario fijo</Badge>
      )
    },
    { 
      key: 'montoAcciones', 
      header: 'Base',
      render: (h) => `$${h.montoAcciones.toLocaleString()}`
    },
    { 
      key: 'montoBonos', 
      header: 'Bonos Prod.',
      render: (h) => (
        <span className={h.montoBonos > 0 ? 'text-green-600' : 'text-muted-foreground'}>
          {h.montoBonos > 0 ? `+$${h.montoBonos.toLocaleString()}` : '-'}
        </span>
      )
    },
    { 
      key: 'bonoExtra', 
      header: 'Bono Extra',
      render: (h) => (
        <span className={h.bonoExtra > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
          {h.bonoExtra > 0 ? `+$${h.bonoExtra.toLocaleString()}` : '-'}
        </span>
      )
    },
    { 
      key: 'totalPagado', 
      header: 'Total Pagado',
      render: (h) => <span className="font-bold text-primary">${h.totalPagado.toLocaleString()}</span>
    },
    {
      key: 'actions',
      header: '',
      render: (h) => (
        <Button size="icon" variant="ghost" onClick={() => setSelectedHistorial(h)}>
          <Eye className="h-4 w-4" />
        </Button>
      )
    }
  ]

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground font-sans">
          Pagos a Trabajadores
        </h1>
        <p className="mt-1 text-muted-foreground font-sans">
          Obreros cobran por producción. Los demás roles cobran salario fijo definido en configuración.
        </p>
      </div>

      {/* Acumulados Pendientes */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Acumulados Pendientes por Trabajador
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {acumuladosPorTrabajador.map((t) => (
            <Card
              key={t.id}
              className={`rounded-[24px] border border-[var(--dash-border)] bg-[var(--dash-card)] shadow-[var(--dash-shadow)] backdrop-blur-xl ${
                t.totalPendiente > 0 ? 'border-emerald-200/70' : 'opacity-70'
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {t.nombre}
                  {t.totalPendiente > 0 && (
                    <Badge variant={t.modoPago === 'produccion' ? 'secondary' : 'outline'}>
                      {t.modoPago === 'produccion' ? `${t.produccionesPendientes.length} prod.` : 'Salario fijo'}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t.rol}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {t.modoPago === 'produccion' ? 'Por producción' : 'Salario fijo'}
                    </p>
                    <p className="font-medium">${t.montoAcciones.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bonos producciÃ³n</p>
                    <p className={t.montoBonos > 0 ? 'font-medium text-green-600' : 'font-medium text-muted-foreground'}>
                      {t.montoBonos > 0 ? `+$${t.montoBonos.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Pendiente:</span>
                    <span className="text-xl font-bold text-primary">${t.totalPendiente.toLocaleString()}</span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  disabled={t.totalPendiente === 0}
                  onClick={() => openPagoDialog(t)}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  {t.totalPendiente > 0 ? 'Realizar Pago' : 'Sin Pendientes'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Historial de Pagos */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Historial de Pagos Realizados
        </h2>
        
        <div className="mb-4 rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por trabajador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <DataTable
          data={filteredHistorial}
          columns={historialColumns}
          emptyMessage="No hay pagos registrados"
        />
      </div>

      {/* Dialog Realizar Pago */}
      <Dialog open={isPagoDialogOpen} onOpenChange={setIsPagoDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          {selectedTrabajador && (
            <>
              <DialogHeader>
                <DialogTitle>Realizar Pago a {selectedTrabajador.nombre}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Resumen del pago */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-medium">Resumen de Acumulado</h4>
                  {(() => {
                    const data = acumuladosPorTrabajador.find(t => t.id === selectedTrabajador.id)
                    if (!data) return null
                    return (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Esquema:</span>
                        <span className="text-right">
                          {data.modoPago === 'produccion' ? 'Producción' : 'Salario fijo'}
                        </span>
                        {data.modoPago === 'produccion' ? (
                          <>
                            <span className="text-muted-foreground">Producciones:</span>
                            <span className="text-right">{data.produccionesPendientes.length} registros</span>
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground">Rol:</span>
                            <span className="text-right">{data.rol}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">
                          {data.modoPago === 'produccion' ? 'Por producción:' : 'Salario base:'}
                        </span>
                        <span className="text-right">${data.montoAcciones.toLocaleString()}</span>
                        <span className="text-muted-foreground">Bonos producción:</span>
                        <span className={data.montoBonos > 0 ? 'text-right text-green-600' : 'text-right text-muted-foreground'}>
                          {data.montoBonos > 0 ? `+$${data.montoBonos.toLocaleString()}` : '-'}
                        </span>
                        <span className="text-muted-foreground font-medium">Subtotal:</span>
                        <span className="text-right font-medium">${data.totalPendiente.toLocaleString()}</span>
                      </div>
                    )
                  })()}
                </div>

                {/* Bono extra opcional */}
                <div className="space-y-2">
                  <Label>Bono Extra (opcional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bonoExtraTouched || pagoForm.bonoExtra > 0 ? pagoForm.bonoExtra : ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setBonoExtraTouched(value !== '')
                      setPagoForm({ ...pagoForm, bonoExtra: value === '' ? 0 : Number(value) })
                    }}
                    placeholder="0"
                  />
                </div>

                {pagoForm.bonoExtra > 0 && (
                  <div className="space-y-2">
                    <Label>Motivo del Bono Extra</Label>
                    <Input
                      value={pagoForm.motivoBonoExtra}
                      onChange={(e) => setPagoForm({ ...pagoForm, motivoBonoExtra: e.target.value })}
                      placeholder="Ej: Excelente desempeÃ±o, horas extra..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Observaciones (opcional)</Label>
                  <Textarea
                    value={pagoForm.observaciones}
                    onChange={(e) => setPagoForm({ ...pagoForm, observaciones: e.target.value })}
                    placeholder="Notas adicionales sobre el pago..."
                    rows={2}
                  />
                </div>

                {/* Total a pagar */}
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total a Pagar:</span>
                    <span className="text-2xl font-bold text-primary">
                      ${((acumuladosPorTrabajador.find(t => t.id === selectedTrabajador.id)?.totalPendiente || 0) + pagoForm.bonoExtra).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsPagoDialogOpen(false)} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button onClick={realizarPago} className="flex-1">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar Pago
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle Historial */}
      <Dialog open={!!selectedHistorial} onOpenChange={() => setSelectedHistorial(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedHistorial && (
            <>
              <DialogHeader>
                <DialogTitle>Detalle de Pago {selectedHistorial.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Trabajador</p>
                    <p className="font-medium">{selectedHistorial.trabajadorNombre}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha</p>
                    <p className="font-medium">{selectedHistorial.fecha}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Producciones Incluidas</p>
                    <p className="font-medium">
                      {selectedHistorial.produccionIds.length > 0
                        ? `${selectedHistorial.produccionIds.length} registros`
                        : 'No aplica (salario fijo)'}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto base:</span>
                    <span>${selectedHistorial.montoAcciones.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonos de producción:</span>
                    <span className={selectedHistorial.montoBonos > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                      {selectedHistorial.montoBonos > 0 ? `+$${selectedHistorial.montoBonos.toLocaleString()}` : '-'}
                    </span>
                  </div>
                  {selectedHistorial.bonoExtra > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Bono extra: <span className="text-xs">({selectedHistorial.motivoBonoExtra || 'Sin motivo'})</span>
                      </span>
                      <span className="text-amber-600">+${selectedHistorial.bonoExtra.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Pagado:</span>
                    <span className="font-bold text-xl text-primary">${selectedHistorial.totalPagado.toLocaleString()}</span>
                  </div>
                </div>

                {selectedHistorial.observaciones && (
                  <div className="border-t pt-4">
                    <p className="text-muted-foreground text-sm">Observaciones:</p>
                    <p className="text-sm">{selectedHistorial.observaciones}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AdminShell>
  )
}







