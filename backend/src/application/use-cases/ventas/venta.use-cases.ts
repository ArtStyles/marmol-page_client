import { DomainError } from '../../errors/domain.error.js'
import type { Producto, VentaDetalleProducto } from '../../../domain/entities/index.js'
import type {
  InventarioMovimientoRepositoryPort,
  ProductoRepositoryPort,
  VentaRepositoryPort,
} from '../../../domain/ports/index.js'
import type { CreateVentaDto, UpdateVentaDto, VentaResponseDto } from '../../dtos/index.js'
import { validateInventarioSalida } from '../inventario-movimientos/inventario-movimiento.helpers.js'

interface VentaActor {
  userId: string
  userName: string
}

export class GetVentasUseCase {
  constructor(private readonly repository: VentaRepositoryPort) {}

  async execute(): Promise<VentaResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetVentaByIdUseCase {
  constructor(private readonly repository: VentaRepositoryPort) {}

  async execute(id: string): Promise<VentaResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateVentaUseCase {
  constructor(
    private readonly repository: VentaRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
    private readonly movimientoRepository: InventarioMovimientoRepositoryPort,
  ) {}

  async execute(dto: CreateVentaDto, actor: VentaActor): Promise<VentaResponseDto> {
    const detalles = await resolveVentaDetalles(dto, this.productoRepository)
    const cantidadM2 = round2(detalles.reduce((sum, item) => sum + item.metrosCuadrados, 0))
    const subtotal = round2(detalles.reduce((sum, item) => sum + item.subtotal, 0))
    const descuento = Math.max(0, Math.min(100, dto.descuento))
    const descuentoAplicado = round2(subtotal * (descuento / 100))
    const fondoOperativo = dto.fondoOperativo
    const total = round2(subtotal - descuentoAplicado + fondoOperativo)
    const metrosPorDimension = detalles.reduce(
      (acc, item) => {
        acc[item.dimension] = round2(acc[item.dimension] + item.metrosCuadrados)
        return acc
      },
      {
        '40x40': 0,
        '60x40': 0,
        '80x40': 0,
      } as CreateVentaDto['metrosPorDimension'],
    )

    const motivoMovimientoAlmacen = dto.motivoMovimientoAlmacen?.trim()
    if (!motivoMovimientoAlmacen || motivoMovimientoAlmacen.length < 5) {
      throw new DomainError(
        'Debe indicar un motivo de salida de almacen para registrar la venta.',
        400,
        'VENTA_MOTIVO_ALMACEN_REQUERIDO',
      )
    }

    const productos = await this.productoRepository.findAll()
    const productosPorId = new Map(productos.map((producto) => [producto.id, producto]))
    const detallesMovimiento = detalles.map((detalle, index) => {
      const producto = productosPorId.get(detalle.productoId)
      if (!producto) {
        throw new DomainError(
          `Producto ${detalle.productoNombre} no existe`,
          404,
          'PRODUCTO_NOT_FOUND',
        )
      }

      return {
        id: `imd-v-${index}-${detalle.productoId}`,
        productoId: detalle.productoId,
        productoNombre: detalle.productoNombre,
        tipo: producto.tipo,
        estado: detalle.estado,
        dimension: detalle.dimension,
        origenId: detalle.origenId,
        origenNombre: detalle.origenNombre,
        cantidadLosas:
          producto.tipo === 'Plancha'
            ? detalle.cantidadUnidades ?? Math.ceil(detalle.metrosCuadrados / dimensionToArea(detalle.dimension))
            : Math.ceil(detalle.metrosCuadrados / dimensionToArea(detalle.dimension)),
        metrosCuadrados: round2(detalle.metrosCuadrados),
      }
    })

    await validateInventarioSalida(detallesMovimiento, this.productoRepository)

    const primerDetalle = detalles[0]
    const productoNombre =
      detalles.length > 1
        ? `${primerDetalle.productoNombre} +${detalles.length - 1}`
        : primerDetalle.productoNombre

    const ventaCreada = await this.repository.create({
      ...dto,
      estado: 'pendiente_aprobacion_almacen',
      motivoMovimientoAlmacen,
      productoId: primerDetalle.productoId,
      productoNombre,
      detallesProductos: detalles,
      cantidadM2,
      metrosPorDimension,
      precioM2: cantidadM2 > 0 ? round2(subtotal / cantidadM2) : dto.precioM2,
      descuento,
      subtotal,
      total,
      movimientoInventarioId: undefined,
    })

    try {
      const now = new Date().toISOString()
      const movimiento = await this.movimientoRepository.create({
        fechaSolicitud: now,
        tipo: 'salida',
        origen: 'venta',
        estado: 'pendiente',
        referenciaId: ventaCreada.id,
        motivo: motivoMovimientoAlmacen,
        solicitadoPorId: actor.userId,
        solicitadoPorNombre: actor.userName,
        detalles: detallesMovimiento,
      })

      const ventaActualizada = await this.repository.update(ventaCreada.id, {
        movimientoInventarioId: movimiento.id,
      })

      return ventaActualizada ?? { ...ventaCreada, movimientoInventarioId: movimiento.id }
    } catch (error) {
      await this.repository.delete(ventaCreada.id)
      throw error
    }
  }
}

export class UpdateVentaUseCase {
  constructor(private readonly repository: VentaRepositoryPort) {}

  async execute(id: string, dto: UpdateVentaDto): Promise<VentaResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteVentaUseCase {
  constructor(private readonly repository: VentaRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

async function resolveVentaDetalles(
  dto: CreateVentaDto,
  productoRepository: ProductoRepositoryPort,
): Promise<VentaDetalleProducto[]> {
  const productos = await productoRepository.findAll()
  const productosPorId = new Map(productos.map((producto) => [producto.id, producto]))

  if (dto.detallesProductos && dto.detallesProductos.length > 0) {
    const details = dto.detallesProductos.map((item) => {
      const producto = productosPorId.get(item.productoId)
      if (!producto) {
        throw new DomainError(`Producto ${item.productoId} no existe`, 404, 'PRODUCTO_NOT_FOUND')
      }

      if (producto.tipo === 'Plancha') {
        const area = dimensionToArea(producto.dimension)
        const cantidadUnidades = Math.trunc(
          item.cantidadUnidades && item.cantidadUnidades > 0
            ? item.cantidadUnidades
            : item.metrosCuadrados > 0
              ? Math.round(item.metrosCuadrados / area)
              : 0,
        )

        if (cantidadUnidades <= 0) {
          throw new DomainError(
            'Cada detalle de plancha debe indicar unidades mayores a 0',
            400,
            'VENTA_DETALLE_UNIDADES_INVALIDAS',
          )
        }

        const metrosCuadrados = round2(cantidadUnidades * area)
        return {
          ...item,
          dimension: producto.dimension,
          estado: producto.estado,
          cantidadUnidades,
          metrosCuadrados,
          subtotal: round2(metrosCuadrados * item.precioM2),
        }
      }

      return {
        ...item,
        dimension: producto.dimension,
        estado: producto.estado,
        metrosCuadrados: round2(item.metrosCuadrados),
        subtotal: round2(item.metrosCuadrados * item.precioM2),
      }
    })
    validateDetalles(details)
    return details
  }

  const producto = productosPorId.get(dto.productoId) ?? null
  if (!producto) {
    throw new DomainError(`Producto ${dto.productoId} no existe`, 404, 'PRODUCTO_NOT_FOUND')
  }

  if (dto.cantidadM2 <= 0) {
    throw new DomainError('La venta debe tener metros cuadrados mayores a 0', 400, 'VENTA_METROS_INVALIDOS')
  }

  if (producto.tipo === 'Plancha') {
    const area = dimensionToArea(producto.dimension)
    const cantidadUnidades = Math.max(1, Math.ceil(dto.cantidadM2 / area))
    const metrosCuadrados = round2(cantidadUnidades * area)

    return [
      {
        productoId: producto.id,
        productoNombre: producto.nombre,
        origenId: producto.origenId,
        origenNombre: producto.origenNombre,
        dimension: producto.dimension,
        estado: producto.estado,
        cantidadUnidades,
        metrosCuadrados,
        precioM2: dto.precioM2,
        subtotal: round2(metrosCuadrados * dto.precioM2),
      },
    ]
  }

  return [
    {
      productoId: producto.id,
      productoNombre: producto.nombre,
      origenId: producto.origenId,
      origenNombre: producto.origenNombre,
      dimension: producto.dimension,
      estado: producto.estado,
      metrosCuadrados: round2(dto.cantidadM2),
      precioM2: dto.precioM2,
      subtotal: round2(dto.cantidadM2 * dto.precioM2),
    },
  ]
}

function validateDetalles(detalles: VentaDetalleProducto[]): void {
  if (detalles.length === 0) {
    throw new DomainError('La venta requiere al menos un detalle', 400, 'VENTA_DETALLES_REQUERIDOS')
  }

  for (const item of detalles) {
    if (item.metrosCuadrados <= 0) {
      throw new DomainError('Cada detalle debe tener metros cuadrados mayores a 0', 400, 'VENTA_DETALLE_METROS_INVALIDOS')
    }
    if (item.precioM2 < 0) {
      throw new DomainError('El precio por m2 no puede ser negativo', 400, 'VENTA_PRECIO_INVALIDO')
    }
  }
}

function dimensionToArea(dimension: Producto['dimension']): number {
  if (dimension === '40x40') return 1 / 6
  if (dimension === '60x40') return 1 / 4
  return 1 / 3
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
