import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../shared/errors'
import { ADMIN_ROLES, STAFF_ROLES } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { UserRole } from '@prisma/client'

// ─────────────────────────────────────────────
// Role helpers
// ─────────────────────────────────────────────

const PAYROLL_ACCESS_ROLES: UserRole[] = ['ADMIN', 'ACCOUNTANT', 'PAYROLL']

function requirePayrollAccess(role: UserRole): void {
  if (!PAYROLL_ACCESS_ROLES.includes(role)) throw new ForbiddenError()
}

// ─────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────

const createEmployeeSchema = z.object({
  firstName:      z.string().min(1),
  lastName:       z.string().min(1),
  idNumber:       z.string().min(5),
  startDate:      z.string().datetime(),
  endDate:        z.string().datetime().optional(),
  monthlySalary:  z.number().positive().optional(),
  hourlyRate:     z.number().positive().optional(),
  pensionFund:    z.string().optional(),
  pensionPercent: z.number().min(0).max(100).optional(),
  bankAccount:    z.string().optional(),
  notes:          z.string().optional(),
})

const updateEmployeeSchema = createEmployeeSchema.partial().omit({ idNumber: true })

const createPayrollRecordSchema = z.object({
  employeeId:              z.string().uuid(),
  periodYear:              z.number().int().min(2000).max(2100),
  periodMonth:             z.number().int().min(1).max(12),
  grossSalary:             z.number().min(0),
  incomeTaxWithheld:       z.number().min(0),
  nationalInsuranceEmp:    z.number().min(0),
  nationalInsuranceEmpl:   z.number().min(0),
  pensionEmployee:         z.number().min(0),
  pensionEmployer:         z.number().min(0),
  netSalary:               z.number().min(0),
  workDays:                z.number().int().min(0).optional(),
  absenceDays:             z.number().int().min(0).optional(),
  notes:                   z.string().optional(),
})

// ─────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────

export async function payrollRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // ════════════════════════════════════════════
  // EMPLOYEE CRUD
  // ════════════════════════════════════════════

  // ── GET /api/payroll/client/:clientId/employees ──────────────────────────────
  // List employees for a client, with optional isActive filter.
  app.get('/client/:clientId/employees', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requirePayrollAccess(caller.role)

    const { clientId } = req.params as { clientId: string }
    const q = req.query as { isActive?: string }

    const where: Record<string, unknown> = { clientId }
    if (q.isActive !== undefined) where.isActive = q.isActive === 'true'

    const employees = await prisma.employee.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    })

    return reply.send(employees)
  })

  // ── POST /api/payroll/client/:clientId/employees ─────────────────────────────
  // Create a new employee for a client. clientId+idNumber must be unique.
  app.post('/client/:clientId/employees', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requirePayrollAccess(caller.role)

    const { clientId } = req.params as { clientId: string }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) throw new NotFoundError('לקוח', clientId)

    const body = createEmployeeSchema.parse(req.body)

    const existing = await prisma.employee.findUnique({
      where: { clientId_idNumber: { clientId, idNumber: body.idNumber } },
    })
    if (existing) throw new ConflictError(`עובד עם ת"ז '${body.idNumber}' כבר קיים אצל לקוח זה`)

    const employee = await prisma.employee.create({
      data: {
        clientId,
        firstName:      body.firstName,
        lastName:       body.lastName,
        idNumber:       body.idNumber,
        startDate:      new Date(body.startDate),
        endDate:        body.endDate ? new Date(body.endDate) : undefined,
        monthlySalary:  body.monthlySalary,
        hourlyRate:     body.hourlyRate,
        pensionFund:    body.pensionFund,
        pensionPercent: body.pensionPercent,
        bankAccount:    body.bankAccount,
        notes:          body.notes,
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId,
      action:     'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId:   employee.id,
      after:      employee,
    })

    return reply.status(201).send(employee)
  })

  // ── PATCH /api/payroll/employees/:id ────────────────────────────────────────
  // Update employee details (except idNumber which is immutable).
  app.patch('/employees/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requirePayrollAccess(caller.role)

    const { id } = req.params as { id: string }
    const body    = updateEmployeeSchema.parse(req.body)

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('עובד', id)

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        firstName:      body.firstName,
        lastName:       body.lastName,
        startDate:      body.startDate ? new Date(body.startDate) : undefined,
        endDate:        body.endDate   ? new Date(body.endDate)   : undefined,
        monthlySalary:  body.monthlySalary,
        hourlyRate:     body.hourlyRate,
        pensionFund:    body.pensionFund,
        pensionPercent: body.pensionPercent,
        bankAccount:    body.bankAccount,
        notes:          body.notes,
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId:   existing.clientId,
      action:     'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId:   id,
      before:     existing,
      after:      updated,
    })

    return reply.send(updated)
  })

  // ── DELETE /api/payroll/employees/:id ───────────────────────────────────────
  // Soft-delete an employee: set isActive=false and endDate=now.
  app.delete('/employees/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requirePayrollAccess(caller.role)

    const { id } = req.params as { id: string }

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('עובד', id)
    if (!existing.isActive) throw new BadRequestError('עובד זה כבר מסומן כלא פעיל')

    const now     = new Date()
    const updated = await prisma.employee.update({
      where: { id },
      data:  { isActive: false, endDate: existing.endDate ?? now },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId:   existing.clientId,
      action:     'EMPLOYEE_DEACTIVATED',
      entityType: 'Employee',
      entityId:   id,
      before:     existing,
      after:      updated,
    })

    return reply.status(204).send()
  })

  // ════════════════════════════════════════════
  // PAYROLL RECORDS
  // ════════════════════════════════════════════

  // ── GET /api/payroll/client/:clientId/records ────────────────────────────────
  // List payroll records for a client with optional year/month/employee filters.
  app.get('/client/:clientId/records', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requirePayrollAccess(caller.role)

    const { clientId } = req.params as { clientId: string }
    const q = req.query as {
      year?:       string
      month?:      string
      employeeId?: string
    }

    const where: Record<string, unknown> = { clientId }
    if (q.year)       where.periodYear  = parseInt(q.year)
    if (q.month)      where.periodMonth = parseInt(q.month)
    if (q.employeeId) where.employeeId  = q.employeeId

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, idNumber: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { employee: { lastName: 'asc' } }],
    })

    return reply.send(records)
  })

  // ── POST /api/payroll/client/:clientId/records ──────────────────────────────
  // Create a payroll record. Unique per employeeId+periodYear+periodMonth.
  app.post('/client/:clientId/records', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requirePayrollAccess(caller.role)

    const { clientId } = req.params as { clientId: string }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) throw new NotFoundError('לקוח', clientId)

    const body = createPayrollRecordSchema.parse(req.body)

    // Verify the employee belongs to this client
    const employee = await prisma.employee.findUnique({ where: { id: body.employeeId } })
    if (!employee || employee.clientId !== clientId) throw new NotFoundError('עובד', body.employeeId)

    // Enforce unique constraint: employeeId + periodYear + periodMonth
    const duplicate = await prisma.payrollRecord.findUnique({
      where: {
        employeeId_periodYear_periodMonth: {
          employeeId:  body.employeeId,
          periodYear:  body.periodYear,
          periodMonth: body.periodMonth,
        },
      },
    })
    if (duplicate) {
      throw new ConflictError(
        `רשומת שכר לעובד זה לתקופה ${body.periodMonth}/${body.periodYear} כבר קיימת`,
      )
    }

    const record = await prisma.payrollRecord.create({
      data: {
        clientId,
        employeeId:            body.employeeId,
        periodYear:            body.periodYear,
        periodMonth:           body.periodMonth,
        grossSalary:           body.grossSalary,
        incomeTaxWithheld:     body.incomeTaxWithheld,
        nationalInsuranceEmp:  body.nationalInsuranceEmp,
        nationalInsuranceEmpl: body.nationalInsuranceEmpl,
        pensionEmployee:       body.pensionEmployee,
        pensionEmployer:       body.pensionEmployer,
        netSalary:             body.netSalary,
        workDays:              body.workDays,
        absenceDays:           body.absenceDays,
        notes:                 body.notes,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, idNumber: true } },
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId,
      action:     'PAYROLL_RECORD_CREATED',
      entityType: 'PayrollRecord',
      entityId:   record.id,
      after:      record,
    })

    return reply.status(201).send(record)
  })

  // ── GET /api/payroll/client/:clientId/summary/:year/:month ──────────────────
  // Aggregate payroll summary for a given period.
  // Totals: gross, net, employer costs, employee count, form-102 amount.
  app.get('/client/:clientId/summary/:year/:month', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requirePayrollAccess(caller.role)

    const { clientId, year, month } = req.params as {
      clientId: string
      year:     string
      month:    string
    }

    const periodYear  = parseInt(year)
    const periodMonth = parseInt(month)

    if (isNaN(periodYear) || isNaN(periodMonth) || periodMonth < 1 || periodMonth > 12) {
      throw new BadRequestError('שנה או חודש לא תקינים')
    }

    const records = await prisma.payrollRecord.findMany({
      where: { clientId, periodYear, periodMonth },
    })

    const employeeCount    = records.length
    const totalGross       = records.reduce((sum, r) => sum + r.grossSalary,           0)
    const totalNet         = records.reduce((sum, r) => sum + r.netSalary,             0)
    // Employer costs = employer national insurance + employer pension contributions
    const totalEmployerNI  = records.reduce((sum, r) => sum + r.nationalInsuranceEmpl, 0)
    const totalEmployerPension = records.reduce((sum, r) => sum + r.pensionEmployer,   0)
    const totalEmployerCosts   = totalGross + totalEmployerNI + totalEmployerPension

    // Form 102 amount = income tax withheld + employee NI + employer NI
    const totalForm102 = records.reduce(
      (sum, r) => sum + r.incomeTaxWithheld + r.nationalInsuranceEmp + r.nationalInsuranceEmpl,
      0,
    )

    return reply.send({
      clientId,
      periodYear,
      periodMonth,
      employeeCount,
      totalGross,
      totalNet,
      totalEmployerCosts,
      totalForm102,
      breakdown: {
        totalIncomeTaxWithheld:     records.reduce((s, r) => s + r.incomeTaxWithheld,     0),
        totalNationalInsuranceEmp:  records.reduce((s, r) => s + r.nationalInsuranceEmp,  0),
        totalNationalInsuranceEmpl: records.reduce((s, r) => s + r.nationalInsuranceEmpl, 0),
        totalPensionEmployee:       records.reduce((s, r) => s + r.pensionEmployee,        0),
        totalPensionEmployer:       records.reduce((s, r) => s + r.pensionEmployer,        0),
      },
    })
  })
}
