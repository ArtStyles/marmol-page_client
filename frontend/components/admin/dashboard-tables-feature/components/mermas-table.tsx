'use client'

import { DataTable } from '@/components/data-table'
import type { Merma } from '@/lib/types'
import { mermasColumns } from '../model/columns'

type MermasTableProps = {
  data: Merma[]
}

export const MermasTable = ({ data }: MermasTableProps) => (
  <DataTable title="Mermas Recientes" data={data} columns={mermasColumns} />
)

