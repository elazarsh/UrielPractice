import { apiClient } from './client'
import { Task, PaginatedResult } from '../types'

export const tasksApi = {
  list: (params?: Record<string, string | boolean | number | undefined>) =>
    apiClient.get<PaginatedResult<Task>>('/tasks', { params }).then(r => r.data),
  workload: () =>
    apiClient.get('/tasks/workload').then(r => r.data),
  create: (data: Partial<Task>) =>
    apiClient.post<Task>('/tasks', data).then(r => r.data),
  update: (id: string, data: Partial<Task> & { status?: string }) =>
    apiClient.patch<Task>(`/tasks/${id}`, data).then(r => r.data),
}
