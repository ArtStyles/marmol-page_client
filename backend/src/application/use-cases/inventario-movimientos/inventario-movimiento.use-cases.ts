import { DomainError } from '../../errors/domain.error.js'
import type {
  AprobarInventarioMovimientoDto,
  InventarioMovimientoResponseDto,
  RechazarInventarioMovimientoDto,
} from '../../dtos/index.js'
import type {
  BloqueRepositoryPort,
  InventarioMovimientoRepositoryPort,
  MermaRepositoryPort,
  ProduccionRepositoryPort,
  ProductoRepositoryPort,
  VentaRepositoryPort,
} from '../../../domain/ports/index.js'
import { applyInventarioEntrada, applyInventarioSalida } from './inventario-movimiento.helpers.js'

export interface MovimientoActor {
  userId: string
  userName: string
}

export class GetInventarioMovimientosUseCase {
  constructor(private readonly repository: InventarioMovimientoRepositoryPort) {}

  async execute(): Promise<InventarioMovimientoResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetInventarioMovimientoByIdUseCase {
  constructor(private readonly repository: InventarioMovimientoRepositoryPort) {}

  async execute(id: string): Promise<InventarioMovimientoResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class ApproveInventarioMovimientoUseCase {
  constructor(
    private readonly repository: InventarioMovimientoRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly ventaRepository: VentaRepositoryPort,
    private readonly mermaRepository: MermaRepositoryPort,
    private readonly produccionRepository: ProduccionRepositoryPort,
  ) {}

  async execute(
    id: string,
    dto: AprobarInventarioMovimientoDto,
    actor: MovimientoActor,
  ): Promise<InventarioMovimientoResponseDto> {
    const movimiento = await this.repository.findById(id)
    if (!movimiento) {
      throw new DomainError(`Movimiento ${id} no existe`, 404, 'MOVIMIENTO_NOT_FOUND')
    }

    if (movimiento.estado !== 'pendiente') {
      throw new DomainError(
        `El movimiento ${id} ya fue ${movimiento.estado}`,
        409,
        'MOVIMIENTO_YA_RESUELTO',
      )
    }

    if (movimiento.tipo === 'entrada') {
      await applyInventarioEntrada(movimiento.detalles, this.productoRepository)
    } else {
      await applyInventarioSalida(movimiento.detalles, this.productoRepository)
    }

    const updated = await this.repository.update(id, {
      estado: 'aprobado',
      fechaResolucion: new Date().toISOString(),
      aprobadoPorId: actor.userId,
      aprobadoPorNombre: actor.userName,
      observaciones: dto.observaciones?.trim() || movimiento.observaciones,
      motivoRechazo: undefined,
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo actualizar movimiento ${id}`,
        500,
        'MOVIMIENTO_UPDATE_FAILED',
      )
    }

    await this.syncReferenciaAprobada(updated.id, updated.referenciaId, updated.origen, actor, updated.motivo)
    return updated
  }

  private async syncReferenciaAprobada(
    movimientoId: string,
    referenciaId: string | undefined,
    origen: InventarioMovimientoResponseDto['origen'],
    actor: MovimientoActor,
    motivo: string,
  ): Promise<void> {
    if (!referenciaId) return

    if (origen === 'venta') {
      await this.ventaRepository.update(referenciaId, {
        estado: 'completada',
        movimientoInventarioId: movimientoId,
      })
      return
    }

    if (origen === 'merma') {
      const merma = await this.mermaRepository.findById(referenciaId)
      if (merma) {
        const bloque = await this.bloqueRepository.findById(merma.origenId)
        if (bloque) {
          const metrosVendibles = Math.max(0, bloque.metrosVendibles - merma.metrosCuadrados)
          await this.bloqueRepository.update(bloque.id, {
            losasPerdidas: bloque.losasPerdidas + merma.cantidadLosas,
            metrosVendibles: Number(metrosVendibles.toFixed(2)),
            estado: metrosVendibles <= 0 ? 'agotado' : bloque.estado,
          })
        }
      }

      await this.mermaRepository.update(referenciaId, {
        estadoInventario: 'aprobado',
        movimientoInventarioId: movimientoId,
      })
      return
    }

    if (origen !== 'produccion') {
      return
    }

    const produccion = await this.produccionRepository.findById(referenciaId)
    if (!produccion) return

    const ids = produccion.movimientoInventarioIds ?? []
    const movimientoInventarioIds = ids.includes(movimientoId) ? ids : [...ids, movimientoId]

    await this.produccionRepository.update(referenciaId, {
      aprobacionAlmacenEstado: 'aprobado',
      aprobacionAlmacenPorId: actor.userId,
      aprobacionAlmacenPorNombre: actor.userName,
      aprobacionAlmacenFecha: new Date().toISOString(),
      aprobacionAlmacenMotivo: motivo,
      inventarioAplicado: true,
      movimientoInventarioIds,
    })
  }
}

export class RejectInventarioMovimientoUseCase {
  constructor(
    private readonly repository: InventarioMovimientoRepositoryPort,
    private readonly ventaRepository: VentaRepositoryPort,
    private readonly mermaRepository: MermaRepositoryPort,
    private readonly produccionRepository: ProduccionRepositoryPort,
  ) {}

  async execute(
    id: string,
    dto: RechazarInventarioMovimientoDto,
    actor: MovimientoActor,
  ): Promise<InventarioMovimientoResponseDto> {
    const movimiento = await this.repository.findById(id)
    if (!movimiento) {
      throw new DomainError(`Movimiento ${id} no existe`, 404, 'MOVIMIENTO_NOT_FOUND')
    }

    if (movimiento.estado !== 'pendiente') {
      throw new DomainError(
        `El movimiento ${id} ya fue ${movimiento.estado}`,
        409,
        'MOVIMIENTO_YA_RESUELTO',
      )
    }

    const updated = await this.repository.update(id, {
      estado: 'rechazado',
      fechaResolucion: new Date().toISOString(),
      aprobadoPorId: actor.userId,
      aprobadoPorNombre: actor.userName,
      motivoRechazo: dto.motivoRechazo.trim(),
    })

    if (!updated) {
      throw new DomainError(
        `No se pudo actualizar movimiento ${id}`,
        500,
        'MOVIMIENTO_UPDATE_FAILED',
      )
    }

    await this.syncReferenciaRechazada(updated.referenciaId, updated.origen, dto.motivoRechazo.trim())
    return updated
  }

  private async syncReferenciaRechazada(
    referenciaId: string | undefined,
    origen: InventarioMovimientoResponseDto['origen'],
    motivoRechazo: string,
  ): Promise<void> {
    if (!referenciaId) return

    if (origen === 'venta') {
      await this.ventaRepository.update(referenciaId, {
        estado: 'cancelada',
      })
      return
    }

    if (origen === 'merma') {
      await this.mermaRepository.update(referenciaId, {
        estadoInventario: 'rechazado',
      })
      return
    }

    if (origen !== 'produccion') {
      return
    }

    await this.produccionRepository.update(referenciaId, {
      aprobacionAlmacenEstado: 'rechazado',
      aprobacionAlmacenFecha: new Date().toISOString(),
      aprobacionAlmacenMotivo: motivoRechazo,
      inventarioAplicado: false,
    })
  }
}
