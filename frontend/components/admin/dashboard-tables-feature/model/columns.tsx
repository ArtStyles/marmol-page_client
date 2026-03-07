'use client'

import { Badge } from '@/components/ui/badge'
import type { Column } from '@/components/data-table'
import type { Merma, ProduccionDiaria } from '@/lib/types'

export const produccionColumns: Column<ProduccionDiaria>[] = [
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

export const mermasColumns: Column<Merma>[] = [
  { key: 'fecha', header: 'Fecha' },
  { key: 'origenNombre', header: 'Origen' },
  {
    key: 'metrosCuadrados',
    header: 'Merma',
    render: (m) => <span className="font-medium text-destructive">{m.metrosCuadrados.toFixed(2)} m2</span>,
  },
  { key: 'motivo', header: 'Motivo' },
]
