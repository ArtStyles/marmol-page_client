import type { AuthPort } from '../../../domain/ports/index.js'
import type { LoginRequestDto, LoginResponseDto } from '../../dtos/index.js'

export class LoginUseCase {
  constructor(private readonly port: AuthPort) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto | null> {
    const user = await this.port.login(dto.email, dto.password)
    if (!user) return null
    return { user }
  }
}
