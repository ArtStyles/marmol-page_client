import type { AuthPort, PermissionRepositoryPort } from '../../../domain/ports/index.js'
import type { LoginRequestDto, LoginResponseDto } from '../../dtos/index.js'
import { issueAccessToken } from '../../services/token.service.js'

export class LoginUseCase {
  constructor(
    private readonly authPort: AuthPort,
    private readonly permissionPort: PermissionRepositoryPort,
  ) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto | null> {
    const user = await this.authPort.login(dto.email, dto.password, dto.workshopId)
    if (!user) return null

    const resolved = await this.permissionPort.resolveUserAccess(user.id, user.role)
    const userWithPermissions = {
      ...user,
      permissions: resolved.permissionCodes,
      permissionGroups: resolved.permissionGroupIds,
    }

    const { token, expiresIn } = issueAccessToken({
      userId: userWithPermissions.id,
      email: userWithPermissions.email,
      role: userWithPermissions.role,
      workshopId: userWithPermissions.workshopId,
      permissions: resolved.permissionCodes,
      permissionGroups: resolved.permissionGroupIds,
    })
    return {
      user: userWithPermissions,
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
    }
  }
}
