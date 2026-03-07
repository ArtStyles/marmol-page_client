import type { MermaRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateMermaDto, UpdateMermaDto, MermaResponseDto } from '../../dtos/index.js'

export class GetMermasUseCase {
  constructor(private readonly repository: MermaRepositoryPort) {}

  async execute(): Promise<MermaResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetMermaByIdUseCase {
  constructor(private readonly repository: MermaRepositoryPort) {}

  async execute(id: string): Promise<MermaResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateMermaUseCase {
  constructor(private readonly repository: MermaRepositoryPort) {}

  async execute(dto: CreateMermaDto): Promise<MermaResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateMermaUseCase {
  constructor(private readonly repository: MermaRepositoryPort) {}

  async execute(id: string, dto: UpdateMermaDto): Promise<MermaResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteMermaUseCase {
  constructor(private readonly repository: MermaRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
