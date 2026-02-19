import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError, ValidationError } from '../shared/errors'
import { STAFF_ROLES, REVIEWER_ROLES } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { calcIsraeliDueDate, getPeriodLabel, addDays } from '../shared/dateUtils'
import { ProcessStatus, UserRole } from '@prisma/client'

export async function processInstanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/process-instances  – list with filters
  app.get('/', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const q = req.query as {
      clientId?: string; status?: ProcessStatus; isOverdue?: string;
      assigneeId?: string; periodYear?: string; page?: string; limit?: string
    }
    const page  = parseInt(q.page  ?? '1')
    const limit = parseInt(q.limit ?? '25')
    const where: Record<string, unknown> = {}
    if (q.clientId)   where.clientId = q.clientId
    if (q.status)     where.status   = q.status
    if (q.isOverdue)  where.isOverdue = q.isOverdue === 'true'
    if (q.periodYear) where.periodYear = parseInt(q.periodYear)

    const [instances, total] = await Promise.all([
      prisma.processInstance.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          client:   { select: { id: true, name: true, clientType: true } },
          template: { select: { id: true, name: true, processCode: true } },
          steps:    { include: { templateStep: true, assignee: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: [{ isOverdue: 'desc' }, { dueDate: 'asc' }],
      }),
      prisma.processInstance.count({ where }),
    ])
    return reply.send({ data: instances, total, page, limit })
  })

  // POST /api/process-instances  – create manually or from template
  app.post('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const body = z.object({
      clientId:    z.string().uuid(),
      templateId:  z.string().uuid(),
      periodYear:  z.number(),
      periodMonth: z.number().min(1).max(12).optional(),
      periodMonthEnd: z.number().min(1).max(12).optional(),
      dueDate:     z.string().datetime().optional(),
    }).parse(req.body)

    const [client, template] = await Promise.all([
      prisma.client.findUnique({ where: { id: body.clientId } }),
      prisma.processTemplate.findUnique({ where: { id: body.templateId }, include: { steps: { orderBy: { order: 'asc' } }, dueRules: true } }),
    ])
    if (!client)   throw new NotFoundError('לקוח', body.clientId)
    if (!template) throw new NotFoundError('תבנית תהליך', body.templateId)

    // חישוב תאריך יעד
    let dueDate: Date
    if (body.dueDate) {
      dueDate = new Date(body.dueDate)
    } else {
      const periodEnd = body.periodMonthEnd ?? body.periodMonth ?? 12
      const periodEndDate = new Date(body.periodYear, periodEnd, 0) // last day of period month
      const rule = template.dueRules[0]
      if (rule?.dayOfMonth) {
        dueDate = new Date(body.periodYear, periodEnd, rule.dayOfMonth)
      } else if (rule?.offsetDaysFromPeriodEnd) {
        dueDate = calcIsraeliDueDate(periodEndDate, rule.offsetDaysFromPeriodEnd)
      } else {
        dueDate = calcIsraeliDueDate(periodEndDate, 15) // default 15 ימי עסקים
      }
    }
    const internalDueDate = calcIsraeliDueDate(dueDate, -template.slaBusinessDays)
    const periodLabel = getPeriodLabel(body.periodYear, body.periodMonth ?? null, body.periodMonthEnd)

    const instance = await prisma.processInstance.create({
      data: {
        clientId:       body.clientId,
        templateId:     body.templateId,
        periodYear:     body.periodYear,
        periodMonth:    body.periodMonth,
        periodMonthEnd: body.periodMonthEnd,
        periodLabel,
        dueDate,
        internalDueDate,
        status:         'OPEN',
        steps: {
          create: template.steps.map(s => ({
            templateStepId: s.id,
            status: 'PENDING',
          })),
        },
      },
      include: {
        client:   { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        steps:    { include: { templateStep: true } },
      },
    })
    await writeAuditLog({ userId: caller.sub, clientId: body.clientId, action: 'PROCESS_CREATED', entityType: 'ProcessInstance', entityId: instance.id, after: { templateId: body.templateId, periodLabel, dueDate } })
    return reply.status(201).send(instance)
  })

  // GET /api/process-instances/:id
  app.get('/:id', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const instance = await prisma.processInstance.findUnique({
      where: { id },
      include: {
        client:    { select: { id: true, name: true, clientType: true, vatFrequency: true } },
        template:  { include: { steps: { orderBy: { order: 'asc' } }, requiredDocs: true } },
        steps:     { include: { templateStep: true, assignee: { select: { id: true, firstName: true, lastName: true } } } },
        tasks:     { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
        documents: true,
      },
    })
    if (!instance) throw new NotFoundError('תהליך', id)
    return reply.send(instance)
  })

  // PATCH /api/process-instances/:id/status
  app.patch('/:id/status', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const body = z.object({
      status:           z.nativeEnum(ProcessStatus),
      submissionRef:    z.string().optional(),
      submissionNotes:  z.string().optional(),
      postponedTo:      z.string().datetime().optional(),
      postponedReason:  z.string().optional(),
    }).parse(req.body)

    if (body.status === 'SUBMITTED' && !REVIEWER_ROLES.includes(caller.role)) throw new ForbiddenError('רק Reviewer/מנהל יכול לסמן הגשה')

    const current = await prisma.processInstance.findUnique({ where: { id } })
    if (!current) throw new NotFoundError('תהליך', id)
    if (current.isLocked && !['ADMIN'].includes(caller.role)) throw new ValidationError('התהליך נעול. פנה למנהל לפתיחה.')

    const updateData: Record<string, unknown> = { status: body.status }
    if (body.status === 'SUBMITTED') {
      updateData.submittedAt    = new Date()
      updateData.submittedBy    = caller.sub
      updateData.submissionRef  = body.submissionRef
      updateData.submissionNotes = body.submissionNotes
      updateData.isLocked       = true
    }
    if (body.postponedTo) {
      updateData.postponedTo     = new Date(body.postponedTo)
      updateData.postponedReason = body.postponedReason
      updateData.postponedBy     = caller.sub
    }

    const updated = await prisma.processInstance.update({ where: { id }, data: updateData })
    await writeAuditLog({ userId: caller.sub, clientId: current.clientId, action: `PROCESS_STATUS_${body.status}`, entityType: 'ProcessInstance', entityId: id, before: { status: current.status }, after: { status: body.status, submissionRef: body.submissionRef } })
    return reply.send(updated)
  })

  // PATCH /api/process-instances/:id/steps/:stepId
  app.patch('/:id/steps/:stepId', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { stepId } = req.params as { id: string; stepId: string }
    const body = z.object({
      status:        z.enum(['PENDING','IN_PROGRESS','WAITING_CLIENT','DONE','SKIPPED','BLOCKED']).optional(),
      assigneeId:    z.string().uuid().optional(),
      notes:         z.string().optional(),
      checklistDone: z.record(z.boolean()).optional(),
    }).parse(req.body)
    const updated = await prisma.processStepInstance.update({
      where: { id: stepId },
      data: {
        ...body,
        startedAt:   body.status === 'IN_PROGRESS' ? new Date() : undefined,
        completedAt: body.status === 'DONE' ? new Date() : undefined,
      },
    })
    return reply.send(updated)
  })
}
