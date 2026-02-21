import { apiClient } from './client'

export interface BillingCharge {
  id: string
  clientId: string
  client?: { id: string; name: string }
  description: string
  amount: number
  vatAmount: number
  totalAmount: number
  currency: string
  chargeDate: string
  dueDate: string
  isPaid: boolean
  paidAt?: string
  invoiceNumber?: string
  notes?: string
  createdAt: string
  payments?: Payment[]
}

export interface Payment {
  id: string
  chargeId: string
  amount: number
  method?: string
  reference?: string
  paidAt: string
  notes?: string
  createdAt: string
}

export interface BillingSummary {
  totalCharged: number
  totalPaid: number
  totalUnpaid: number
  overdueCount: number
}

export const billingApi = {
  list: (params?: { clientId?: string; isPaid?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: BillingCharge[]; total: number; page: number; totalPages: number }>('/billing', { params }).then(r => r.data),

  listForClient: (clientId: string) =>
    apiClient.get<BillingCharge[]>(`/billing/client/${clientId}`).then(r => r.data),

  createCharge: (clientId: string, data: {
    description: string
    amount: number
    chargeDate: string
    dueDate: string
    notes?: string
  }) => apiClient.post<BillingCharge>(`/billing/client/${clientId}/charges`, data).then(r => r.data),

  bulkMonthly: (data: { year: number; month: number; description?: string }) =>
    apiClient.post<{ created: number; skipped: number }>('/billing/client/all/charges/bulk-monthly', data).then(r => r.data),

  updateCharge: (id: string, data: { notes?: string; dueDate?: string }) =>
    apiClient.patch<BillingCharge>(`/billing/charges/${id}`, data).then(r => r.data),

  recordPayment: (chargeId: string, data: {
    amount: number
    method?: string
    reference?: string
    paidAt?: string
    notes?: string
  }) => apiClient.post<Payment>(`/billing/charges/${chargeId}/pay`, data).then(r => r.data),

  summary: () =>
    apiClient.get<BillingSummary>('/billing/summary').then(r => r.data),
}
