import type { Merma, ProduccionDiaria } from '@/lib/types'

const MAX_RECENT_ITEMS = 5

export const selectRecentProduccion = (items: ProduccionDiaria[]): ProduccionDiaria[] =>
  items.slice(0, MAX_RECENT_ITEMS)

export const selectRecentMermas = (items: Merma[]): Merma[] => items.slice(0, MAX_RECENT_ITEMS)

