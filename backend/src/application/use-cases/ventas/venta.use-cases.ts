import type { VentaRepositoryPort } from '../../../domain/ports/index.js'
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
  constructor(private readonly repository: VentaRepositoryPort) {}

  async execute(dto: CreateVentaDto): Promise<VentaResponseDto> {
    return this.repository.create(dto)
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
