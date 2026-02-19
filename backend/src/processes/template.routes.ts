import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { ADMIN_ROLES, STAFF_ROLES } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { ClientType, ReportFrequency, UserRole } from '@prisma/client'

const templateSchema = z.object({
  name:            z.string().min(1),
  description:     z.string().optional(),
  processCode:     z.string().min(1),
  frequency:       z.nativeEnum(ReportFrequency),
  applicableTo:    z.array(z.nativeEnum(ClientType)).optional(),
  slaBusinessDays: z.number().min(1).max(30).optional(),
  notes:           z.string().optional(),
  steps: z.array(z.object({
    order:           z.number(),
    name:            z.string().min(1),
    description:     z.string().optional(),
    roleRequired:    z.nativeEnum(UserRole).optional(),
    defaultDuration: z.number().optional(),
    isClientStep:    z.boolean().optional(),
    isOptional:      z.boolean().optional(),
    checklistItems:  z.array(z.string()).optional(),
  })).optional(),
  dueRules: z.array(z.object({
    name:                    z.string(),
    dayOfMonth:              z.number().optional(),
    offsetDaysFromPeriodEnd: z.number().optional(),
    adjustForHolidays:       z.boolean().optional(),
    notes:                   z.string().optional(),
  })).optional(),
  requiredDocs: z.array(z.object({
    documentType: z.string(),
    description:  z.string().optional(),
    isRequired:   z.boolean().optional(),
    applicableTo: z.array(z.nativeEnum(ClientType)).optional(),
    notes:        z.string().optional(),
  })).optional(),
})

export async function processTemplateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/process-templates
  app.get('/', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const templates = await prisma.processTemplate.findMany({
      where: { isActive: true },
      include: { steps: { orderBy: { order: 'asc' } }, dueRules: true, requiredDocs: true },
      orderBy: { name: 'asc' },
    })
    return reply.send(templates)
  })

  // POST /api/process-templates
  app.post('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()
    const body = templateSchema.parse(req.body)
    const { steps, dueRules, requiredDocs, ...rest } = body
    const template = await prisma.processTemplate.create({
      data: {
        ...rest,
        applicableTo: rest.applicableTo ?? [],
        steps:        steps?.length ? { create: steps.map(s => ({ ...s, checklistItems: s.checklistItems ?? [] })) } : undefined,
        dueRules:     dueRules?.length ? { create: dueRules } : undefined,
        requiredDocs: requiredDocs?.length ? { create: requiredDocs.map(d => ({ ...d, applicableTo: d.applicableTo ?? [] })) } : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } }, dueRules: true, requiredDocs: true },
    })
    await writeAuditLog({ userId: caller.sub, action: 'TEMPLATE_CREATED', entityType: 'ProcessTemplate', entityId: template.id, after: template })
    return reply.status(201).send(template)
  })

  // GET /api/process-templates/:id
  app.get('/:id', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const template = await prisma.processTemplate.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } }, dueRules: true, requiredDocs: true },
    })
    if (!template) throw new NotFoundError('תבנית תהליך', id)
    return reply.send(template)
  })

  // PATCH /api/process-templates/:id
  app.patch('/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const body = templateSchema.partial().parse(req.body)
    const { steps: _, dueRules: __, requiredDocs: ___, ...rest } = body
    const updated = await prisma.processTemplate.update({
      where: { id },
      data: { ...rest, version: { increment: 1 } },
      include: { steps: { orderBy: { order: 'asc' } }, dueRules: true, requiredDocs: true },
    })
    await writeAuditLog({ userId: caller.sub, action: 'TEMPLATE_UPDATED', entityType: 'ProcessTemplate', entityId: id, after: updated })
    return reply.send(updated)
  })

  // POST /api/process-templates/:id/clone
  app.post('/:id/clone', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const source = await prisma.processTemplate.findUnique({
      where: { id },
      include: { steps: true, dueRules: true, requiredDocs: true },
    })
    if (!source) throw new NotFoundError('תבנית תהליך', id)
    const { id: _id, createdAt: _c, updatedAt: _u, steps, dueRules, requiredDocs, ...rest } = source
    const cloned = await prisma.processTemplate.create({
      data: {
        ...rest,
        processCode: `${rest.processCode}_COPY_${Date.now()}`,
        name: `${rest.name} (עותק)`,
        version: 1,
        steps:        { create: steps.map(({ id: _, templateId: __, ...s }) => s) },
        dueRules:     { create: dueRules.map(({ id: _, templateId: __, ...d }) => d) },
        requiredDocs: { create: requiredDocs.map(({ id: _, templateId: __, ...r }) => r) },
      },
      include: { steps: { orderBy: { order: 'asc' } }, dueRules: true, requiredDocs: true },
    })
    return reply.status(201).send(cloned)
  })
}
