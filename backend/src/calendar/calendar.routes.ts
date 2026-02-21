import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { ForbiddenError } from '../shared/errors'
import { STAFF_ROLES } from '../shared/types'
import { UserRole } from '@prisma/client'

export async function calendarRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  const requireStaff = (role: UserRole) => {
    if (!STAFF_ROLES.includes(role)) throw new ForbiddenError()
  }

  // GET /api/calendar/events – unified calendar events
  // Returns process deadlines + tax payment deadlines + Israeli holidays
  app.get('/events', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as { from?: string; to?: string; clientId?: string }

    const from = q.from ? new Date(q.from) : new Date(new Date().setDate(1)) // start of current month
    const to = q.to ? new Date(q.to) : new Date(new Date().setMonth(new Date().getMonth() + 2, 0)) // end of next month

    const [processes, taxPayments, holidays] = await Promise.all([
      prisma.processInstance.findMany({
        where: {
          dueDate: { gte: from, lte: to },
          status: { notIn: ['CLOSED', 'CANCELLED'] },
          ...(q.clientId ? { clientId: q.clientId } : {}),
        },
        include: {
          client: { select: { id: true, name: true } },
          template: { select: { name: true, processCode: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 500,
      }),
      prisma.taxPayment.findMany({
        where: {
          dueDate: { gte: from, lte: to },
          isPaid: false,
          ...(q.clientId ? { clientId: q.clientId } : {}),
        },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 500,
      }),
      prisma.israeliHoliday.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      }),
    ])

    const events = [
      ...processes.map(p => ({
        id: `proc-${p.id}`,
        type: 'process' as const,
        date: p.dueDate.toISOString(),
        internalDate: p.internalDueDate.toISOString(),
        title: `${p.template.name} – ${p.periodLabel}`,
        clientId: p.clientId,
        clientName: p.client.name,
        status: p.status,
        isOverdue: p.isOverdue,
        color: p.isOverdue ? '#ef4444' : p.status === 'APPROVED' ? '#22c55e' : '#3b82f6',
        entityId: p.id,
      })),
      ...taxPayments.map(tp => ({
        id: `tax-${tp.id}`,
        type: 'tax_payment' as const,
        date: tp.dueDate.toISOString(),
        internalDate: tp.dueDate.toISOString(),
        title: `${tp.paymentType} – ${tp.client.name}`,
        clientId: tp.clientId,
        clientName: tp.client.name,
        status: tp.isPaid ? 'paid' : 'pending',
        isOverdue: new Date(tp.dueDate) < new Date() && !tp.isPaid,
        color: new Date(tp.dueDate) < new Date() ? '#f97316' : '#8b5cf6',
        entityId: tp.id,
      })),
      ...holidays.map(h => ({
        id: `holiday-${h.id}`,
        type: 'holiday' as const,
        date: h.date.toISOString(),
        internalDate: h.date.toISOString(),
        title: h.name,
        clientId: null,
        clientName: null,
        status: 'holiday',
        isOverdue: false,
        color: '#f59e0b',
        entityId: h.id,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return reply.send({
      from: from.toISOString(),
      to: to.toISOString(),
      totalEvents: events.length,
      events,
    })
  })

  // GET /api/calendar/deadlines-summary – summary of deadlines by week
  app.get('/deadlines-summary', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + 30)

    const [processes, taxPayments] = await Promise.all([
      prisma.processInstance.findMany({
        where: {
          dueDate: { gte: from, lte: to },
          status: { notIn: ['CLOSED', 'CANCELLED', 'SUBMITTED'] },
        },
        select: { dueDate: true, status: true, isOverdue: true },
      }),
      prisma.taxPayment.findMany({
        where: { dueDate: { gte: from, lte: to }, isPaid: false },
        select: { dueDate: true, paymentType: true },
      }),
    ])

    // Group by week
    const weeks: Record<string, { processCount: number; taxCount: number; overdueCount: number }> = {}
    for (const p of processes) {
      const d = new Date(p.dueDate)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      if (!weeks[key]) weeks[key] = { processCount: 0, taxCount: 0, overdueCount: 0 }
      weeks[key].processCount++
      if (p.isOverdue) weeks[key].overdueCount++
    }
    for (const tp of taxPayments) {
      const d = new Date(tp.dueDate)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      if (!weeks[key]) weeks[key] = { processCount: 0, taxCount: 0, overdueCount: 0 }
      weeks[key].taxCount++
    }

    const weeksSorted = Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, counts]) => ({ weekStart, ...counts }))

    return reply.send({ weeks: weeksSorted })
  })

  // POST /api/calendar/holidays – seed Israeli holidays for a year
  app.post('/holidays', async (req, reply) => {
    const body = req.body as { holidays: Array<{ date: string; name: string; hebrewYear?: number; isWorkingDay?: boolean }> }
    const created = await Promise.all(
      body.holidays.map(h =>
        prisma.israeliHoliday.upsert({
          where: { date: new Date(h.date) },
          update: { name: h.name },
          create: {
            date: new Date(h.date),
            name: h.name,
            hebrewYear: h.hebrewYear,
            isWorkingDay: h.isWorkingDay ?? false,
          },
        })
      )
    )
    return reply.send({ created: created.length })
  })
}
