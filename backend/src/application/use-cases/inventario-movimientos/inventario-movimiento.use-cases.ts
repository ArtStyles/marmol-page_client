import { DomainError } from '../../errors/domain.error.js'
import type {
  AprobarInventarioMovimientoDto,
  CreateRetornoProcesoInventarioDto,
  CreateSalidaProcesoInventarioDto,
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
import {
  applyInventarioEntrada,
  applyInventarioSalida,
  validateInventarioSalida,
} from './inventario-movimiento.helpers.js'

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

const estadoRequeridoPorAccionProceso: Record<
  'escuadrar' | 'devastar' | 'resinar' | 'pulir',
  'Picado' | 'Escuadrado' | 'Devastado' | 'Resinado'
> = {
  escuadrar: 'Picado',
  devastar: 'Escuadrado',
  resinar: 'Devastado',
  pulir: 'Resinado',
}

function dimensionToArea(dimension: '40x40' | '60x40' | '80x40'): number {
  if (dimension === '40x40') return 0.16
  if (dimension === '60x40') return 0.24
  return 0.32
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

export class CreateSalidaProcesoInventarioUseCase {
  constructor(
    private readonly repository: InventarioMovimientoRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
  ) {}

  async execute(
    dto: CreateSalidaProcesoInventarioDto,
    actor: MovimientoActor,
  ): Promise<InventarioMovimientoResponseDto> {
    const producto = await this.productoRepository.findById(dto.productoId)
    if (!producto) {
      throw new DomainError(`Producto ${dto.productoId} no existe`, 404, 'PRODUCTO_NOT_FOUND')
    }

    if (producto.ubicacion !== 'almacen') {
      throw new DomainError(
        'Solo se puede solicitar salida a proceso desde stock en almacen.',
        409,
        'PROCESO_STOCK_ORIGEN_INVALIDO',
      )
    }

    const estadoRequerido = estadoRequeridoPorAccionProceso[dto.accionObjetivo]
    if (producto.estado !== estadoRequerido) {
      throw new DomainError(
        `Para ${dto.accionObjetivo} el producto debe estar en estado ${estadoRequerido}.`,
        409,
        'PROCESO_ESTADO_INVALIDO',
      )
    }

    const cantidadLosas = Math.trunc(dto.cantidadLosas)
    if (!Number.isInteger(cantidadLosas) || cantidadLosas <= 0) {
      throw new DomainError(
        'La salida a proceso requiere cantidad de losas entera y mayor a 0.',
        400,
        'PROCESO_CANTIDAD_INVALIDA',
      )
    }

    const motivo = dto.motivo.trim()
    if (motivo.length < 5) {
      throw new DomainError(
        'Debe indicar un motivo valido para la salida a proceso.',
        400,
        'PROCESO_MOTIVO_REQUERIDO',
      )
    }

    const metrosCuadrados = round2(cantidadLosas * dimensionToArea(producto.dimension))
    const detalle = {
      id: `imd-pr-${producto.id}-${Date.now()}`,
      productoId: producto.id,
      productoNombre: producto.nombre,
      tipo: producto.tipo,
      estado: producto.estado,
      ubicacionOrigen: 'almacen' as const,
      ubicacionDestino: 'proceso' as const,
      dimension: producto.dimension,
      origenId: producto.origenId,
      origenNombre: producto.origenNombre,
      cantidadLosas,
      metrosCuadrados,
    }

    await validateInventarioSalida([detalle], this.productoRepository)

    const now = new Date().toISOString()
    return this.repository.create({
      fechaSolicitud: now,
      tipo: 'salida',
      origen: 'proceso',
      estado: 'pendiente',
      motivo,
      observaciones: `Salida solicitada para ${dto.accionObjetivo}`,
      solicitadoPorId: actor.userId,
      solicitadoPorNombre: actor.userName,
      detalles: [detalle],
    })
  }
}

export class CreateRetornoProcesoInventarioUseCase {
  constructor(
    private readonly repository: InventarioMovimientoRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
  ) {}

  async execute(
    dto: CreateRetornoProcesoInventarioDto,
    actor: MovimientoActor,
  ): Promise<InventarioMovimientoResponseDto> {
    const producto = await this.productoRepository.findById(dto.productoId)
    if (!producto) {
      throw new DomainError(`Producto ${dto.productoId} no existe`, 404, 'PRODUCTO_NOT_FOUND')
    }

    if (producto.ubicacion !== 'proceso') {
      throw new DomainError(
        'Solo se puede solicitar retorno desde stock en proceso.',
        409,
        'RETORNO_PROCESO_ORIGEN_INVALIDO',
      )
    }

    const cantidadLosas = Math.trunc(dto.cantidadLosas)
    if (!Number.isInteger(cantidadLosas) || cantidadLosas <= 0) {
      throw new DomainError(
        'El retorno a almacen requiere cantidad de losas entera y mayor a 0.',
        400,
        'RETORNO_PROCESO_CANTIDAD_INVALIDA',
      )
    }

    const motivo = dto.motivo.trim()
    if (motivo.length < 5) {
      throw new DomainError(
        'Debe indicar un motivo valido para el retorno a almacen.',
        400,
        'RETORNO_PROCESO_MOTIVO_REQUERIDO',
      )
    }

    const metrosCuadrados = round2(cantidadLosas * dimensionToArea(producto.dimension))
    const detalle = {
      id: `imd-ra-${producto.id}-${Date.now()}`,
      productoId: producto.id,
      productoNombre: producto.nombre,
      tipo: producto.tipo,
      estado: producto.estado,
      ubicacionOrigen: 'proceso' as const,
      ubicacionDestino: 'almacen' as const,
      dimension: producto.dimension,
      origenId: producto.origenId,
      origenNombre: producto.origenNombre,
      cantidadLosas,
      metrosCuadrados,
    }

    await validateInventarioSalida([detalle], this.productoRepository)

    const now = new Date().toISOString()
    return this.repository.create({
      fechaSolicitud: now,
      tipo: 'salida',
      origen: 'proceso',
      estado: 'pendiente',
      motivo,
      observaciones: 'Retorno solicitado desde proceso hacia almacen sin cambio de estado.',
      solicitadoPorId: actor.userId,
      solicitadoPorNombre: actor.userName,
      detalles: [detalle],
    })
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
      if (movimiento.origen === 'proceso') {
        await applyInventarioEntrada(
          movimiento.detalles.map((detalle) => ({
            ...detalle,
            ubicacionDestino: detalle.ubicacionDestino ?? 'proceso',
          })),
          this.productoRepository,
        )
      }
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
