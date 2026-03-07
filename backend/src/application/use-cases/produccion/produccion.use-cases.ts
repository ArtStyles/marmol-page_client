import type {
  ProduccionRepositoryPort,
  ProduccionTrabajadorRepositoryPort,
} from '../../../domain/ports/index.js'
import type {
  CreateProduccionDto,
  UpdateProduccionDto,
  ProduccionResponseDto,
  CreateProduccionTrabajadorDto,
  UpdateProduccionTrabajadorDto,
  ProduccionTrabajadorResponseDto,
} from '../../dtos/index.js'

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
  constructor(private readonly repository: ProduccionRepositoryPort) {}

  async execute(dto: CreateProduccionDto): Promise<ProduccionResponseDto> {
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
