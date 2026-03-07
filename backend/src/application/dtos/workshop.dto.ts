import type { WorkshopTenant } from '../../domain/entities/index.js'
import type { WorkshopCreateInput } from '../../domain/ports/index.js'

export type CreateWorkshopDto = WorkshopCreateInput
export type UpdateWorkshopDto = Partial<Omit<WorkshopTenant, 'id'>>
export type WorkshopResponseDto = WorkshopTenant
