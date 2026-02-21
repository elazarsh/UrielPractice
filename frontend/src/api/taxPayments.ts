import { apiClient } from './client'

export type TaxPaymentType = 'VAT' | 'INCOME_TAX_WITHHOLDING' | 'NATIONAL_INSURANCE' | 'ADVANCE_PAYMENT' | 'CORPORATE_TAX'

export interface TaxPayment {
  id: string
  clientId: string
  client?: { id: string; name: string }
  processId?: string
  paymentType: TaxPaymentType
  periodYear: number
  periodMonth?: number
  amount: number
  vatAmount?: number
  referenceNumber?: string
  dueDate: string
  isPaid: boolean
  paidAt?: string
  paidById?: string
  bankBranch?: string
  notes?: string
  daysOverdue?: number
  daysUntilDue?: number
  createdAt: string
  updatedAt: string
}

export const TAX_PAYMENT_TYPE_LABELS: Record<TaxPaymentType, string> = {
  VAT: 'מע"מ',
  INCOME_TAX_WITHHOLDING: 'ניכויים במקור (102)',
  NATIONAL_INSURANCE: 'ביטוח לאומי',
  ADVANCE_PAYMENT: 'מקדמות מס הכנסה',
  CORPORATE_TAX: 'מס חברות',
}

export const taxPaymentsApi = {
  listForClient: (clientId: string, params?: { year?: number; paymentType?: TaxPaymentType; isPaid?: string }) =>
    apiClient.get<TaxPayment[]>(`/tax-payments/client/${clientId}`, { params }).then(r => r.data),

  create: (clientId: string, data: {
    paymentType: TaxPaymentType
    periodYear: number
    periodMonth?: number
    amount: number
    vatAmount?: number
    referenceNumber?: string
    dueDate: string
    notes?: string
  }) => apiClient.post<TaxPayment>(`/tax-payments/client/${clientId}`, data).then(r => r.data),

  update: (id: string, data: { amount?: number; referenceNumber?: string; notes?: string; dueDate?: string }) =>
    apiClient.patch<TaxPayment>(`/tax-payments/${id}`, data).then(r => r.data),

  markPaid: (id: string, data?: { paidAt?: string; paidById?: string; bankBranch?: string; referenceNumber?: string }) =>
    apiClient.post<TaxPayment>(`/tax-payments/${id}/mark-paid`, data ?? {}).then(r => r.data),

  upcoming: () =>
    apiClient.get<TaxPayment[]>('/tax-payments/upcoming').then(r => r.data),

  overdue: () =>
    apiClient.get<TaxPayment[]>('/tax-payments/overdue').then(r => r.data),
}
