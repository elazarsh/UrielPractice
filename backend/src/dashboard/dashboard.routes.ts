import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { ForbiddenError } from '../shared/errors'
import { STAFF_ROLES } from '../shared/types'
import { UserRole } from '@prisma/client'
import { addDays, diffInDays } from '../shared/dateUtils'

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/dashboard/summary  – "פותחים את הבוקר"
  app.get('/summary', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const now       = new Date()
    const in7days   = addDays(now, 7)
    const in14days  = addDays(now, 14)

    const [overdue, dueSoon, waitingClient, readyForReview, myTasks, teamLoad, alerts] = await Promise.all([
      // 1. Overdue – חריגה
      prisma.processInstance.findMany({
        where: { isOverdue: true, status: { notIn: ['SUBMITTED', 'CLOSED', 'CANCELLED'] } },
        include: { client: { select: { id: true, name: true } }, template: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // 2. Due Soon – 14 ימים
      prisma.processInstance.findMany({
        where: { isOverdue: false, dueDate: { gte: now, lte: in14days }, status: { notIn: ['SUBMITTED', 'CLOSED', 'CANCELLED'] } },
        include: { client: { select: { id: true, name: true } }, template: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // 3. Waiting on client
      prisma.processInstance.findMany({
        where: { status: 'WAITING_CLIENT' },
        include: { client: { select: { id: true, name: true } }, template: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // 4. Ready for review
      prisma.processInstance.findMany({
        where: { status: 'READY_REVIEW' },
        include: { client: { select: { id: true, name: true } }, template: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // 5. My tasks
      prisma.task.findMany({
        where: { assigneeId: caller.sub, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 20,
      }),
      // 6. Team workload
      prisma.user.findMany({
        where: { isActive: true, role: { notIn: ['CLIENT_USER'] } },
        select: {
          id: true, firstName: true, lastName: true, role: true,
          assignedTasks: {
            where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
            select: { id: true, priority: true, dueDate: true },
          },
        },
      }),
      // 7. Alerts – חובות פתוחים + לקוחות בעייתיים
      prisma.billingCharge.findMany({
        where: { isPaid: false, dueDate: { lt: now } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
    ])

    // חישוב ימי חריגה
    const overdueEnriched = overdue.map(p => ({
      ...p,
      overdueDays: diffInDays(now, p.dueDate),
    }))

    const dueSoonEnriched = dueSoon.map(p => ({
      ...p,
      daysUntilDue: diffInDays(p.dueDate, now),
    }))

    const teamLoadSummary = teamLoad.map(u => ({
      user:     { id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role },
      total:    u.assignedTasks.length,
      urgent:   u.assignedTasks.filter(t => t.priority === 'URGENT').length,
      overdue:  u.assignedTasks.filter(t => t.dueDate && t.dueDate < now).length,
    }))

    return reply.send({
      overdue:        overdueEnriched,
      dueSoon:        dueSoonEnriched,
      waitingClient,
      readyForReview,
      myTasks,
      teamLoad:       teamLoadSummary,
      overdueDebts:   alerts,
      counts: {
        overdue:        overdue.length,
        dueSoon:        dueSoon.length,
        waitingClient:  waitingClient.length,
        readyForReview: readyForReview.length,
        myTasks:        myTasks.length,
      },
    })
  })

  // GET /api/dashboard/reports/overdue
  app.get('/reports/overdue', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const instances = await prisma.processInstance.findMany({
      where: { isOverdue: true, status: { notIn: ['SUBMITTED', 'CLOSED', 'CANCELLED'] } },
      include: {
        client:   { select: { id: true, name: true, clientType: true } },
        template: { select: { name: true, processCode: true } },
      },
      orderBy: { dueDate: 'asc' },
    })
    const now = new Date()
    return reply.send(instances.map(p => ({
      ...p,
      overdueDays: diffInDays(now, p.dueDate),
    })))
  })

  // POST /api/dashboard/recalc-overdue  – Job: עדכן isOverdue לכל התהליכים
  app.post('/recalc-overdue', async (req, reply) => {
    const caller = req.user as { role: UserRole }
    if (!['ADMIN', 'ACCOUNTANT'].includes(caller.role)) throw new ForbiddenError()
    const now = new Date()
    const result = await prisma.processInstance.updateMany({
      where: { dueDate: { lt: now }, status: { notIn: ['SUBMITTED', 'CLOSED', 'CANCELLED'] }, isOverdue: false },
      data:  { isOverdue: true },
    })
    const reset = await prisma.processInstance.updateMany({
      where: { dueDate: { gte: now }, isOverdue: true },
      data:  { isOverdue: false },
    })
    return reply.send({ updated: result.count, reset: reset.count })
  })
}
