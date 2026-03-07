import type { AdminUser } from '../../domain/entities/index.js'

export interface LoginRequestDto {
  email: string
  password: string
}

export interface LoginResponseDto {
  user: AdminUser
}
