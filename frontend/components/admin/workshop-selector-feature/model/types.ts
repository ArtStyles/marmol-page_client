import type { AdminUser } from '@/lib/admin-auth'
import type { WorkshopCreateInput, WorkshopTenant } from '@/lib/workshops'

export type AdminWorkshopSelectorProps = {
  user: AdminUser
  workshops: WorkshopTenant[]
  onSelect: (workshopId: string) => void
  onCreate: (input: WorkshopCreateInput) => void
  onToggleStatus: (workshopId: string) => void
  onDelete: (workshopId: string) => void
  onLogout: () => void
}
