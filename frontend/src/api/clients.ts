import { apiClient } from './client'
import { Client, PaginatedResult } from '../types'

export const clientsApi = {
  list: (params?: { search?: string; clientType?: string; isActive?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResult<Client>>('/clients', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get<Client>(`/clients/${id}`).then(r => r.data),
  create: (data: Partial<Client>) =>
    apiClient.post<Client>('/clients', data).then(r => r.data),
  update: (id: string, data: Partial<Client>) =>
    apiClient.patch<Client>(`/clients/${id}`, data).then(r => r.data),
  health: (id: string) =>
    apiClient.get<{ score: number; color: string; recommendation: string; components: Record<string, number> }>(`/clients/${id}/health`).then(r => r.data),
}
