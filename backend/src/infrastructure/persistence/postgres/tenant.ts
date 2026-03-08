import { getActiveWorkshopId } from '../../tenant/tenant-context.js'

export function getCurrentWorkshopId(): string {
  return getActiveWorkshopId()
}
