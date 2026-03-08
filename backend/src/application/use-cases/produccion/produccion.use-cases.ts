import type {
  CreateProduccionDto,
  UpdateProduccionDto,
  ProduccionResponseDto,
  CreateProduccionTrabajadorDto,
  UpdateProduccionTrabajadorDto,
  ProduccionTrabajadorResponseDto,
} from '../../dtos/index.js'
import type { ProduccionDetalleAccion, ProduccionDiaria } from '../../../domain/entities/index.js'
import type {
  BloqueRepositoryPort,
  ProductoRepositoryPort,
  ProduccionRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'

export class GetProduccionUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(): Promise<ProduccionResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetProduccionByIdUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(id: string): Promise<ProduccionResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateProduccionUseCase {
  constructor(
    private readonly repository: ProduccionRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
  ) {}

  async execute(dto: CreateProduccionDto): Promise<ProduccionResponseDto> {
    await upsertInventarioPorProduccion(dto, this.productoRepository)
    await actualizarBloquePorProduccion(dto, this.bloqueRepository)
    return this.repository.create(dto)
  }
}

export class UpdateProduccionUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(id: string, dto: UpdateProduccionDto): Promise<ProduccionResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteProduccionUseCase {
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

// Produccion Trabajadores
export class GetProduccionTrabajadoresUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(): Promise<ProduccionTrabajadorResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetProduccionTrabajadorByIdUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(id: string): Promise<ProduccionTrabajadorResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateProduccionTrabajadorUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(dto: CreateProduccionTrabajadorDto): Promise<ProduccionTrabajadorResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateProduccionTrabajadorUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(
    id: string,
    dto: UpdateProduccionTrabajadorDto
  ): Promise<ProduccionTrabajadorResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteProduccionTrabajadorUseCase {
  constructor(private readonly repository: ProduccionTrabajadorRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

async function upsertInventarioPorProduccion(
  dto: CreateProduccionDto,
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const productos = await productoRepository.findAll()
  const totalPerdidasPorAccion = buildPerdidasPorAccion(dto.detallesAcciones)
  const mapaEstado = {
    picar: 'Picado',
    pulir: 'Pulido',
    escuadrar: 'Escuadrado',
  } as const
  const acciones = [
    { accion: 'picar', cantidad: dto.cantidadPicar },
    { accion: 'pulir', cantidad: dto.cantidadPulir },
    { accion: 'escuadrar', cantidad: dto.cantidadEscuadrar },
  ] as const

  for (const { accion, cantidad } of acciones) {
    const perdidas = totalPerdidasPorAccion[accion] ?? 0
    const efectivas = Math.max(0, cantidad - perdidas)
    if (efectivas <= 0) {
      continue
    }

    const estado = mapaEstado[accion]
    const existente = productos.find(
      (item) =>
        item.origenId === dto.origenId &&
        item.tipo === dto.tipo &&
        item.dimension === dto.dimension &&
        item.estado === estado,
    )
    const metros = round2(efectivas * dimensionToArea(dto.dimension))

    if (existente) {
      await productoRepository.update(existente.id, {
        cantidadLosas: existente.cantidadLosas + efectivas,
        metrosCuadrados: round2(existente.metrosCuadrados + metros),
      })
      continue
    }

    await productoRepository.create({
      nombre: `${dto.tipo} ${dto.origenNombre} ${dto.dimension} ${estado}`,
      tipo: dto.tipo,
      estado,
      dimension: dto.dimension,
      origenId: dto.origenId,
      origenNombre: dto.origenNombre,
      cantidadLosas: efectivas,
      metrosCuadrados: metros,
      precioM2: 0,
      imagen: '/placeholder.jpg',
    })
  }
}

async function actualizarBloquePorProduccion(
  dto: CreateProduccionDto,
  bloqueRepository: BloqueRepositoryPort,
): Promise<void> {
  const bloque = await bloqueRepository.findById(dto.origenId)
  if (!bloque) {
    return
  }

  const totalLosasPerdidas =
    dto.detallesAcciones?.reduce((sum, item) => sum + (item.losasMermaTotal ?? 0), 0) ?? 0
  const totalM2Perdidos =
    dto.detallesAcciones?.reduce((sum, item) => {
      if (item.metrosMermaTotal != null) {
        return sum + item.metrosMermaTotal
      }
      return sum + (item.losasMermaTotal ?? 0) * dimensionToArea(dto.dimension)
    }, 0) ?? 0

  const metrosVendibles = round2(Math.max(0, bloque.metrosVendibles + dto.totalM2 - totalM2Perdidos))
  await bloqueRepository.update(bloque.id, {
    losasProducidas: bloque.losasProducidas + dto.totalLosas,
    losasPerdidas: bloque.losasPerdidas + totalLosasPerdidas,
    metrosVendibles,
    estado: metrosVendibles <= 0 ? 'agotado' : bloque.estado,
  })
}

function buildPerdidasPorAccion(
  detalles: ProduccionDetalleAccion[] | undefined,
): Record<'picar' | 'pulir' | 'escuadrar', number> {
  const acc = {
    picar: 0,
    pulir: 0,
    escuadrar: 0,
  } as Record<'picar' | 'pulir' | 'escuadrar', number>

  for (const detalle of detalles ?? []) {
    const totalPartidas = (detalle.losasMermaTotal ?? 0) + (detalle.losasReutilizables ?? 0)
    acc[detalle.accion] += totalPartidas
  }

  return acc
}

function dimensionToArea(dimension: ProduccionDiaria['dimension']): number {
  if (dimension === '40x40') return 0.16
  if (dimension === '60x40') return 0.24
  return 0.32
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
