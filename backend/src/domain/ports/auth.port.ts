import type { AdminUser } from '../entities/index.js'

export interface AuthPort {
  login(email: string, password: string, workshopId?: string): Promise<AdminUser | null>
}
