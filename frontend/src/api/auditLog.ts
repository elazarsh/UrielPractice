import { apiClient } from './client'

export interface AuditLog {
  id: string
  userId?: string
  user?: { id: string; firstName: string; lastName: string; email: string }
  clientId?: string
  client?: { id: string; name: string }
  action: string
  entityType: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  source: string
  ipAddress?: string
  userAgent?: string
  notes?: string
  createdAt: string
}

export const auditLogApi = {
  list: (params?: {
    userId?: string
    clientId?: string
    entityType?: string
    action?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  }) => apiClient.get<{ data: AuditLog[]; total: number; page: number; totalPages: number }>('/audit-logs', { params }).then(r => r.data),

  listForClient: (clientId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<{ data: AuditLog[]; total: number; page: number; totalPages: number }>(
      `/audit-logs/client/${clientId}`, { params }
    ).then(r => r.data),

  listForEntity: (entityType: string, entityId: string) =>
    apiClient.get<AuditLog[]>(`/audit-logs/entity/${entityType}/${entityId}`).then(r => r.data),

  getActions: () =>
    apiClient.get<string[]>('/audit-logs/actions').then(r => r.data),
}
