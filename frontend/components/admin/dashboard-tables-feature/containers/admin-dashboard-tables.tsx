'use client'

import { MermasTable } from '../components/mermas-table'
import { ProduccionTable } from '../components/produccion-table'
import { selectRecentMermas, selectRecentProduccion } from '../lib/data-selectors'
import type { AdminDashboardTablesProps } from '../model/types'

export const AdminDashboardTables = ({ produccionDiaria, mermas }: AdminDashboardTablesProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <ProduccionTable data={selectRecentProduccion(produccionDiaria)} />
    <MermasTable data={selectRecentMermas(mermas)} />
  </div>
)
