import { DomainError } from '../../errors/domain.error.js'
import type { CatalogoRepositoryPort } from '../../../domain/ports/index.js'
import {
  normalizeDimension,
  resolveTipoProductoByDimension,
} from '../../../domain/entities/index.js'
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
    const dimension = normalizeDimension(dto.dimension)
    assertTipoDimensionCompatible(dto.tipo, dimension)
    return this.repository.create({
      ...dto,
      dimension,
    })
  }
}

export class UpdateCatalogoItemUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(id: string, dto: UpdateCatalogoItemDto): Promise<CatalogoItemResponseDto | null> {
    const current = await this.repository.findById(id)
    if (!current) return null

    const tipoFinal = dto.tipo ?? current.tipo
    const dimensionFinal = dto.dimension ? normalizeDimension(dto.dimension) : current.dimension
    assertTipoDimensionCompatible(tipoFinal, dimensionFinal)
    const payload = {
      ...dto,
      dimension: dimensionFinal,
    }

    return this.repository.update(id, payload)
  }
}

export class DeleteCatalogoItemUseCase {
  constructor(private readonly repository: CatalogoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
function assertTipoDimensionCompatible(tipo: 'Piso' | 'Plancha', dimension: string): void {
  const tipoCalculado = resolveTipoProductoByDimension(dimension)
  if (tipoCalculado !== tipo) {
    throw new DomainError(
      `La dimension ${dimension} no corresponde al tipo ${tipo}.`,
      409,
      'CATALOGO_DIMENSION_TIPO_INVALIDO',
      {
        tipo,
        dimension,
        tipoCalculado,
      },
    )
  }
}
