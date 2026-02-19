import { UserRole } from '@prisma/client'

export interface JwtPayload {
  sub:   string   // user id
  email: string
  role:  UserRole
  type:  'access' | 'refresh'
}

export interface PaginationParams {
  page:  number
  limit: number
}

export interface PaginatedResult<T> {
  data:       T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data:       items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

// רולים שרשאים לבצע פעולות אדמין
export const ADMIN_ROLES: UserRole[] = ['ADMIN']
export const STAFF_ROLES: UserRole[] = ['ADMIN', 'ACCOUNTANT', 'BOOKKEEPER', 'OFFICE_MANAGER', 'PAYROLL', 'REVIEWER']
export const REVIEWER_ROLES: UserRole[] = ['ADMIN', 'ACCOUNTANT', 'REVIEWER']
