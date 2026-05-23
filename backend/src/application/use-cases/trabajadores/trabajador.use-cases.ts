import { DomainError } from '../../errors/domain.error.js'
import type { RolTrabajador } from '../../../domain/entities/index.js'
import type { TrabajadorRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateTrabajadorDto, UpdateTrabajadorDto, TrabajadorResponseDto } from '../../dtos/index.js'

const ROLES_TRABAJADOR: RolTrabajador[] = [
  'Administrador',
  'Gestor de Ventas',
  'Jefe de Almacen',
  'Jefe de Turno de Producción',
  'Obrero',
]

function assertNombre(nombre: unknown, context: string): void {
  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    throw new DomainError(`${context}: nombre es requerido.`)
  }
}

function assertEmail(email: unknown, context: string): void {
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new DomainError(`${context}: email es requerido.`)
  }
}

function assertRol(rol: unknown, context: string): void {
  if (!ROLES_TRABAJADOR.includes(rol as RolTrabajador)) {
    throw new DomainError(`${context}: rol invalido "${String(rol)}".`)
  }
}

export class GetTrabajadoresUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(): Promise<TrabajadorResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetTrabajadorByIdUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(id: string): Promise<TrabajadorResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateTrabajadorUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(dto: CreateTrabajadorDto): Promise<TrabajadorResponseDto> {
    assertNombre(dto.nombre, 'CreateTrabajador')
    assertEmail(dto.email, 'CreateTrabajador')
    assertRol(dto.rol, 'CreateTrabajador')
    return this.repository.create(dto)
  }
}

export class UpdateTrabajadorUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(id: string, dto: UpdateTrabajadorDto): Promise<TrabajadorResponseDto | null> {
    if (dto.nombre !== undefined) assertNombre(dto.nombre, 'UpdateTrabajador')
    if (dto.email !== undefined) assertEmail(dto.email, 'UpdateTrabajador')
    if (dto.rol !== undefined) assertRol(dto.rol, 'UpdateTrabajador')
    return this.repository.update(id, dto)
  }
}

export class DeleteTrabajadorUseCase {
  constructor(private readonly repository: TrabajadorRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
