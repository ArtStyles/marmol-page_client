import type { LogRepositoryPort } from '../../../domain/ports/index.js'
import type { SystemLog } from '../../../domain/entities/index.js'
import { getLogs, createLog } from '../../../store/index.js'

export class InMemoryLogRepository implements LogRepositoryPort {
  async findAll(): Promise<SystemLog[]> {
    return getLogs()
  }

  async create(data: Omit<SystemLog, 'id'>): Promise<SystemLog> {
    return createLog(data)
  }
}
