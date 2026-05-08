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
import {
  dimensionToAreaM2,
  normalizeDimension,
  resolveTipoProductoByDimension,
} from '../../../domain/entities/index.js'
import { validateInventarioSalida } from '../inventario-movimientos/inventario-movimiento.helpers.js'

interface MermaActor {
  userId: string
  userName: string
}

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
    const dimension = normalizeDimension(dto.dimension)
    assertTipoDimensionCompatible(dto.tipo, dimension)
    const normalizedDto: CreateMermaDto = {
      ...dto,
      dimension,
      metrosCuadrados: round2(dto.cantidadLosas * dimensionToAreaM2(dimension)),
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

    await validateInventarioSalida(
      [detalleMovimiento],
      this.productoRepository,
      this.movimientoRepository,
    )

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

function assertTipoDimensionCompatible(tipo: 'Piso' | 'Plancha', dimension: string): void {
  const tipoCalculado = resolveTipoProductoByDimension(dimension)
  if (tipoCalculado !== tipo) {
    throw new DomainError(
      `La dimension ${dimension} no corresponde al tipo ${tipo}.`,
      409,
      'MERMA_DIMENSION_TIPO_INVALIDO',
      {
        tipo,
        dimension,
        tipoCalculado,
      },
    )
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
