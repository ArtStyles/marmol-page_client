import type {
  BloqueRepositoryPort,
  InventarioMovimientoRepositoryPort,
} from '../../../domain/ports/index.js'
import type { BloqueOLote } from '../../../domain/entities/index.js'
import type { CreateBloqueDto, UpdateBloqueDto, BloqueResponseDto } from '../../dtos/index.js'

interface BloqueActor {
  userId: string
  userName: string
}

export class GetBloquesUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(): Promise<BloqueResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetBloqueByIdUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(id: string): Promise<BloqueResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateBloqueUseCase {
  constructor(
    private readonly repository: BloqueRepositoryPort,
    private readonly inventarioMovimientoRepository: InventarioMovimientoRepositoryPort,
  ) {}

  async execute(dto: CreateBloqueDto, actor?: BloqueActor): Promise<BloqueResponseDto> {
    const existentes = await this.repository.findAll()
    const codigo = buildCodigoMateriaPrima(dto.tipo, existentes)

    const created = await this.repository.create({
      ...dto,
      nombre: codigo,
    })

    if (created.tipo !== 'Lote') {
      return created
    }

    const cantidadLosas = Math.max(0, Math.trunc(created.metrosComprados))
    if (cantidadLosas <= 0) {
      return created
    }

    const metrosCuadrados = round2(cantidadLosas * dimensionToArea(created.dimensionBase))
    const now = new Date().toISOString()
    const actorId = actor?.userId ?? 'system'
    const actorName = actor?.userName ?? 'system'

    try {
      await this.inventarioMovimientoRepository.create({
        fechaSolicitud: now,
        fechaResolucion: now,
        tipo: 'entrada',
        origen: 'ajuste',
        estado: 'aprobado',
        referenciaId: created.id,
        motivo: `Entrada inicial por registro de lote ${created.nombre}`,
        observaciones: `Materia prima registrada desde proveedor ${created.proveedor}.`,
        solicitadoPorId: actorId,
        solicitadoPorNombre: actorName,
        aprobadoPorId: actorId,
        aprobadoPorNombre: actorName,
        detalles: [
          {
            id: `imd-lote-${created.id}`,
            productoNombre: `Piso ${created.nombre} ${created.dimensionBase} Picado`,
            tipo: 'Piso',
            estado: 'Picado',
            dimension: created.dimensionBase,
            origenId: created.id,
            origenNombre: created.nombre,
            cantidadLosas,
            metrosCuadrados,
          },
        ],
      })
    } catch (error) {
      await this.repository.delete(created.id)
      throw error
    }

    return created
  }
}

export class UpdateBloqueUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(id: string, dto: UpdateBloqueDto): Promise<BloqueResponseDto | null> {
    const actual = await this.repository.findById(id)
    if (!actual) return null

    const { nombre: _ignoredNombre, ...patch } = dto
    const patchFinal: Partial<BloqueOLote> = { ...patch }
    const tipoObjetivo = patchFinal.tipo ?? actual.tipo

    if (tipoObjetivo !== actual.tipo) {
      const existentes = (await this.repository.findAll()).filter((item) => item.id !== id)
      patchFinal.nombre = buildCodigoMateriaPrima(tipoObjetivo, existentes)
    }

    return this.repository.update(id, patchFinal)
  }
}

export class DeleteBloqueUseCase {
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

function buildCodigoMateriaPrima(
  tipo: BloqueOLote['tipo'],
  existentes: BloqueOLote[],
): string {
  const prefijo = tipo === 'Bloque' ? 'A' : 'L'
  const regexCodigo = new RegExp(`^${prefijo}-(\\d{3})$`)

  const max = existentes.reduce((acc, item) => {
    if (item.tipo !== tipo) return acc

    const codigoActual = item.nombre.trim()
    const matchCodigo = codigoActual.match(regexCodigo)
    if (matchCodigo) {
      return Math.max(acc, Number.parseInt(matchCodigo[1], 10) || 0)
    }

    const matchId = item.id.match(/(\d+)$/)
    if (matchId) {
      return Math.max(acc, Number.parseInt(matchId[1], 10) || 0)
    }

    return acc
  }, 0)

  return `${prefijo}-${String(max + 1).padStart(3, '0')}`
}

function dimensionToArea(dimension: BloqueOLote['dimensionBase']): number {
  if (dimension === '40x40') return 1 / 6
  if (dimension === '60x40') return 1 / 4
  return 1 / 3
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
