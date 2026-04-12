import type { EquipoRepositoryPort } from '../../../domain/ports/index.js'
import type { Equipo } from '../../../domain/entities/index.js'
import type { CreateEquipoDto, UpdateEquipoDto, EquipoResponseDto } from '../../dtos/index.js'

export class GetEquiposUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(): Promise<EquipoResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetEquipoByIdUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(id: string): Promise<EquipoResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateEquipoUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(dto: CreateEquipoDto): Promise<EquipoResponseDto> {
    const existentes = await this.repository.findAll()
    const codigoInterno = buildCodigoEquipo(dto.tipo, existentes)

    return this.repository.create({
      tipo: dto.tipo,
      codigoInterno,
      estado: dto.estado,
      notas: dto.notas?.trim() || '',
    })
  }
}

export class UpdateEquipoUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(id: string, dto: UpdateEquipoDto): Promise<EquipoResponseDto | null> {
    const actual = await this.repository.findById(id)
    if (!actual) return null

    const patchFinal: Partial<Equipo> = {}

    if (dto.estado !== undefined) patchFinal.estado = dto.estado
    if (dto.notas !== undefined) patchFinal.notas = dto.notas.trim()

    const tipoObjetivo = dto.tipo ?? actual.tipo
    if (tipoObjetivo !== actual.tipo) {
      const existentes = (await this.repository.findAll()).filter((item) => item.id !== id)
      patchFinal.tipo = tipoObjetivo
      patchFinal.codigoInterno = buildCodigoEquipo(tipoObjetivo, existentes)
    }

    if (Object.keys(patchFinal).length === 0) {
      return actual
    }

    return this.repository.update(id, patchFinal)
  }
}

export class DeleteEquipoUseCase {
  constructor(private readonly repository: EquipoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

function buildCodigoEquipo(
  tipo: Equipo['tipo'],
  existentes: Equipo[],
): string {
  const prefijo = getPrefijoCodigoEquipo(tipo)
  const regexCodigo = new RegExp(`^${prefijo}-(\\d{2,3})$`)

  const max = existentes.reduce((acc, item) => {
    if (item.tipo !== tipo) return acc

    const codigoActual = item.codigoInterno.trim().toUpperCase()
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

function getPrefijoCodigoEquipo(tipo: Equipo['tipo']): string {
  if (tipo === 'Cortadora') return 'COR'
  if (tipo === 'Pulidora') return 'PUL'
  return 'ESC'
}
