import type { CatalogoRepositoryPort } from '../../../domain/ports/index.js'
import type {
  CatalogoItemResponseDto,
  CreateCatalogoItemDto,
  UpdateCatalogoItemDto,
} from '../../dtos/index.js'

export class GetCatalogoItemsUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(): Promise<CatalogoItemResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetCatalogoItemByIdUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(id: string): Promise<CatalogoItemResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateCatalogoItemUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(dto: CreateCatalogoItemDto): Promise<CatalogoItemResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateCatalogoItemUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(id: string, dto: UpdateCatalogoItemDto): Promise<CatalogoItemResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteCatalogoItemUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
