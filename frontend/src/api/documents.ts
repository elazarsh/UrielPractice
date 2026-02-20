import { apiClient } from './client'
import { Document, PaginatedResult } from '../types'

export const documentsApi = {
  list: (params?: Record<string, string | undefined>) =>
    apiClient.get<PaginatedResult<Document>>('/documents', { params }).then(r => r.data),
  missing: (processId: string) =>
    apiClient.get<{ documentType: string; description?: string; notes?: string }[]>('/documents/missing', { params: { processId } }).then(r => r.data),
  updateStatus: (id: string, status: string, invalidReason?: string) =>
    apiClient.patch<Document>(`/documents/${id}/status`, { status, invalidReason }).then(r => r.data),
}
