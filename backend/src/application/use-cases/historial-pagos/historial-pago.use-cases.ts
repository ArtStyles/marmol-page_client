import { DomainError } from '../../errors/domain.error.js'
import type {
  HistorialPagoRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
  TrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import type {
  CreateHistorialPagoDto,
  UpdateHistorialPagoDto,
  HistorialPagoResponseDto,
} from '../../dtos/index.js'

export class GetHistorialPagosUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(): Promise<HistorialPagoResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetHistorialPagoByIdUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(id: string): Promise<HistorialPagoResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateHistorialPagoUseCase {
  constructor(
    private readonly repository: HistorialPagoRepositoryPort,
    private readonly produccionTrabajadorRepository: ProduccionTrabajadorRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
  ) {}

  async execute(dto: CreateHistorialPagoDto): Promise<HistorialPagoResponseDto> {
    const trabajador = await this.trabajadorRepository.findById(dto.trabajadorId)
    if (!trabajador) {
      throw new DomainError(
        `Trabajador ${dto.trabajadorId} no existe`,
        404,
        'TRABAJADOR_NOT_FOUND',
      )
    }

    if (dto.produccionIds.length > 0) {
      const produccion = await this.produccionTrabajadorRepository.findAll()
      const produccionMap = new Map(produccion.map((item) => [item.id, item]))

      let montoAcciones = 0
      let montoBonos = 0
      for (const produccionId of dto.produccionIds) {
        const item = produccionMap.get(produccionId)
        if (!item) {
          throw new DomainError(
            `Produccion ${produccionId} no existe`,
            404,
            'PRODUCCION_TRABAJADOR_NOT_FOUND',
          )
        }
        if (item.trabajadorId !== dto.trabajadorId) {
          throw new DomainError(
            `La produccion ${produccionId} no pertenece al trabajador ${dto.trabajadorId}`,
            409,
            'PAGO_PRODUCCION_TRABAJADOR_INVALIDO',
          )
        }
        if (item.pagado) {
          throw new DomainError(
            `La produccion ${produccionId} ya fue pagada`,
            409,
            'PAGO_DUPLICADO',
          )
        }
        montoAcciones += item.pagoTotal
        montoBonos += item.bono
      }

      if (round2(montoAcciones) !== round2(dto.montoAcciones) || round2(montoBonos) !== round2(dto.montoBonos)) {
        throw new DomainError(
          'El monto de pago no coincide con la produccion pendiente del trabajador',
          409,
          'PAGO_MONTOS_NO_COINCIDEN',
          {
            esperadoAcciones: round2(montoAcciones),
            recibidoAcciones: round2(dto.montoAcciones),
            esperadoBonos: round2(montoBonos),
            recibidoBonos: round2(dto.montoBonos),
          },
        )
      }

      for (const produccionId of dto.produccionIds) {
        await this.produccionTrabajadorRepository.update(produccionId, { pagado: true })
      }
    }

    const created = await this.repository.create(dto)

    const pendientes = (await this.produccionTrabajadorRepository.findAll())
      .filter((item) => item.trabajadorId === dto.trabajadorId && !item.pagado)
      .reduce((sum, item) => sum + item.pagoFinal, 0)

    await this.trabajadorRepository.update(dto.trabajadorId, {
      pagosTotales: round2(trabajador.pagosTotales + dto.totalPagado),
      bonosTotales: round2(trabajador.bonosTotales + dto.montoBonos + dto.bonoExtra),
      acumuladoPendiente: round2(pendientes),
    })

    return created
  }
}

export class UpdateHistorialPagoUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(id: string, dto: UpdateHistorialPagoDto): Promise<HistorialPagoResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteHistorialPagoUseCase {
  constructor(private readonly repository: HistorialPagoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
