import type { SystemLog } from '../../domain/entities/index.js'

export type CreateLogDto = Omit<SystemLog, 'id'>
export type LogResponseDto = SystemLog
