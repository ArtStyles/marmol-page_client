import { DomainError } from '../../errors/domain.error.js'
import type {
  AprobarInventarioMovimientoDto,
  CreateRetornoProcesoInventarioDto,
  CreateSalidaProcesoInventarioDto,
  InventarioMovimientoListQueryDto,
  InventarioMovimientoListResponseDto,
  InventarioMovimientoResponseDto,
  RechazarInventarioMovimientoDto,
} from '../../dtos/index.js'
import type {
  Dimension,
  EstadoInventario,
  InventarioMovimientoDetalle,
  Venta,
} from '../../../domain/entities/index.js'
import { dimensionToAreaM2 } from '../../../domain/entities/index.js'
import type {
  BloqueRepositoryPort,
  InventarioMovimientoPageCursor,
  InventarioMovimientoRepositoryPort,
  MermaRepositoryPort,
  ProduccionRepositoryPort,
  ProductoRepositoryPort,
  VentaRepositoryPort,
} from '../../../domain/ports/index.js'
import {
  applyInventarioEntrada,
  applyInventarioSalida,
  buildEntradaRollbackDetalles,
  buildSalidaRollbackDetalles,
  validateInventarioSalida,
} from './inventario-movimiento.helpers.js'

const DEFAULT_MOVIMIENTOS_PAGE_SIZE = 10
const MAX_MOVIMIENTOS_PAGE_SIZE = 100

export interface MovimientoActor {
  userId: string
  userName: string
}

function clampMovimientosLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_MOVIMIENTOS_PAGE_SIZE
  const integerLimit = Math.trunc(limit)
  if (integerLimit <= 0) return DEFAULT_MOVIMIENTOS_PAGE_SIZE
  return Math.min(MAX_MOVIMIENTOS_PAGE_SIZE, integerLimit)
}

function encodeMovimientosCursor(cursor: InventarioMovimientoPageCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeMovimientosCursor(rawCursor: string): InventarioMovimientoPageCursor {
  try {
    const decoded = Buffer.from(rawCursor, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded) as Partial<InventarioMovimientoPageCursor>
    if (typeof parsed.id !== 'string' || typeof parsed.fechaSolicitud !== 'string') {
      throw new Error('invalid-cursor-shape')
    }
    if (!Number.isFinite(Date.parse(parsed.fechaSolicitud))) {
      throw new Error('invalid-cursor-date')
    }
    return {
      id: parsed.id,
      fechaSolicitud: parsed.fechaSolicitud,
    }
  } catch {
    throw new DomainError('Cursor de paginacion invalido.', 400, 'MOVIMIENTOS_CURSOR_INVALIDO')
  }
}

export class GetInventarioMovimientosUseCase {
  constructor(private readonly repository: InventarioMovimientoRepositoryPort) {}

  async execute(
    query: InventarioMovimientoListQueryDto = {},
  ): Promise<InventarioMovimientoListResponseDto> {
    const limit = clampMovimientosLimit(query.limit)
    const cursor = query.cursor?.trim() ? decodeMovimientosCursor(query.cursor.trim()) : undefined
    const result = await this.repository.findPage({
      limit,
      cursor,
      estado: query.estado,
    })

    return {
      items: result.items,
      nextCursor: result.nextCursor ? encodeMovimientosCursor(result.nextCursor) : null,
      hasMore: result.hasMore,
    }
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

const estadoSiguienteProceso: Partial<Record<EstadoInventario, EstadoInventario>> = {
  Picado: 'Escuadrado',
  Escuadrado: 'Devastado',
  Devastado: 'Resinado',
  Resinado: 'Pulido',
}

function resolveEstadoRetornoProceso(
  estadoActual: EstadoInventario,
  estadoObjetivo?: EstadoInventario,
): EstadoInventario {
  if (!estadoObjetivo) {
    return estadoActual
  }

  if (estadoObjetivo === estadoActual) {
    return estadoObjetivo
  }

  const siguiente = estadoSiguienteProceso[estadoActual]
  if (siguiente && estadoObjetivo === siguiente) {
    return estadoObjetivo
  }

  throw new DomainError(
    `El estado objetivo ${estadoObjetivo} no es valido para retorno desde ${estadoActual}.`,
    400,
    'RETORNO_PROCESO_ESTADO_OBJETIVO_INVALIDO',
    {
      estadoActual,
      estadoObjetivo,
      estadoSiguienteValido: siguiente ?? null,
    },
  )
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function resolveMetrosParaMovimiento(
  producto: { cantidadLosas: number; metrosCuadrados: number; dimension: Dimension },
  cantidadLosas: number,
): number {
  if (producto.cantidadLosas > 0 && producto.metrosCuadrados > 0) {
    const proporcion = cantidadLosas / producto.cantidadLosas
    return round2(proporcion * producto.metrosCuadrados)
  }
  return round2(cantidadLosas * dimensionToAreaM2(producto.dimension))
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
        'Solo se puede dar salida a proceso desde stock en almacen.',
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

    const motivo = dto.motivo?.trim() || `Salida a proceso: ${dto.accionObjetivo}`

    const metrosCuadrados = resolveMetrosParaMovimiento(producto, cantidadLosas)
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

    await validateInventarioSalida([detalle], this.productoRepository, this.repository)

    const now = new Date().toISOString()
    let salidaAplicada = false
    let entradaAplicada = false

    try {
      await applyInventarioSalida([detalle], this.productoRepository)
      salidaAplicada = true

      await applyInventarioEntrada([detalle], this.productoRepository)
      entradaAplicada = true

      return await this.repository.create({
        fechaSolicitud: now,
        fechaResolucion: now,
        tipo: 'salida',
        origen: 'proceso',
        estado: 'aprobado',
        motivo,
        observaciones: `Salida directa a proceso para ${dto.accionObjetivo}.`,
        solicitadoPorId: actor.userId,
        solicitadoPorNombre: actor.userName,
        aprobadoPorId: actor.userId,
        aprobadoPorNombre: actor.userName,
        detalles: [detalle],
      })
    } catch (error) {
      if (entradaAplicada) {
        await applyInventarioSalida(
          buildEntradaRollbackDetalles([detalle]),
          this.productoRepository,
        ).catch(() => undefined)
      }
      if (salidaAplicada) {
        await applyInventarioEntrada(
          buildSalidaRollbackDetalles([detalle]),
          this.productoRepository,
        ).catch(() => undefined)
      }
      throw error
    }
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

    const metrosCuadrados = resolveMetrosParaMovimiento(producto, cantidadLosas)
    const estadoRetorno = resolveEstadoRetornoProceso(producto.estado, dto.estadoObjetivo)
    const detalle = {
      id: `imd-ra-${producto.id}-${Date.now()}`,
      productoId: producto.id,
      productoNombre: producto.nombre,
      tipo: producto.tipo,
      estado: producto.estado,
      estadoDestino: estadoRetorno,
      ubicacionOrigen: 'proceso' as const,
      ubicacionDestino: 'almacen' as const,
      dimension: producto.dimension,
      origenId: producto.origenId,
      origenNombre: producto.origenNombre,
      cantidadLosas,
      metrosCuadrados,
    }

    await validateInventarioSalida([detalle], this.productoRepository, this.repository)

    const now = new Date().toISOString()
    return this.repository.create({
      fechaSolicitud: now,
      tipo: 'entrada',
      origen: 'proceso',
      estado: 'pendiente',
      motivo,
      observaciones:
        estadoRetorno === producto.estado
          ? 'Retorno solicitado desde proceso hacia almacen sin cambio de estado.'
          : `Retorno solicitado desde proceso hacia almacen con cambio de estado ${producto.estado} -> ${estadoRetorno}.`,
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

    const detallesSalidaProceso = movimiento.detalles.map((detalle) => ({
      ...detalle,
      estado: detalle.estado ?? detalle.estadoDestino,
    }))
    const detallesEntradaProceso = movimiento.detalles.map((detalle) => ({
      ...detalle,
      estado: detalle.estadoDestino ?? detalle.estado,
      ubicacionDestino: detalle.ubicacionDestino ?? 'proceso',
    }))

    let rollbackDetallesSalida: InventarioMovimientoDetalle[] = []
    let rollbackDetallesEntrada: InventarioMovimientoDetalle[] = []

    try {
      if (movimiento.origen === 'proceso') {
        await applyInventarioSalida(detallesSalidaProceso, this.productoRepository)
        rollbackDetallesSalida = buildSalidaRollbackDetalles(detallesSalidaProceso)

        await applyInventarioEntrada(detallesEntradaProceso, this.productoRepository)
        rollbackDetallesEntrada = buildEntradaRollbackDetalles(detallesEntradaProceso)
      } else if (movimiento.tipo === 'entrada') {
        await applyInventarioEntrada(movimiento.detalles, this.productoRepository)
        rollbackDetallesEntrada = buildEntradaRollbackDetalles(movimiento.detalles)
      } else {
        await applyInventarioSalida(movimiento.detalles, this.productoRepository)
        rollbackDetallesSalida = buildSalidaRollbackDetalles(movimiento.detalles)
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

      await this.syncReferenciaAprobada(
        updated.id,
        updated.referenciaId,
        updated.origen,
        actor,
        updated.motivo,
        updated.detalles,
      )
      await this.syncBloquesVendidos(updated.detalles)
      return updated
    } catch (error) {
      if (rollbackDetallesEntrada.length > 0) {
        await applyInventarioSalida(rollbackDetallesEntrada, this.productoRepository).catch(() => undefined)
      }
      if (rollbackDetallesSalida.length > 0) {
        await applyInventarioEntrada(rollbackDetallesSalida, this.productoRepository).catch(() => undefined)
      }
      throw error
    }
  }

  private async syncReferenciaAprobada(
    movimientoId: string,
    referenciaId: string | undefined,
    origen: InventarioMovimientoResponseDto['origen'],
    actor: MovimientoActor,
    motivo: string,
    detallesMovimiento: InventarioMovimientoDetalle[],
  ): Promise<void> {
    if (!referenciaId) return

    if (origen === 'venta') {
      const venta = await this.ventaRepository.findById(referenciaId)
      await this.ventaRepository.update(referenciaId, {
        estado: 'completada',
        movimientoInventarioId: movimientoId,
      })
      if (venta) {
        await this.syncGananciaBloquesPorVenta(venta, detallesMovimiento)
      }
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
            estado: bloque.estado === 'vendido' ? 'vendido' : metrosVendibles <= 0 ? 'agotado' : bloque.estado,
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

  private async syncGananciaBloquesPorVenta(
    venta: Venta,
    detallesMovimiento: InventarioMovimientoDetalle[],
  ): Promise<void> {
    const gananciasPorOrigen = new Map<string, number>()
    const totalVentaRealizada =
      venta.total > 0 ? venta.total : round2(venta.subtotal - venta.subtotal * (venta.descuento / 100))

    const acumularGanancia = (origenId: string, monto: number): void => {
      if (!origenId || monto <= 0) return
      gananciasPorOrigen.set(origenId, round2((gananciasPorOrigen.get(origenId) ?? 0) + monto))
    }

    const detallesVenta = venta.detallesProductos ?? []
    if (detallesVenta.length > 0) {
      const subtotalDetalles = detallesVenta.reduce((sum, detalle) => sum + Math.max(0, detalle.subtotal), 0)
      const factorDefault = 1 / detallesVenta.length

      detallesVenta.forEach((detalle) => {
        const base = Math.max(0, detalle.subtotal)
        const factor = subtotalDetalles > 0 ? base / subtotalDetalles : factorDefault
        acumularGanancia(detalle.origenId.trim(), round2(totalVentaRealizada * factor))
      })
    } else if (totalVentaRealizada > 0) {
      const detallesValidos = detallesMovimiento.filter((detalle) => detalle.origenId.trim().length > 0)
      if (detallesValidos.length > 0) {
        const totalMetros = detallesValidos.reduce(
          (sum, detalle) => sum + Math.max(0, detalle.metrosCuadrados),
          0,
        )
        const factorDefault = 1 / detallesValidos.length

        detallesValidos.forEach((detalle) => {
          const base = Math.max(0, detalle.metrosCuadrados)
          const factor = totalMetros > 0 ? base / totalMetros : factorDefault
          acumularGanancia(detalle.origenId.trim(), round2(totalVentaRealizada * factor))
        })
      }
    }

    for (const [origenId, ganancia] of gananciasPorOrigen.entries()) {
      const bloque = await this.bloqueRepository.findById(origenId)
      if (!bloque) continue

      await this.bloqueRepository.update(bloque.id, {
        gananciaReal: round2(bloque.gananciaReal + ganancia),
      })
    }
  }

  private async syncBloquesVendidos(detalles: InventarioMovimientoDetalle[]): Promise<void> {
    const origenIds = Array.from(
      new Set(
        detalles
          .map((detalle) => detalle.origenId.trim())
          .filter((origenId) => origenId.length > 0),
      ),
    )
    if (origenIds.length === 0) return

    const productos = await this.productoRepository.findAll()

    for (const origenId of origenIds) {
      const bloque = await this.bloqueRepository.findById(origenId)
      if (!bloque || bloque.estado !== 'agotado') continue

      const tieneStock = productos.some(
        (producto) =>
          producto.origenId === origenId &&
          (producto.cantidadLosas > 0 || producto.metrosCuadrados > 0.000001),
      )

      if (!tieneStock) {
        await this.bloqueRepository.update(bloque.id, {
          estado: 'vendido',
        })
      }
    }
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

    // Rechazar movimientos de proceso no debe alterar stock ni estado operativo
    // de productos fuera de almacen; solo cambia el estado del movimiento.
    if (updated.origen === 'proceso') {
      return updated
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
