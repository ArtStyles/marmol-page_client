import type { TrabajadorRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateTrabajadorDto, UpdateTrabajadorDto, TrabajadorResponseDto } from '../../dtos/index.js'

export class GetTrabajadoresUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(): Promise<TrabajadorResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetTrabajadorByIdUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(id: string): Promise<TrabajadorResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateTrabajadorUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(dto: CreateTrabajadorDto): Promise<TrabajadorResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateTrabajadorUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(id: string, dto: UpdateTrabajadorDto): Promise<TrabajadorResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteTrabajadorUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
