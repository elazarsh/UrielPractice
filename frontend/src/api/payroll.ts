import { apiClient } from './client'

export interface Employee {
  id: string
  clientId: string
  firstName: string
  lastName: string
  idNumber: string
  startDate: string
  endDate?: string
  monthlySalary?: number
  hourlyRate?: number
  pensionFund?: string
  pensionPercent?: number
  isActive: boolean
  bankAccount?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PayrollRecord {
  id: string
  clientId: string
  employeeId: string
  employee?: { id: string; firstName: string; lastName: string }
  periodYear: number
  periodMonth: number
  grossSalary: number
  incomeTaxWithheld: number
  nationalInsuranceEmp: number
  nationalInsuranceEmpl: number
  pensionEmployee: number
  pensionEmployer: number
  netSalary: number
  workDays?: number
  absenceDays?: number
  notes?: string
  processId?: string
  createdAt: string
  updatedAt: string
}

export interface PayrollSummary {
  totalGross: number
  totalNet: number
  totalEmployerCost: number
  employeeCount: number
  form102Amount: number
}

export const payrollApi = {
  listEmployees: (clientId: string, params?: { isActive?: string }) =>
    apiClient.get<Employee[]>(`/payroll/client/${clientId}/employees`, { params }).then(r => r.data),

  createEmployee: (clientId: string, data: Omit<Employee, 'id' | 'clientId' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean }) =>
    apiClient.post<Employee>(`/payroll/client/${clientId}/employees`, data).then(r => r.data),

  updateEmployee: (id: string, data: Partial<Employee>) =>
    apiClient.patch<Employee>(`/payroll/employees/${id}`, data).then(r => r.data),

  deactivateEmployee: (id: string) =>
    apiClient.delete<Employee>(`/payroll/employees/${id}`).then(r => r.data),

  listRecords: (clientId: string, params?: { year?: number; month?: number; employeeId?: string }) =>
    apiClient.get<PayrollRecord[]>(`/payroll/client/${clientId}/records`, { params }).then(r => r.data),

  createRecord: (clientId: string, data: Omit<PayrollRecord, 'id' | 'clientId' | 'employee' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<PayrollRecord>(`/payroll/client/${clientId}/records`, data).then(r => r.data),

  summary: (clientId: string, year: number, month: number) =>
    apiClient.get<PayrollSummary>(`/payroll/client/${clientId}/summary/${year}/${month}`).then(r => r.data),
}
