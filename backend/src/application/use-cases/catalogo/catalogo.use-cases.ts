import type { CatalogoRepositoryPort } from '../../../domain/ports/index.js'
import type {
  CatalogoItemResponseDto,
  CreateCatalogoItemDto,
  UpdateCatalogoItemDto,
} from '../../dtos/index.js'

const PLANCHA_DIMENSIONS = ['160x65', '160x60'] as const
const DEFAULT_PLANCHA_DIMENSION = PLANCHA_DIMENSIONS[0]

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
    const normalizedDimension = normalizePlanchaDimension(dto.dimension)
    return this.repository.create(
      dto.tipo === 'Plancha'
        ? {
            ...dto,
            dimension: normalizedDimension,
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
    const currentDimension =
      current.tipo === 'Plancha' ? normalizePlanchaDimension(current.dimension) : current.dimension
    const dtoDimension = dto.dimension
      ? normalizePlanchaDimension(dto.dimension)
      : currentDimension
    const payload =
      tipoFinal === 'Plancha'
        ? {
            ...dto,
            dimension: dtoDimension,
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

function normalizePlanchaDimension(dimension: CreateCatalogoItemDto['dimension']): CreateCatalogoItemDto['dimension'] {
  return PLANCHA_DIMENSIONS.includes(dimension as (typeof PLANCHA_DIMENSIONS)[number])
    ? dimension
    : DEFAULT_PLANCHA_DIMENSION
}
