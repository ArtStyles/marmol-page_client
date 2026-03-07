import type { AuthPort } from '../../../domain/ports/index.js'
import { loginAdmin } from '../../../store/index.js'

export class InMemoryAuthAdapter implements AuthPort {
  async login(email: string, password: string) {
    return loginAdmin(email, password)
  }
}
