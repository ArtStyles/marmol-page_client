import type { AdminUser } from './admin-auth'
import type { WorkshopCreateInput, WorkshopTenant } from './workshops'
import { apiRequest } from './api-client'

export type LoginRequest = {
  email: string
  password: string
  workshopId?: string
}

export type LoginResponse = {
  user: AdminUser
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export const loginAdmin = (input: LoginRequest): Promise<LoginResponse> =>
  apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuth: true,
  })

export const getWorkshops = (): Promise<WorkshopTenant[]> =>
  apiRequest<WorkshopTenant[]>('/workshops')

export const createWorkshop = (input: WorkshopCreateInput): Promise<WorkshopTenant> =>
  apiRequest<WorkshopTenant>('/workshops', {
    method: 'POST',
    body: input,
  })

export const updateWorkshop = (
  workshopId: string,
  patch: Partial<WorkshopTenant>,
): Promise<WorkshopTenant | null> =>
  apiRequest<WorkshopTenant>(`/workshops/${workshopId}`, {
    method: 'PATCH',
    body: patch,
  })

export const deleteWorkshop = async (workshopId: string): Promise<boolean> => {
  await apiRequest<void>(`/workshops/${workshopId}`, {
    method: 'DELETE',
  })
  return true
}
