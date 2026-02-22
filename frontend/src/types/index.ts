export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'BOOKKEEPER' | 'OFFICE_MANAGER' | 'PAYROLL' | 'REVIEWER' | 'CLIENT_USER'

export type ClientType = 'OSEK_PATUR' | 'OSEK_MURSHE' | 'CHEVRA_BVM' | 'SHUTAFUT' | 'AMUTA' | 'KIBBUTZ' | 'INDIVIDUAL'

export type ProcessStatus = 'PENDING' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'READY_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'SUBMITTED' | 'CLOSED' | 'CANCELLED'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  phone?: string
  lastLoginAt?: string
}

export interface Client {
  id: string
  name: string
  legalName?: string
  taxId: string
  vatNumber?: string
  clientType: ClientType
  industry?: string
  email?: string
  phone?: string
  city?: string
  vatFrequency: string
  hasPayroll: boolean
  isActive: boolean
  isFrozen: boolean
  powerOfAttorneyActive: boolean
  healthScore?: number
  internalNotes?: string
  tags: { tag: string }[]
  contacts?: ClientContact[]
  servicePlan?: { name: string }
}

export interface ClientContact {
  id: string
  name: string
  role?: string
  email?: string
  phone?: string
  isPrimary: boolean
}

export interface ProcessInstance {
  id: string
  clientId: string
  periodLabel: string
  periodYear: number
  periodMonth?: number
  dueDate: string
  internalDueDate: string
  status: ProcessStatus
  isOverdue: boolean
  overdueDays?: number
  submittedAt?: string
  submissionRef?: string
  client: { id: string; name: string; clientType: ClientType }
  template: { id: string; name: string; processCode: string }
  steps?: ProcessStep[]
}

export interface ProcessStep {
  id: string
  status: string
  templateStep: { name: string; order: number; roleRequired?: string }
  assignee?: { id: string; firstName: string; lastName: string }
  completedAt?: string
  notes?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  taskType: string
  status: string
  priority: Priority
  clientId?: string
  processId?: string
  assigneeId?: string
  dueDate?: string
  completedAt?: string
  client?: { id: string; name: string }
  assignee?: { id: string; firstName: string; lastName: string }
}

export interface DashboardSummary {
  overdue: (ProcessInstance & { overdueDays: number })[]
  dueSoon: (ProcessInstance & { daysUntilDue: number })[]
  waitingClient: ProcessInstance[]
  readyForReview: ProcessInstance[]
  myTasks: Task[]
  teamLoad: TeamLoad[]
  overdueDebts: OverdueDebt[]
  counts: {
    overdue: number
    dueSoon: number
    waitingClient: number
    readyForReview: number
    myTasks: number
  }
}

export interface TeamLoad {
  user: { id: string; firstName: string; lastName: string; role: UserRole }
  total: number
  urgent: number
  overdue: number
}

export interface OverdueDebt {
  id: string
  description: string
  totalAmount: number
  dueDate: string
  client: { id: string; name: string }
}

export type DocumentStatus = 'RECEIVED' | 'VALID' | 'INVALID' | 'EXPIRED'

export interface Document {
  id: string
  clientId: string
  processId?: string
  fileName: string
  fileSize: number
  mimeType: string
  documentType: string
  description?: string
  periodYear?: number
  periodMonth?: number
  status: DocumentStatus
  invalidReason?: string
  retentionUntil?: string
  createdAt: string
  client?: { id: string; name: string }
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
