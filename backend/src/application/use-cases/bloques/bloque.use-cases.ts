import type { BloqueRepositoryPort } from '../../../domain/ports/index.js'
import type { BloqueOLote } from '../../../domain/entities/index.js'
import type { CreateBloqueDto, UpdateBloqueDto, BloqueResponseDto } from '../../dtos/index.js'

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
  constructor(private readonly repository: BloqueRepositoryPort) {}

  async execute(dto: CreateBloqueDto): Promise<BloqueResponseDto> {
    const existentes = await this.repository.findAll()
    const codigo = buildCodigoMateriaPrima(dto.tipo, existentes)

    return this.repository.create({
      ...dto,
      nombre: codigo,
    })
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
