import type { AdminUser } from '../../domain/entities/index.js'

export interface LoginRequestDto {
  email: string
  password: string
  workshopId?: string
}

export interface LoginResponseDto {
  user: AdminUser
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}
