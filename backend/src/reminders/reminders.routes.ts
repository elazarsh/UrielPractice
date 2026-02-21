import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { STAFF_ROLES, ADMIN_ROLES } from '../shared/types'
import { MessageChannel, ReminderStatus, ReminderTriggerType, ClientType, UserRole } from '@prisma/client'
import { writeAuditLog } from '../shared/audit'

// Replace template variables like {{clientName}}, {{dueDate}}, etc.
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

const templateSchema = z.object({
  name: z.string().min(1),
  triggerType: z.nativeEnum(ReminderTriggerType),
  daysBeforeDue: z.number().int().min(0).max(60),
  channel: z.nativeEnum(MessageChannel),
  subjectTemplate: z.string().optional(),
  bodyTemplate: z.string().min(1),
  isActive: z.boolean().optional(),
  applicableTo: z.array(z.nativeEnum(ClientType)).optional(),
})

export async function remindersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  const requireStaff = (role: UserRole) => {
    if (!STAFF_ROLES.includes(role)) throw new ForbiddenError()
  }
  const requireAdmin = (role: UserRole) => {
    if (!ADMIN_ROLES.includes(role)) throw new ForbiddenError()
  }

  // ─── TEMPLATES ───────────────────────────────────────

  // GET /api/reminders/templates – list all templates
  app.get('/templates', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const templates = await prisma.reminderTemplate.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { reminders: true } } },
    })
    return reply.send(templates)
  })

  // POST /api/reminders/templates – create template
  app.post('/templates', async (req, reply) => {
    requireAdmin((req.user as { role: UserRole }).role)
    const body = templateSchema.parse(req.body)

    const template = await prisma.reminderTemplate.create({
      data: {
        name: body.name,
        triggerType: body.triggerType,
        daysBeforeDue: body.daysBeforeDue,
        channel: body.channel,
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
        isActive: body.isActive ?? true,
        applicableTo: body.applicableTo ?? [],
      },
    })

    return reply.status(201).send(template)
  })

  // PATCH /api/reminders/templates/:id – update template
  app.patch('/templates/:id', async (req, reply) => {
    requireAdmin((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }
    const body = templateSchema.partial().parse(req.body)

    const updated = await prisma.reminderTemplate.update({ where: { id }, data: body })
    return reply.send(updated)
  })

  // DELETE /api/reminders/templates/:id – delete template
  app.delete('/templates/:id', async (req, reply) => {
    requireAdmin((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }
    await prisma.reminderTemplate.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ─── SCHEDULED REMINDERS ─────────────────────────────

  // GET /api/reminders/scheduled – list scheduled reminders
  app.get('/scheduled', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as { status?: string; clientId?: string; page?: string; limit?: string }
    const page = parseInt(q.page ?? '1')
    const limit = parseInt(q.limit ?? '25')

    const where: Record<string, unknown> = {}
    if (q.status) where.status = q.status
    if (q.clientId) where.clientId = q.clientId

    const [reminders, total] = await Promise.all([
      prisma.scheduledReminder.findMany({
        where,
        include: {
          template: { select: { name: true, triggerType: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: { scheduledFor: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.scheduledReminder.count({ where }),
    ])

    return reply.send({ data: reminders, total, page, totalPages: Math.ceil(total / limit) })
  })

  // POST /api/reminders/generate – generate reminders for upcoming process deadlines
  // This would typically run as a cron job, but exposed as API for manual trigger
  app.post('/generate', async (req, reply) => {
    requireAdmin((req.user as { role: UserRole }).role)

    const templates = await prisma.reminderTemplate.findMany({ where: { isActive: true } })
    const now = new Date()
    let created = 0
    let skipped = 0

    for (const template of templates) {
      if (template.triggerType !== 'PROCESS_DUE_SOON') continue

      const daysFromNow = template.daysBeforeDue
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + daysFromNow)

      // Find processes due on target date
      const targetStart = new Date(targetDate)
      targetStart.setHours(0, 0, 0, 0)
      const targetEnd = new Date(targetDate)
      targetEnd.setHours(23, 59, 59, 999)

      const processes = await prisma.processInstance.findMany({
        where: {
          dueDate: { gte: targetStart, lte: targetEnd },
          status: { notIn: ['CLOSED', 'CANCELLED', 'SUBMITTED'] },
        },
        include: {
          client: { select: { id: true, name: true, email: true, mobile: true, clientType: true } },
          template: { select: { name: true } },
        },
      })

      for (const process of processes) {
        // Check if applicable to client type
        if (template.applicableTo.length > 0 && !template.applicableTo.includes(process.client.clientType)) {
          skipped++
          continue
        }

        const vars = {
          clientName: process.client.name,
          dueDate: process.dueDate.toLocaleDateString('he-IL'),
          processName: process.template.name,
          periodLabel: process.periodLabel,
          daysLeft: String(daysFromNow),
        }

        const renderedBody = renderTemplate(template.bodyTemplate, vars)
        const renderedSubject = template.subjectTemplate ? renderTemplate(template.subjectTemplate, vars) : undefined

        // Check for duplicate
        const existingCount = await prisma.scheduledReminder.count({
          where: {
            templateId: template.id,
            clientId: process.clientId,
            processId: process.id,
            status: { in: ['PENDING', 'SENT'] },
          },
        })

        if (existingCount > 0) {
          skipped++
          continue
        }

        await prisma.scheduledReminder.create({
          data: {
            templateId: template.id,
            clientId: process.clientId,
            processId: process.id,
            targetEmail: process.client.email ?? undefined,
            targetPhone: process.client.mobile ?? undefined,
            scheduledFor: new Date(), // immediate for now
            renderedBody,
            renderedSubject,
          },
        })
        created++
      }
    }

    return reply.send({ created, skipped, processedTemplates: templates.length })
  })

  // POST /api/reminders/scheduled/:id/send – mark reminder as sent (simulate sending)
  app.post('/scheduled/:id/send', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }

    const reminder = await prisma.scheduledReminder.findUnique({
      where: { id },
      include: { client: { select: { name: true } } },
    })
    if (!reminder) throw new NotFoundError('תזכורת לא נמצאה')

    const updated = await prisma.scheduledReminder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    })

    await writeAuditLog({
      userId: (req.user as { sub: string }).sub,
      clientId: reminder.clientId,
      action: 'REMINDER_SENT',
      entityType: 'ScheduledReminder',
      entityId: id,
    })

    return reply.send(updated)
  })

  // PATCH /api/reminders/scheduled/:id/skip – skip a reminder
  app.patch('/scheduled/:id/skip', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }
    const updated = await prisma.scheduledReminder.update({
      where: { id },
      data: { status: 'SKIPPED' },
    })
    return reply.send(updated)
  })

  // GET /api/reminders/pending-count – count pending reminders
  app.get('/pending-count', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const count = await prisma.scheduledReminder.count({
      where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
    })
    return reply.send({ count })
  })

  // POST /api/reminders/client/:clientId – create manual reminder for client
  app.post('/client/:clientId', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { clientId } = req.params as { clientId: string }
    const body = z.object({
      templateId: z.string().uuid(),
      scheduledFor: z.string().datetime(),
      processId: z.string().uuid().optional(),
      targetEmail: z.string().email().optional(),
      targetPhone: z.string().optional(),
      customBody: z.string().optional(),
      customSubject: z.string().optional(),
    }).parse(req.body)

    const template = await prisma.reminderTemplate.findUnique({ where: { id: body.templateId } })
    if (!template) throw new NotFoundError('תבנית לא נמצאה')

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } })

    const vars = {
      clientName: client?.name ?? '',
      dueDate: '',
      processName: '',
      periodLabel: '',
      daysLeft: '',
    }

    const reminder = await prisma.scheduledReminder.create({
      data: {
        templateId: body.templateId,
        clientId,
        processId: body.processId,
        targetEmail: body.targetEmail,
        targetPhone: body.targetPhone,
        scheduledFor: new Date(body.scheduledFor),
        renderedBody: body.customBody ?? renderTemplate(template.bodyTemplate, vars),
        renderedSubject: body.customSubject ?? (template.subjectTemplate ? renderTemplate(template.subjectTemplate, vars) : undefined),
      },
    })

    return reply.status(201).send(reminder)
  })
}
