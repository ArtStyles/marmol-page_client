import type { GastoRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateGastoDto, GastoResponseDto, UpdateGastoDto } from '../../dtos/index.js'

export class GetGastosUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(): Promise<GastoResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetGastoByIdUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(id: string): Promise<GastoResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateGastoUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(dto: CreateGastoDto): Promise<GastoResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateGastoUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(id: string, dto: UpdateGastoDto): Promise<GastoResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteGastoUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
