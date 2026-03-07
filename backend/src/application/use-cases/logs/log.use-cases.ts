import type { LogRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateLogDto, LogResponseDto } from '../../dtos/index.js'

export class GetLogsUseCase {
  constructor(private readonly repository: LogRepositoryPort) {}

  async execute(): Promise<LogResponseDto[]> {
    return this.repository.findAll()
  }
}

export class CreateLogUseCase {
  constructor(private readonly repository: LogRepositoryPort) {}

  async execute(dto: CreateLogDto): Promise<LogResponseDto> {
    return this.repository.create(dto)
  }
}
