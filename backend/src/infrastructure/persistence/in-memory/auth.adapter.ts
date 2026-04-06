import type { AuthPort } from '../../../domain/ports/index.js'
import { normalizeAdminRole } from '../../../application/security/role-normalization.js'
import { getTrabajadores, loginAdmin } from '../../../store/index.js'
import { getActiveWorkshopId } from '../../tenant/tenant-context.js'

export class InMemoryAuthAdapter implements AuthPort {
  async login(identifier: string, password: string, workshopId?: string) {
    const adminUser = loginAdmin(identifier, password, workshopId)
    if (adminUser) return adminUser

    const activeWorkshopId = getActiveWorkshopId()
    const scopedWorkshopId = workshopId ?? activeWorkshopId
    const worker = getTrabajadores().find(
      (item) =>
        item.estado === 'activo' &&
        Boolean(item.contrasena) &&
        item.contrasena === password &&
        (item.email.toLowerCase() === identifier.toLowerCase() ||
          (item.usuario ?? '').toLowerCase() === identifier.toLowerCase()) &&
        scopedWorkshopId === activeWorkshopId,
    )

    if (!worker) return null

    return {
      id: `TRA-${worker.id}`,
      name: worker.nombre,
      email: worker.email,
      role: normalizeAdminRole(worker.rol),
      workshopId: scopedWorkshopId,
    }
  }
}
