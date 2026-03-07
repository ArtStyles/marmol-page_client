import type { EquipoRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateEquipoDto, UpdateEquipoDto, EquipoResponseDto } from '../../dtos/index.js'

export class GetEquiposUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(): Promise<EquipoResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetEquipoByIdUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(id: string): Promise<EquipoResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateEquipoUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(dto: CreateEquipoDto): Promise<EquipoResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateEquipoUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(id: string, dto: UpdateEquipoDto): Promise<EquipoResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteEquipoUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
