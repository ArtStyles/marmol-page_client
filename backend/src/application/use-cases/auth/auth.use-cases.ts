import type { AuthPort } from '../../../domain/ports/index.js'
import type { LoginRequestDto, LoginResponseDto } from '../../dtos/index.js'
import { issueAccessToken } from '../../services/token.service.js'

export class LoginUseCase {
  constructor(private readonly port: AuthPort) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto | null> {
    const user = await this.port.login(dto.email, dto.password, dto.workshopId)
    if (!user) return null
    const { token, expiresIn } = issueAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      workshopId: user.workshopId,
    })
    return {
      user,
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
    }
  }
}
