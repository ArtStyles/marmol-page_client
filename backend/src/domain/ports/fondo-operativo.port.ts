import type { FondoOperativo } from '../entities/index.js'

export interface FondoOperativoRepositoryPort {
  findByPeriodo(periodo: string): Promise<FondoOperativo | null>
  upsert(data: Omit<FondoOperativo, 'id'>): Promise<FondoOperativo>
}
