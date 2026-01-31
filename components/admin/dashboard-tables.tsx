'use client'

import { DataTable, type Column } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import type { ProduccionDiaria, Merma } from '@/lib/types'

interface AdminDashboardTablesProps {
  produccionDiaria: ProduccionDiaria[]
  mermas: Merma[]
}

const produccionColumns: Column<ProduccionDiaria>[] = [
  { key: 'fecha', header: 'Fecha' },
  { key: 'trabajadorNombre', header: 'Trabajador' },
  { 
    key: 'accion', 
    header: 'Acción',
    render: (p) => (
      <Badge variant="secondary" className="capitalize">{p.accion}</Badge>
    )
  },
  { 
    key: 'cantidadLosas', 
    header: 'Losas',
    render: (p) => `${p.cantidadLosas} losas`
  },
  { 
    key: 'pagoFinal', 
    header: 'Pago',
    render: (p) => `$${p.pagoFinal.toLocaleString()}`
  },
]

const mermasColumns: Column<Merma>[] = [
  { key: 'fecha', header: 'Fecha' },
  { key: 'origenNombre', header: 'Origen' },
  { 
    key: 'cantidadLosas', 
    header: 'Losas Perdidas',
    render: (m) => <span className="text-destructive font-medium">{m.cantidadLosas} losas</span>
  },
  { key: 'motivo', header: 'Motivo' },
]

export function AdminDashboardTables({ produccionDiaria, mermas }: AdminDashboardTablesProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DataTable
        title="Producción Reciente"
        data={produccionDiaria.slice(0, 5)}
        columns={produccionColumns}
      />
      <DataTable
        title="Mermas Recientes"
        data={mermas.slice(0, 5)}
        columns={mermasColumns}
      />
    </div>
  )
}
