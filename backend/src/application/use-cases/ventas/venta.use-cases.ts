import { DomainError } from '../../errors/domain.error.js'
import type { Producto, VentaDetalleProducto } from '../../../domain/entities/index.js'
import type { ProductoRepositoryPort, VentaRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateVentaDto, UpdateVentaDto, VentaResponseDto } from '../../dtos/index.js'

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
  ) {}

  async execute(dto: CreateVentaDto): Promise<VentaResponseDto> {
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

    if (dto.estado === 'completada') {
      await descontarInventarioPorVenta(detalles, this.productoRepository)
    }

    const primerDetalle = detalles[0]
    const productoNombre =
      detalles.length > 1
        ? `${primerDetalle.productoNombre} +${detalles.length - 1}`
        : primerDetalle.productoNombre

    return this.repository.create({
      ...dto,
      productoId: primerDetalle.productoId,
      productoNombre,
      detallesProductos: detalles,
      cantidadM2,
      metrosPorDimension,
      precioM2: cantidadM2 > 0 ? round2(subtotal / cantidadM2) : dto.precioM2,
      descuento,
      subtotal,
      total,
    })
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
  if (dto.detallesProductos && dto.detallesProductos.length > 0) {
    const details = dto.detallesProductos.map((item) => ({
      ...item,
      metrosCuadrados: round2(item.metrosCuadrados),
      subtotal: round2(item.metrosCuadrados * item.precioM2),
    }))
    validateDetalles(details)
    return details
  }

  const producto = await productoRepository.findById(dto.productoId)
  if (!producto) {
    throw new DomainError(`Producto ${dto.productoId} no existe`, 404, 'PRODUCTO_NOT_FOUND')
  }

  if (dto.cantidadM2 <= 0) {
    throw new DomainError('La venta debe tener metros cuadrados mayores a 0', 400, 'VENTA_METROS_INVALIDOS')
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

async function descontarInventarioPorVenta(
  detalles: VentaDetalleProducto[],
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const productos = await productoRepository.findAll()
  const productosPorId = new Map(productos.map((item) => [item.id, item]))
  const consumoPorProducto = new Map<string, { metros: number; detalle: VentaDetalleProducto }>()

  for (const detalle of detalles) {
    const consumo = consumoPorProducto.get(detalle.productoId)
    if (!consumo) {
      consumoPorProducto.set(detalle.productoId, { metros: detalle.metrosCuadrados, detalle })
      continue
    }
    consumoPorProducto.set(detalle.productoId, {
      metros: consumo.metros + detalle.metrosCuadrados,
      detalle: consumo.detalle,
    })
  }

  for (const [productoId, { metros, detalle }] of consumoPorProducto.entries()) {
    const producto = productosPorId.get(productoId)
    if (!producto) {
      throw new DomainError(
        `Producto ${detalle.productoNombre} no existe`,
        404,
        'PRODUCTO_NOT_FOUND',
      )
    }
    if (producto.metrosCuadrados + 1e-6 < metros) {
      throw new DomainError(
        `Stock insuficiente para ${producto.nombre}: disponible ${producto.metrosCuadrados.toFixed(2)} m2, solicitado ${metros.toFixed(2)} m2`,
        409,
        'STOCK_INSUFICIENTE',
      )
    }
  }

  for (const [productoId, { metros }] of consumoPorProducto.entries()) {
    const producto = productosPorId.get(productoId) as Producto
    const losasADescontar = Math.ceil(metros / dimensionToArea(producto.dimension))
    const cantidadLosas = Math.max(0, producto.cantidadLosas - losasADescontar)
    const metrosCuadrados = round2(Math.max(0, producto.metrosCuadrados - metros))
    await productoRepository.update(productoId, {
      cantidadLosas,
      metrosCuadrados,
    })
  }
}

function dimensionToArea(dimension: Producto['dimension']): number {
  if (dimension === '40x40') return 0.16
  if (dimension === '60x40') return 0.24
  return 0.32
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
