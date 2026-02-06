'use client'

import React from "react"
import { useState } from 'react'
import { DataTable, type Column } from '@/components/data-table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AdminShell, AdminPanelCard } from '@/components/admin/admin-shell'
import { logsSistema as initialLogs } from '@/lib/data'
import type { SystemLog } from '@/lib/types'
import { Search } from 'lucide-react'

export default function HistorialPage() {
  const [logs] = useState<SystemLog[]>(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLogs = logs.filter((log) =>
    log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.accion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.modulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.fecha.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalLogs = logs.length
  const totalAlertas = logs.filter((log) => log.nivel === 'alerta').length
  const totalErrores = logs.filter((log) => log.nivel === 'error').length
  const recentLogs = [...logs].slice(0, 4)

  const rightPanel = (
    <div className="space-y-4">
      <AdminPanelCard title="Resumen logs" meta={`${totalLogs} registros`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Alertas</span>
            <span className="font-semibold">{totalAlertas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Errores</span>
            <span className="font-semibold">{totalErrores}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Informativos</span>
            <span className="font-semibold">{totalLogs - totalAlertas - totalErrores}</span>
          </div>
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Ultimos eventos" meta="Reciente">
        <div className="space-y-2 text-sm text-slate-700">
          {recentLogs.length === 0 ? (
            <p className="text-xs text-slate-500">Sin eventos recientes.</p>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-900">{log.modulo}</p>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em]">
                    {log.nivel}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{log.accion}</p>
              </div>
            ))
          )}
        </div>
      </AdminPanelCard>
    </div>
  )

  const columns: Column<SystemLog>[] = [
    { key: 'fecha', header: 'Fecha' },
    { key: 'usuario', header: 'Usuario' },
    { key: 'modulo', header: 'Modulo' },
    { key: 'accion', header: 'Accion' },
    { key: 'descripcion', header: 'Detalle' },
    {
      key: 'nivel',
      header: 'Nivel',
      render: (log) => {
        const styles: Record<SystemLog['nivel'], string> = {
          info: 'bg-blue-100 text-blue-800',
          alerta: 'bg-amber-100 text-amber-800',
          error: 'bg-red-100 text-red-800',
        }
        return (
          <Badge className={styles[log.nivel]}>
            {log.nivel}
          </Badge>
        )
      },
    },
  ]

  return (
    <AdminShell rightPanel={rightPanel}>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sans">
            Historial del Sistema
          </h1>
          <p className="mt-1 text-muted-foreground font-sans">
            Registros de actividad para auditoria y seguimiento
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[var(--dash-shadow)] backdrop-blur-xl">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Buscar</p>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario, modulo o accion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        emptyMessage="No hay registros en el historial"
      />
      </div>
    </AdminShell>
  )
}
