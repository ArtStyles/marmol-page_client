import type { WorkshopRepositoryPort } from '../../../domain/ports/index.js'
import type {
  CreateWorkshopDto,
  UpdateWorkshopDto,
  WorkshopResponseDto,
} from '../../dtos/index.js'

export class GetWorkshopsUseCase {
  constructor(private readonly repository: WorkshopRepositoryPort) {}

  async execute(): Promise<WorkshopResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetWorkshopByIdUseCase {
  constructor(private readonly repository: WorkshopRepositoryPort) {}

  async execute(id: string): Promise<WorkshopResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateWorkshopUseCase {
  constructor(private readonly repository: WorkshopRepositoryPort) {}

  async execute(dto: CreateWorkshopDto): Promise<WorkshopResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateWorkshopUseCase {
  constructor(private readonly repository: WorkshopRepositoryPort) {}

  async execute(id: string, dto: UpdateWorkshopDto): Promise<WorkshopResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteWorkshopUseCase {
  constructor(private readonly repository: WorkshopRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
