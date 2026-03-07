import type { AdminUser } from '../entities/index.js'

export interface AuthPort {
  login(email: string, password: string): Promise<AdminUser | null>
}
