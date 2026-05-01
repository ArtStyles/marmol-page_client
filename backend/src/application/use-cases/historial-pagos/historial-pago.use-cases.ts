import { DomainError } from '../../errors/domain.error.js'
import type {
  ConfiguracionPort,
  HistorialPagoRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
  TrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import type {
  CreateHistorialPagoDto,
  UpdateHistorialPagoDto,
  HistorialPagoResponseDto,
} from '../../dtos/index.js'

interface HistorialPagoActor {
  userId: string
  userName: string
}

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
    private readonly configuracionPort: ConfiguracionPort,
  ) {}

  async execute(dto: CreateHistorialPagoDto, actor: HistorialPagoActor): Promise<HistorialPagoResponseDto> {
    const trabajador = await this.trabajadorRepository.findById(dto.trabajadorId)
    if (!trabajador) {
      throw new DomainError(
        `Trabajador ${dto.trabajadorId} no existe`,
        404,
        'TRABAJADOR_NOT_FOUND',
      )
    }

    const periodoNomina = resolvePayrollMonthKey(dto.fecha)
    const configuracion = trabajador.rol === 'Obrero' ? null : await this.configuracionPort.get()
    let pendienteSalarioFijo = 0

    if (trabajador.rol !== 'Obrero') {
      if (dto.produccionIds.length > 0) {
        throw new DomainError(
          'Los pagos de salario fijo no deben incluir producciones asociadas.',
          409,
          'PAGO_SALARIO_FIJO_CON_PRODUCCION',
        )
      }

      if (round2(dto.montoBonos) !== 0) {
        throw new DomainError(
          'Los pagos de salario fijo no deben registrar bonos por produccion.',
          409,
          'PAGO_SALARIO_FIJO_BONOS_INVALIDOS',
        )
      }

      const salarioFijo = configuracion?.salariosFijosPorRol[trabajador.rol] ?? 0
      const historial = await this.repository.findAll()
      const salarioLiquidadoMes = round2(
        historial
          .filter((item) => item.trabajadorId === dto.trabajadorId)
          .filter((item) => item.produccionIds.length === 0)
          .filter((item) => resolvePayrollMonthKey(item.fecha) === periodoNomina)
          .reduce((sum, item) => sum + item.montoAcciones, 0),
      )

      pendienteSalarioFijo = round2(Math.max(0, salarioFijo - salarioLiquidadoMes))

      if (pendienteSalarioFijo <= 0) {
        throw new DomainError(
          `El salario fijo de ${trabajador.nombre} ya fue liquidado para ${periodoNomina}.`,
          409,
          'PAGO_SALARIO_FIJO_DUPLICADO',
          {
            trabajadorId: trabajador.id,
            periodoNomina,
            salarioFijo,
            salarioLiquidadoMes,
          },
        )
      }

      if (round2(dto.montoAcciones) - pendienteSalarioFijo > 1e-6) {
        throw new DomainError(
          'El monto del salario fijo excede el pendiente del mes.',
          409,
          'PAGO_SALARIO_FIJO_EXCEDIDO',
          {
            trabajadorId: trabajador.id,
            periodoNomina,
            salarioFijo,
            salarioLiquidadoMes,
            pendienteSalarioFijo,
            solicitado: round2(dto.montoAcciones),
          },
        )
      }
    }

    const produccionesPorPagar: Array<{ id: string }> = []

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
        produccionesPorPagar.push({ id: item.id })
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
    }

    const created = await this.repository.create({
      ...dto,
      creadoPorId: actor.userId,
      creadoPorNombre: actor.userName,
    })

    const produccionesMarcadas: string[] = []

    try {
      for (const produccion of produccionesPorPagar) {
        const updated = await this.produccionTrabajadorRepository.update(produccion.id, { pagado: true })
        if (!updated) {
          throw new DomainError(
            `No se pudo actualizar la produccion ${produccion.id} como pagada.`,
            500,
            'PAGO_PRODUCCION_UPDATE_FAILED',
          )
        }
        produccionesMarcadas.push(produccion.id)
      }

      const pendientesProduccion = (await this.produccionTrabajadorRepository.findAll())
        .filter((item) => item.trabajadorId === dto.trabajadorId && !item.pagado)
        .reduce((sum, item) => sum + item.pagoFinal, 0)
      const acumuladoPendiente =
        trabajador.rol === 'Obrero'
          ? round2(pendientesProduccion)
          : round2(Math.max(0, pendienteSalarioFijo - round2(dto.montoAcciones)))

      const trabajadorActualizado = await this.trabajadorRepository.update(dto.trabajadorId, {
        pagosTotales: round2(trabajador.pagosTotales + dto.totalPagado),
        bonosTotales: round2(trabajador.bonosTotales + dto.montoBonos + dto.bonoExtra),
        acumuladoPendiente,
      })

      if (!trabajadorActualizado) {
        throw new DomainError(
          `No se pudo actualizar el trabajador ${dto.trabajadorId} despues del pago.`,
          500,
          'PAGO_TRABAJADOR_UPDATE_FAILED',
        )
      }

      return created
    } catch (error) {
      await Promise.all(
        produccionesMarcadas.map(async (produccionId) => {
          try {
            await this.produccionTrabajadorRepository.update(produccionId, { pagado: false })
          } catch {
            // Best effort rollback.
          }
        }),
      )
      await this.repository.delete(created.id).catch(() => undefined)
      throw error
    }
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

function resolvePayrollMonthKey(rawDate: string): string {
  const normalized = rawDate.trim()
  if (/^\d{4}-\d{2}/.test(normalized)) {
    return normalized.slice(0, 7)
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    throw new DomainError('La fecha del pago no es valida.', 400, 'PAGO_FECHA_INVALIDA')
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}
