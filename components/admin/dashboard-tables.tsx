'use client'

import { DataTable, type Column } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import type { Merma, ProduccionDiaria } from '@/lib/types'

interface AdminDashboardTablesProps {
  produccionDiaria: ProduccionDiaria[]
  mermas: Merma[]
}

const produccionColumns: Column<ProduccionDiaria>[] = [
  { key: 'fecha', header: 'Fecha' },
  { key: 'origenNombre', header: 'Origen' },
  {
    key: 'dimension',
    header: 'Dimension',
    render: (p) => <Badge variant="secondary">{p.dimension}</Badge>,
  },
  {
    key: 'totalLosas',
    header: 'Losas',
    render: (p) => `${p.totalLosas} losas`,
  },
  {
    key: 'totalM2',
    header: 'Produccion',
    render: (p) => `${p.totalM2.toFixed(2)} m2`,
  },
]

const mermasColumns: Column<Merma>[] = [
  { key: 'fecha', header: 'Fecha' },
  { key: 'origenNombre', header: 'Origen' },
  {
    key: 'metrosCuadrados',
    header: 'Merma',
    render: (m) => <span className="text-destructive font-medium">{m.metrosCuadrados.toFixed(2)} m2</span>,
  },
  { key: 'motivo', header: 'Motivo' },
]

export function AdminDashboardTables({ produccionDiaria, mermas }: AdminDashboardTablesProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DataTable title="Produccion Reciente" data={produccionDiaria.slice(0, 5)} columns={produccionColumns} />
      <DataTable title="Mermas Recientes" data={mermas.slice(0, 5)} columns={mermasColumns} />
    </div>
  )
}
