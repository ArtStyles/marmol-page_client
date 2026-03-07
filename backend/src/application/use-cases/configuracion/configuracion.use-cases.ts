import type { ConfiguracionPort } from '../../../domain/ports/index.js'
import type { ConfiguracionResponseDto, UpdateConfiguracionDto } from '../../dtos/index.js'

export class GetConfiguracionUseCase {
  constructor(private readonly port: ConfiguracionPort) {}

  async execute(): Promise<ConfiguracionResponseDto> {
    return this.port.get()
  }
}

export class UpdateConfiguracionUseCase {
  constructor(private readonly port: ConfiguracionPort) {}

  async execute(dto: UpdateConfiguracionDto): Promise<ConfiguracionResponseDto> {
    const current = await this.port.get()
    const updated = { ...current, ...dto }
    return this.port.save(updated)
  }
}
