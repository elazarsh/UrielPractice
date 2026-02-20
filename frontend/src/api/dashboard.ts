import { apiClient } from './client'
import { DashboardSummary } from '../types'

export const dashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary').then(r => r.data),
  recalcOverdue: () => apiClient.post('/dashboard/recalc-overdue').then(r => r.data),
}
