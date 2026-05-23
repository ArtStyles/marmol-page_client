import { DomainError } from '../../errors/domain.error.js'
import { round2 } from '../../../shared/math.js'
import type { FondoOperativoRepositoryPort, GastoRepositoryPort } from '../../../domain/ports/index.js'
import type { FondoCategoriaDto, FondoOperativoResponseDto } from '../../dtos/index.js'
import type { GastoActor } from './gasto.helpers.js'

export class GetFondoOperativoUseCase {
  constructor(
    private readonly fondoRepo: FondoOperativoRepositoryPort,
    private readonly gastoRepo: GastoRepositoryPort,
  ) {}

  async execute(): Promise<FondoOperativoResponseDto> {
    const periodo = currentPeriodo()
    const [fondo, gastos] = await Promise.all([
      this.fondoRepo.findByPeriodo(periodo),
      this.gastoRepo.findAll(),
    ])

    const gastosPeriodo = gastos.filter(
      (g) => g.estado === 'activo' && g.fecha.startsWith(periodo),
    )

    const totalGastado = round2(gastosPeriodo.reduce((sum, g) => sum + g.costo, 0))
    const fondoInicial = fondo?.fondoInicial ?? 0
    const balanceActual = round2(fondoInicial - totalGastado)

    return {
      periodo,
      fondoInicial,
      totalGastado,
      balanceActual,
      configurado: fondo !== null,
      porCategoria: buildCategoryBreakdown(gastosPeriodo, totalGastado),
      creadoPorId: fondo?.creadoPorId,
      creadoPorNombre: fondo?.creadoPorNombre,
    }
  }
}

export class SetFondoOperativoUseCase {
  constructor(
    private readonly fondoRepo: FondoOperativoRepositoryPort,
    private readonly gastoRepo: GastoRepositoryPort,
  ) {}

  async execute(
    dto: { periodo: string; fondoInicial: number },
    actor: GastoActor,
  ): Promise<FondoOperativoResponseDto> {
    const periodo = normalizePeriodo(dto.periodo)
    if (!periodo) {
      throw new DomainError('El periodo debe tener formato YYYY-MM.', 400, 'FONDO_PERIODO_INVALIDO')
    }
    if (!Number.isFinite(dto.fondoInicial) || dto.fondoInicial <= 0) {
      throw new DomainError('El fondo inicial debe ser mayor que 0.', 400, 'FONDO_INICIAL_INVALIDO')
    }

    await this.fondoRepo.upsert({
      periodo,
      fondoInicial: round2(dto.fondoInicial),
      creadoPorId: actor.userId,
      creadoPorNombre: actor.userName,
      createdAt: new Date().toISOString(),
    })

    const gastos = await this.gastoRepo.findAll()
    const gastosPeriodo = gastos.filter(
      (g) => g.estado === 'activo' && g.fecha.startsWith(periodo),
    )
    const totalGastado = round2(gastosPeriodo.reduce((sum, g) => sum + g.costo, 0))
    const balanceActual = round2(dto.fondoInicial - totalGastado)

    return {
      periodo,
      fondoInicial: round2(dto.fondoInicial),
      totalGastado,
      balanceActual,
      configurado: true,
      porCategoria: buildCategoryBreakdown(gastosPeriodo, totalGastado),
      creadoPorId: actor.userId,
      creadoPorNombre: actor.userName,
    }
  }
}

function buildCategoryBreakdown(
  gastos: Array<{ tipo: string; costo: number }>,
  totalGastado: number,
): FondoCategoriaDto[] {
  const grouped = new Map<string, number>()
  for (const g of gastos) {
    grouped.set(g.tipo, round2((grouped.get(g.tipo) ?? 0) + g.costo))
  }
  return [...grouped.entries()]
    .map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: totalGastado > 0 ? round2((total / totalGastado) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

function currentPeriodo(): string {
  return new Date().toISOString().slice(0, 7)
}

function normalizePeriodo(raw: string): string | null {
  const trimmed = raw.trim()
  return /^\d{4}-\d{2}$/.test(trimmed) ? trimmed : null
}

