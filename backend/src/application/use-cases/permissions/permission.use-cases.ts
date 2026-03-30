import type { PermissionRepositoryPort } from '../../../domain/ports/index.js'
import type {
  CreatePermissionGroupDto,
  PermissionDefinitionDto,
  PermissionGroupDto,
  UpdatePermissionGroupDto,
  UpdateUserAccessDto,
  UserPermissionAccessDto,
} from '../../dtos/index.js'

export class GetPermissionDefinitionsUseCase {
  constructor(private readonly repository: PermissionRepositoryPort) {}

  async execute(): Promise<PermissionDefinitionDto[]> {
    return this.repository.listDefinitions()
  }
}

export class GetPermissionGroupsUseCase {
  constructor(private readonly repository: PermissionRepositoryPort) {}

  async execute(): Promise<PermissionGroupDto[]> {
    return this.repository.listGroups()
  }
}

export class CreatePermissionGroupUseCase {
  constructor(private readonly repository: PermissionRepositoryPort) {}

  async execute(dto: CreatePermissionGroupDto): Promise<PermissionGroupDto> {
    return this.repository.createGroup(dto)
  }
}

export class UpdatePermissionGroupUseCase {
  constructor(private readonly repository: PermissionRepositoryPort) {}

  async execute(id: string, dto: UpdatePermissionGroupDto): Promise<PermissionGroupDto | null> {
    return this.repository.updateGroup(id, dto)
  }
}

export class DeletePermissionGroupUseCase {
  constructor(private readonly repository: PermissionRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.deleteGroup(id)
  }
}

export class GetUserAccessListUseCase {
  constructor(private readonly repository: PermissionRepositoryPort) {}

  async execute(): Promise<UserPermissionAccessDto[]> {
    return this.repository.listUserAccess()
  }
}

export class UpdateUserAccessUseCase {
  constructor(private readonly repository: PermissionRepositoryPort) {}

  async execute(userId: string, dto: UpdateUserAccessDto): Promise<UserPermissionAccessDto | null> {
    return this.repository.updateUserAccess(userId, dto)
  }
}

