import type { FondoOperativo } from '../../../domain/entities/index.js'
import type { FondoOperativoRepositoryPort } from '../../../domain/ports/index.js'
import { getFondoOperativoByPeriodo, upsertFondoOperativo } from '../../../store/index.js'

export class InMemoryFondoOperativoRepository implements FondoOperativoRepositoryPort {
  async findByPeriodo(periodo: string): Promise<FondoOperativo | null> {
    return getFondoOperativoByPeriodo(periodo) ?? null
  }

  async upsert(data: Omit<FondoOperativo, 'id'>): Promise<FondoOperativo> {
    return upsertFondoOperativo(data)
  }
}
