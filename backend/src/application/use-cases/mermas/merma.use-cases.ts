import { DomainError } from '../../errors/domain.error.js'
import type { Producto } from '../../../domain/entities/index.js'
import type {
  BloqueRepositoryPort,
  MermaRepositoryPort,
  ProductoRepositoryPort,
} from '../../../domain/ports/index.js'
import type { CreateMermaDto, UpdateMermaDto, MermaResponseDto } from '../../dtos/index.js'

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
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly productoRepository: ProductoRepositoryPort,
  ) {}

  async execute(dto: CreateMermaDto): Promise<MermaResponseDto> {
    await descontarInventarioPorMerma(dto, this.productoRepository)
    await actualizarBloquePorMerma(dto, this.bloqueRepository)
    return this.repository.create(dto)
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
    return this.repository.delete(id)
  }
}

async function descontarInventarioPorMerma(
  dto: CreateMermaDto,
  productoRepository: ProductoRepositoryPort,
): Promise<void> {
  const productos = (await productoRepository.findAll())
    .filter(
      (item) =>
        item.origenId === dto.origenId &&
        item.tipo === dto.tipo &&
        item.dimension === dto.dimension,
    )
    .sort((a, b) => estadoPrioridad(b.estado) - estadoPrioridad(a.estado))

  const stockLosas = productos.reduce((sum, item) => sum + item.cantidadLosas, 0)
  const stockM2 = productos.reduce((sum, item) => sum + item.metrosCuadrados, 0)

  if (stockLosas < dto.cantidadLosas || stockM2 + 1e-6 < dto.metrosCuadrados) {
    throw new DomainError(
      `Stock insuficiente para registrar merma en ${dto.origenNombre}`,
      409,
      'STOCK_INSUFICIENTE_MERMA',
      {
        disponibleLosas: stockLosas,
        solicitadoLosas: dto.cantidadLosas,
        disponibleM2: round2(stockM2),
        solicitadoM2: dto.metrosCuadrados,
      },
    )
  }

  let restanteLosas = dto.cantidadLosas
  let restanteM2 = dto.metrosCuadrados

  for (const producto of productos) {
    if (restanteLosas <= 0 && restanteM2 <= 0) {
      break
    }

    const usarLosas = Math.min(producto.cantidadLosas, Math.max(0, restanteLosas))
    const usarM2 = Math.min(producto.metrosCuadrados, Math.max(0, restanteM2))
    if (usarLosas <= 0 && usarM2 <= 0) {
      continue
    }

    await productoRepository.update(producto.id, {
      cantidadLosas: Math.max(0, producto.cantidadLosas - usarLosas),
      metrosCuadrados: round2(Math.max(0, producto.metrosCuadrados - usarM2)),
    })

    restanteLosas -= usarLosas
    restanteM2 = round2(Math.max(0, restanteM2 - usarM2))
  }
}

async function actualizarBloquePorMerma(
  dto: CreateMermaDto,
  bloqueRepository: BloqueRepositoryPort,
): Promise<void> {
  const bloque = await bloqueRepository.findById(dto.origenId)
  if (!bloque) {
    return
  }

  const metrosVendibles = round2(Math.max(0, bloque.metrosVendibles - dto.metrosCuadrados))
  await bloqueRepository.update(bloque.id, {
    losasPerdidas: bloque.losasPerdidas + dto.cantidadLosas,
    metrosVendibles,
    estado: metrosVendibles <= 0 ? 'agotado' : bloque.estado,
  })
}

function estadoPrioridad(estado: Producto['estado']): number {
  if (estado === 'Escuadrado') return 3
  if (estado === 'Pulido') return 2
  return 1
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
