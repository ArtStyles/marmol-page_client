import type { HistorialPagoRepositoryPort } from '../../../domain/ports/index.js'
import type {
  CreateHistorialPagoDto,
  UpdateHistorialPagoDto,
  HistorialPagoResponseDto,
} from '../../dtos/index.js'

export class GetHistorialPagosUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(): Promise<HistorialPagoResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetHistorialPagoByIdUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(id: string): Promise<HistorialPagoResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateHistorialPagoUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(dto: CreateHistorialPagoDto): Promise<HistorialPagoResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateHistorialPagoUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(id: string, dto: UpdateHistorialPagoDto): Promise<HistorialPagoResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteHistorialPagoUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
