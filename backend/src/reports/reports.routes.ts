import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { ForbiddenError } from '../shared/errors'
import { STAFF_ROLES, ADMIN_ROLES } from '../shared/types'
import { UserRole } from '@prisma/client'

// Helper: Convert array of objects to CSV string
function toCSV(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const headerRow = headers.map(h => `"${h.label}"`).join(',')
  const dataRows = rows.map(row =>
    headers.map(h => {
      const val = row[h.key]
      if (val === null || val === undefined) return '""'
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n') // BOM for Excel Hebrew support
}

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  const requireStaff = (role: UserRole) => {
    if (!STAFF_ROLES.includes(role)) throw new ForbiddenError()
  }
  const requireAdmin = (role: UserRole) => {
    if (!ADMIN_ROLES.includes(role)) throw new ForbiddenError()
  }

  // GET /api/reports/clients – export clients list as CSV
  app.get('/clients', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { servicePlan: { select: { name: true } }, tags: true },
      orderBy: { name: 'asc' },
    })

    const rows = clients.map(c => ({
      name: c.name,
      taxId: c.taxId,
      clientType: c.clientType,
      email: c.email ?? '',
      phone: c.phone ?? '',
      city: c.city ?? '',
      vatFrequency: c.vatFrequency,
      hasPayroll: c.hasPayroll ? 'כן' : 'לא',
      servicePlan: c.servicePlan?.name ?? '',
      healthScore: c.healthScore ?? '',
      onboardedAt: c.onboardedAt ? new Date(c.onboardedAt).toLocaleDateString('he-IL') : '',
    }))

    const csv = toCSV(rows, [
      { key: 'name', label: 'שם לקוח' },
      { key: 'taxId', label: 'ת"ז/ח.פ' },
      { key: 'clientType', label: 'סוג לקוח' },
      { key: 'email', label: 'אימייל' },
      { key: 'phone', label: 'טלפון' },
      { key: 'city', label: 'עיר' },
      { key: 'vatFrequency', label: 'תדירות מע"מ' },
      { key: 'hasPayroll', label: 'שכר' },
      { key: 'servicePlan', label: 'חבילת שירות' },
      { key: 'healthScore', label: 'ציון בריאות' },
      { key: 'onboardedAt', label: 'תאריך קליטה' },
    ])

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="clients-${new Date().toISOString().slice(0,10)}.csv"`)
      .send(csv)
  })

  // GET /api/reports/billing – billing report as CSV
  app.get('/billing', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as { year?: string; isPaid?: string }
    const now = new Date()
    const year = parseInt(q.year ?? String(now.getFullYear()))

    const charges = await prisma.billingCharge.findMany({
      where: {
        chargeDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
        ...(q.isPaid !== undefined ? { isPaid: q.isPaid === 'true' } : {}),
      },
      include: { client: { select: { name: true, taxId: true } } },
      orderBy: { chargeDate: 'asc' },
    })

    const rows = charges.map(c => ({
      clientName: c.client.name,
      taxId: c.client.taxId,
      invoiceNumber: c.invoiceNumber ?? '',
      description: c.description,
      amount: c.amount.toFixed(2),
      vatAmount: c.vatAmount.toFixed(2),
      totalAmount: c.totalAmount.toFixed(2),
      chargeDate: new Date(c.chargeDate).toLocaleDateString('he-IL'),
      dueDate: new Date(c.dueDate).toLocaleDateString('he-IL'),
      isPaid: c.isPaid ? 'שולם' : 'טרם שולם',
      paidAt: c.paidAt ? new Date(c.paidAt).toLocaleDateString('he-IL') : '',
    }))

    const csv = toCSV(rows, [
      { key: 'clientName', label: 'לקוח' },
      { key: 'taxId', label: 'ת"ז/ח.פ' },
      { key: 'invoiceNumber', label: 'מספר חשבונית' },
      { key: 'description', label: 'תיאור' },
      { key: 'amount', label: 'סכום' },
      { key: 'vatAmount', label: 'מע"מ' },
      { key: 'totalAmount', label: 'סה"כ' },
      { key: 'chargeDate', label: 'תאריך חיוב' },
      { key: 'dueDate', label: 'תאריך פירעון' },
      { key: 'isPaid', label: 'סטטוס' },
      { key: 'paidAt', label: 'תאריך תשלום' },
    ])

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="billing-${year}.csv"`)
      .send(csv)
  })

  // GET /api/reports/processes – process instances report as CSV
  app.get('/processes', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as { year?: string; status?: string }
    const year = parseInt(q.year ?? String(new Date().getFullYear()))

    const instances = await prisma.processInstance.findMany({
      where: {
        periodYear: year,
        ...(q.status ? { status: q.status as never } : {}),
      },
      include: {
        client: { select: { name: true, taxId: true } },
        template: { select: { name: true } },
      },
      orderBy: [{ dueDate: 'asc' }],
    })

    const rows = instances.map(p => ({
      clientName: p.client.name,
      taxId: p.client.taxId,
      templateName: p.template.name,
      periodLabel: p.periodLabel,
      status: p.status,
      dueDate: new Date(p.dueDate).toLocaleDateString('he-IL'),
      isOverdue: p.isOverdue ? 'כן' : 'לא',
      overdueDays: p.overdueDays ?? '',
      submittedAt: p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('he-IL') : '',
      submissionRef: p.submissionRef ?? '',
    }))

    const csv = toCSV(rows, [
      { key: 'clientName', label: 'לקוח' },
      { key: 'taxId', label: 'ת"ז/ח.פ' },
      { key: 'templateName', label: 'סוג תהליך' },
      { key: 'periodLabel', label: 'תקופה' },
      { key: 'status', label: 'סטטוס' },
      { key: 'dueDate', label: 'דדליין' },
      { key: 'isOverdue', label: 'באיחור' },
      { key: 'overdueDays', label: 'ימי איחור' },
      { key: 'submittedAt', label: 'תאריך הגשה' },
      { key: 'submissionRef', label: 'אסמכתא' },
    ])

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="processes-${year}.csv"`)
      .send(csv)
  })

  // GET /api/reports/tax-payments – tax payments report as CSV
  app.get('/tax-payments', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as { year?: string; clientId?: string }
    const year = parseInt(q.year ?? String(new Date().getFullYear()))

    const payments = await prisma.taxPayment.findMany({
      where: {
        periodYear: year,
        ...(q.clientId ? { clientId: q.clientId } : {}),
      },
      include: { client: { select: { name: true, taxId: true } } },
      orderBy: [{ dueDate: 'asc' }],
    })

    const TYPE_LABELS: Record<string, string> = {
      VAT: 'מע"מ',
      INCOME_TAX_WITHHOLDING: 'ניכויים במקור',
      NATIONAL_INSURANCE: 'ביטוח לאומי',
      ADVANCE_PAYMENT: 'מקדמות מס',
      CORPORATE_TAX: 'מס חברות',
    }

    const rows = payments.map(p => ({
      clientName: p.client.name,
      taxId: p.client.taxId,
      paymentType: TYPE_LABELS[p.paymentType] ?? p.paymentType,
      periodYear: p.periodYear,
      periodMonth: p.periodMonth ?? '',
      amount: p.amount.toFixed(2),
      dueDate: new Date(p.dueDate).toLocaleDateString('he-IL'),
      isPaid: p.isPaid ? 'שולם' : 'טרם שולם',
      paidAt: p.paidAt ? new Date(p.paidAt).toLocaleDateString('he-IL') : '',
      referenceNumber: p.referenceNumber ?? '',
    }))

    const csv = toCSV(rows, [
      { key: 'clientName', label: 'לקוח' },
      { key: 'taxId', label: 'ח.פ/ת"ז' },
      { key: 'paymentType', label: 'סוג תשלום' },
      { key: 'periodYear', label: 'שנה' },
      { key: 'periodMonth', label: 'חודש' },
      { key: 'amount', label: 'סכום' },
      { key: 'dueDate', label: 'מועד תשלום' },
      { key: 'isPaid', label: 'סטטוס' },
      { key: 'paidAt', label: 'שולם בתאריך' },
      { key: 'referenceNumber', label: 'אסמכתא' },
    ])

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="tax-payments-${year}.csv"`)
      .send(csv)
  })

  // GET /api/reports/payroll-summary – payroll summary JSON (for dashboard)
  app.get('/payroll-summary', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as { year?: string; month?: string }
    const year = parseInt(q.year ?? String(new Date().getFullYear()))
    const month = parseInt(q.month ?? String(new Date().getMonth() + 1))

    const records = await prisma.payrollRecord.groupBy({
      by: ['clientId'],
      where: { periodYear: year, periodMonth: month },
      _sum: { grossSalary: true, netSalary: true, incomeTaxWithheld: true, nationalInsuranceEmpl: true, pensionEmployer: true },
      _count: { id: true },
    })

    const clientIds = records.map(r => r.clientId)
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    })
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]))

    const result = records.map(r => ({
      clientId: r.clientId,
      clientName: clientMap[r.clientId] ?? r.clientId,
      employeeCount: r._count.id,
      totalGross: r._sum.grossSalary ?? 0,
      totalNet: r._sum.netSalary ?? 0,
      form102Amount: (r._sum.incomeTaxWithheld ?? 0) + (r._sum.nationalInsuranceEmpl ?? 0),
      pensionEmployer: r._sum.pensionEmployer ?? 0,
    }))

    return reply.send({
      year, month,
      clientCount: result.length,
      totalGross: result.reduce((s, r) => s + r.totalGross, 0),
      totalNet: result.reduce((s, r) => s + r.totalNet, 0),
      totalForm102: result.reduce((s, r) => s + r.form102Amount, 0),
      clients: result,
    })
  })

  // GET /api/reports/kpi – key performance indicators
  app.get('/kpi', async (req, reply) => {
    requireAdmin((req.user as { role: UserRole }).role)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalClients,
      activeProcesses,
      overdueProcesses,
      openTasks,
      pendingDocuments,
      monthlyBilling,
      unpaidBilling,
      overduePayments,
    ] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.processInstance.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'READY_REVIEW', 'UNDER_REVIEW'] } } }),
      prisma.processInstance.count({ where: { isOverdue: true } }),
      prisma.task.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.document.count({ where: { status: 'PENDING' } }),
      prisma.billingCharge.aggregate({ where: { chargeDate: { gte: monthStart } }, _sum: { totalAmount: true } }),
      prisma.billingCharge.aggregate({ where: { isPaid: false }, _sum: { totalAmount: true } }),
      prisma.taxPayment.count({ where: { isPaid: false, dueDate: { lt: now } } }),
    ])

    return reply.send({
      totalClients,
      activeProcesses,
      overdueProcesses,
      overdueRate: activeProcesses > 0 ? Math.round((overdueProcesses / activeProcesses) * 100) : 0,
      openTasks,
      pendingDocuments,
      monthlyBillingTotal: monthlyBilling._sum.totalAmount ?? 0,
      totalUnpaidBilling: unpaidBilling._sum.totalAmount ?? 0,
      overduePayments,
    })
  })
}
