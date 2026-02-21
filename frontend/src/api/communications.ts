import { apiClient } from './client'

export type MessageChannel = 'INTERNAL' | 'EMAIL' | 'WHATSAPP' | 'PHONE_NOTE'

export interface CommunicationMessage {
  id: string
  clientId: string
  client?: { id: string; name: string }
  senderId?: string
  sender?: { id: string; firstName: string; lastName: string }
  channel: MessageChannel
  subject?: string
  body: string
  isFromClient: boolean
  isRead: boolean
  readAt?: string
  processId?: string
  templateRef?: string
  sentAt: string
  createdAt: string
}

export interface UnreadCount {
  clientId: string
  clientName: string
  count: number
}

export const communicationsApi = {
  listForClient: (clientId: string, params?: { channel?: MessageChannel; page?: number; limit?: number }) =>
    apiClient.get<{ data: CommunicationMessage[]; total: number; page: number; totalPages: number }>(
      `/communications/client/${clientId}`, { params }
    ).then(r => r.data),

  send: (clientId: string, data: {
    channel: MessageChannel
    subject?: string
    body: string
    isFromClient?: boolean
    processId?: string
  }) => apiClient.post<CommunicationMessage>(`/communications/client/${clientId}`, data).then(r => r.data),

  markRead: (id: string) =>
    apiClient.patch<CommunicationMessage>(`/communications/${id}/read`, {}).then(r => r.data),

  unreadCounts: () =>
    apiClient.get<UnreadCount[]>('/communications/unread-count').then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/communications/${id}`).then(r => r.data),
}
