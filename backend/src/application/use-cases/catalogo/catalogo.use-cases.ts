import type { CatalogoRepositoryPort } from '../../../domain/ports/index.js'
import type {
  CatalogoItemResponseDto,
  CreateCatalogoItemDto,
  UpdateCatalogoItemDto,
} from '../../dtos/index.js'

const PLANCHA_DIMENSION = '80x40' as const

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
    return this.repository.create(
      dto.tipo === 'Plancha'
        ? {
            ...dto,
            dimension: PLANCHA_DIMENSION,
          }
        : dto,
    )
  }
}

export class UpdateCatalogoItemUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(id: string, dto: UpdateCatalogoItemDto): Promise<CatalogoItemResponseDto | null> {
    const current = await this.repository.findById(id)
    if (!current) return null

    const tipoFinal = dto.tipo ?? current.tipo
    const payload =
      tipoFinal === 'Plancha'
        ? {
            ...dto,
            dimension: PLANCHA_DIMENSION,
          }
        : dto

    return this.repository.update(id, payload)
  }
}

export class DeleteCatalogoItemUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
