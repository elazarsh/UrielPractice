import { apiClient } from './client'
import { ProcessInstance } from '../types'

export const processesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<{ data: ProcessInstance[]; total: number }>('/process-instances', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get<ProcessInstance>(`/process-instances/${id}`).then(r => r.data),
  updateStatus: (id: string, body: { status: string; submissionRef?: string; submissionNotes?: string; postponedTo?: string; postponedReason?: string }) =>
    apiClient.patch<ProcessInstance>(`/process-instances/${id}/status`, body).then(r => r.data),
  updateStep: (id: string, stepId: string, body: { status?: string; assigneeId?: string; notes?: string; checklistDone?: Record<string, boolean> }) =>
    apiClient.patch(`/process-instances/${id}/steps/${stepId}`, body).then(r => r.data),
}
