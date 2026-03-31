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
    const detalleMovimiento = {
      id: `imd-m-${dto.origenId}-${dto.fecha}`,
      productoNombre: `${dto.tipo} ${dto.origenNombre} ${dto.dimension}`,
      tipo: dto.tipo,
      dimension: dto.dimension,
      origenId: dto.origenId,
      origenNombre: dto.origenNombre,
      cantidadLosas: dto.cantidadLosas,
      metrosCuadrados: dto.metrosCuadrados,
    }

    await validateInventarioSalida([detalleMovimiento], this.productoRepository)

    const mermaCreada = await this.repository.create({
      ...dto,
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
        motivo: dto.motivo,
        observaciones: dto.observaciones,
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
