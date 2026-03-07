import type { BloqueRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateBloqueDto, UpdateBloqueDto, BloqueResponseDto } from '../../dtos/index.js'

export class GetBloquesUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(): Promise<BloqueResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetBloqueByIdUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(id: string): Promise<BloqueResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateBloqueUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(dto: CreateBloqueDto): Promise<BloqueResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateBloqueUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(id: string, dto: UpdateBloqueDto): Promise<BloqueResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteBloqueUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
