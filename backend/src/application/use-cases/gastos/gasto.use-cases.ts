import type {
  BloqueRepositoryPort,
  GastoRepositoryPort,
  HistorialPagoRepositoryPort,
  TrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import type {
  CancelGastoDto,
  CreateGastoDto,
  GastoResponseDto,
  UpdateGastoDto,
} from '../../dtos/index.js'
import {
  buildCancelledGasto,
  buildManualGasto,
  buildUpdatedManualGasto,
  resolveGastoLedger,
  type GastoActor,
} from './gasto.helpers.js'

export class GetGastosUseCase {
  constructor(
    private readonly repository: GastoRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly historialPagoRepository: HistorialPagoRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
  ) {}

  async execute(): Promise<GastoResponseDto[]> {
    return resolveGastoLedger({
      gastoRepository: this.repository,
      bloqueRepository: this.bloqueRepository,
      historialPagoRepository: this.historialPagoRepository,
      trabajadorRepository: this.trabajadorRepository,
    })
  }
}

export class GetGastoByIdUseCase {
  constructor(
    private readonly repository: GastoRepositoryPort,
    private readonly bloqueRepository: BloqueRepositoryPort,
    private readonly historialPagoRepository: HistorialPagoRepositoryPort,
    private readonly trabajadorRepository: TrabajadorRepositoryPort,
  ) {}

  async execute(id: string): Promise<GastoResponseDto | null> {
    const ledger = await resolveGastoLedger({
      gastoRepository: this.repository,
      bloqueRepository: this.bloqueRepository,
      historialPagoRepository: this.historialPagoRepository,
      trabajadorRepository: this.trabajadorRepository,
    })
    return ledger.find((item) => item.id === id) ?? null
  }
}

export class CreateGastoUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(dto: CreateGastoDto, actor: GastoActor): Promise<GastoResponseDto> {
    return this.repository.create(buildManualGasto(dto, actor))
  }
}

export class UpdateGastoUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(id: string, dto: UpdateGastoDto): Promise<GastoResponseDto | null> {
    const current = await this.repository.findById(id)
    if (!current) return null
    return this.repository.update(id, buildUpdatedManualGasto(current, dto))
  }
}

export class CancelGastoUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(id: string, dto: CancelGastoDto, actor: GastoActor): Promise<GastoResponseDto | null> {
    const current = await this.repository.findById(id)
    if (!current) return null
    return this.repository.update(id, buildCancelledGasto(current, actor, dto.motivoAnulacion))
  }
}

export class DeleteGastoUseCase {
  constructor(private readonly repository: GastoRepositoryPort) {}

  async execute(id: string, actor: GastoActor): Promise<boolean> {
    const current = await this.repository.findById(id)
    if (!current) return false

    const cancelled = await this.repository.update(
      id,
      buildCancelledGasto(current, actor, 'Anulado desde la API de eliminacion.'),
    )
    return Boolean(cancelled)
  }
}
