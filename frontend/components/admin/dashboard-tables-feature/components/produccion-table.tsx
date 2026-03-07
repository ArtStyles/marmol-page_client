'use client'

import { DataTable } from '@/components/data-table'
import type { ProduccionDiaria } from '@/lib/types'
import { produccionColumns } from '../model/columns'

type ProduccionTableProps = {
  data: ProduccionDiaria[]
}

export const ProduccionTable = ({ data }: ProduccionTableProps) => (
  <DataTable title="Produccion Reciente" data={data} columns={produccionColumns} />
)
