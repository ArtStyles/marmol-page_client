import { DomainError } from '../../errors/domain.error.js'
import type {
  CreateMermaDto,
  MermaResponseDto,
  UpdateMermaDto,
} from '../../dtos/index.js'
import type {
  InventarioMovimientoRepositoryPort,
  MermaRepositoryPort,
  ProductoRepositoryPort,
} from '../../../domain/ports/index.js'
import { validateInventarioSalida } from '../inventario-movimientos/inventario-movimiento.helpers.js'

interface MermaActor {
  userId: string
  userName: string
}

const PLANCHA_DIMENSIONS = ['160x65', '160x60'] as const
const DEFAULT_PLANCHA_DIMENSION = PLANCHA_DIMENSIONS[0]

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
  constructor(
    private readonly repository: MermaRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly movimientoRepository: InventarioMovimientoRepositoryPort,
  ) {}

  async execute(dto: CreateMermaDto, actor: MermaActor): Promise<MermaResponseDto> {
    const dimension = dto.tipo === 'Plancha' ? normalizePlanchaDimension(dto.dimension) : dto.dimension
    const normalizedDto: CreateMermaDto = {
      ...dto,
      dimension,
      metrosCuadrados: round2(dto.cantidadLosas * dimensionToArea(dimension)),
    }

    const detalleMovimiento = {
      id: `imd-m-${normalizedDto.origenId}-${normalizedDto.fecha}`,
      productoNombre: `${normalizedDto.tipo} ${normalizedDto.origenNombre} ${normalizedDto.dimension}`,
      tipo: normalizedDto.tipo,
      dimension: normalizedDto.dimension,
      origenId: normalizedDto.origenId,
      origenNombre: normalizedDto.origenNombre,
      cantidadLosas: normalizedDto.cantidadLosas,
      metrosCuadrados: normalizedDto.metrosCuadrados,
    }

    await validateInventarioSalida([detalleMovimiento], this.productoRepository)

    const mermaCreada = await this.repository.create({
      ...normalizedDto,
      estadoInventario: 'pendiente',
      movimientoInventarioId: undefined,
    })

    try {
      const movimiento = await this.movimientoRepository.create({
        fechaSolicitud: new Date().toISOString(),
        tipo: 'salida',
        origen: 'merma',
        estado: 'pendiente',
        referenciaId: mermaCreada.id,
        motivo: normalizedDto.motivo,
        observaciones: normalizedDto.observaciones,
        solicitadoPorId: actor.userId,
        solicitadoPorNombre: actor.userName,
        detalles: [detalleMovimiento],
      })

      const mermaActualizada = await this.repository.update(mermaCreada.id, {
        movimientoInventarioId: movimiento.id,
      })

      return mermaActualizada ?? { ...mermaCreada, movimientoInventarioId: movimiento.id }
    } catch (error) {
      await this.repository.delete(mermaCreada.id)
      throw error
    }
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
    const merma = await this.repository.findById(id)
    if (!merma) {
      return false
    }

    if (merma.estadoInventario === 'aprobado') {
      throw new DomainError(
        'No se puede eliminar una merma ya aprobada en inventario.',
        409,
        'MERMA_DELETE_LOCKED',
      )
    }

    return this.repository.delete(id)
  }
}

function dimensionToArea(dimension: CreateMermaDto['dimension']): number {
  if (dimension === '40x40') return 1 / 6
  if (dimension === '60x40') return 1 / 4
  if (dimension === '80x40') return 1 / 3
  if (dimension === '160x60') return 0.96
  if (dimension === '160x65') return 1.04
  return 1 / 3
}

function normalizePlanchaDimension(dimension: CreateMermaDto['dimension']): CreateMermaDto['dimension'] {
  return PLANCHA_DIMENSIONS.includes(dimension as (typeof PLANCHA_DIMENSIONS)[number])
    ? dimension
    : DEFAULT_PLANCHA_DIMENSION
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
