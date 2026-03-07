import type { SystemLog } from '../entities/index.js'

export interface LogRepositoryPort {
  findAll(): Promise<SystemLog[]>
  create(data: Omit<SystemLog, 'id'>): Promise<SystemLog>
}
