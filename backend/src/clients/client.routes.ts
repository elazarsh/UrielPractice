import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { STAFF_ROLES, paginate } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { ClientType, ReportFrequency, UserRole } from '@prisma/client'

const clientSchema = z.object({
  name:                   z.string().min(1),
  legalName:              z.string().optional(),
  taxId:                  z.string().min(5),
  vatNumber:              z.string().optional(),
  companyNumber:          z.string().optional(),
  clientType:             z.nativeEnum(ClientType),
  industry:               z.string().optional(),
  email:                  z.string().email().optional().or(z.literal('')),
  phone:                  z.string().optional(),
  mobile:                 z.string().optional(),
  address:                z.string().optional(),
  city:                   z.string().optional(),
  vatFrequency:           z.nativeEnum(ReportFrequency).optional(),
  hasPayroll:             z.boolean().optional(),
  hasAnnualReport:        z.boolean().optional(),
  fiscalYearEnd:          z.number().min(1).max(12).optional(),
  powerOfAttorneyActive:  z.boolean().optional(),
  powerOfAttorneyDate:    z.string().datetime().optional(),
  servicePlanId:          z.string().uuid().optional(),
  internalNotes:          z.string().optional(),
  riskNotes:              z.string().optional(),
  tags:                   z.array(z.string()).optional(),
})

export async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  const requireStaff = (role: UserRole) => {
    if (!STAFF_ROLES.includes(role)) throw new ForbiddenError()
  }

  // GET /api/clients  – list with search/filter/pagination
  app.get('/', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as {
      search?: string; clientType?: ClientType; isActive?: string;
      tag?: string; page?: string; limit?: string
    }
    const page  = parseInt(q.page  ?? '1')
    const limit = parseInt(q.limit ?? '25')
    const where: Record<string, unknown> = {}
    if (q.search)     where.OR = [{ name: { contains: q.search, mode: 'insensitive' } }, { taxId: { contains: q.search } }]
    if (q.clientType) where.clientType = q.clientType
    if (q.isActive !== undefined) where.isActive = q.isActive === 'true'
    if (q.tag)        where.tags = { some: { tag: q.tag } }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { tags: true, servicePlan: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.client.count({ where }),
    ])
    return reply.send(paginate(clients, total, page, limit))
  })

  // POST /api/clients
  app.post('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requireStaff(caller.role)
    const body = clientSchema.parse(req.body)
    const { tags, powerOfAttorneyDate, ...rest } = body
    const client = await prisma.client.create({
      data: {
        ...rest,
        email: rest.email || null,
        powerOfAttorneyDate: powerOfAttorneyDate ? new Date(powerOfAttorneyDate) : undefined,
        tags: tags?.length ? { create: tags.map(t => ({ tag: t })) } : undefined,
      },
      include: { tags: true },
    })
    await writeAuditLog({ userId: caller.sub, clientId: client.id, action: 'CLIENT_CREATED', entityType: 'Client', entityId: client.id, after: client })
    return reply.status(201).send(client)
  })

  // GET /api/clients/:id  – Client 360
  app.get('/:id', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        tags: true,
        contacts: true,
        servicePlan: true,
        processInstances: {
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          take: 10,
          include: { template: { select: { name: true, processCode: true } } },
        },
        tasks: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }, take: 10, orderBy: { dueDate: 'asc' } },
        billingCharges: { where: { isPaid: false }, take: 5 },
      },
    })
    if (!client) throw new NotFoundError('לקוח', id)
    return reply.send(client)
  })

  // PATCH /api/clients/:id
  app.patch('/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    requireStaff(caller.role)
    const { id } = req.params as { id: string }
    const body = clientSchema.partial().parse(req.body)
    const { tags, powerOfAttorneyDate, ...rest } = body
    const before = await prisma.client.findUnique({ where: { id } })
    if (!before) throw new NotFoundError('לקוח', id)
    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...rest,
        powerOfAttorneyDate: powerOfAttorneyDate ? new Date(powerOfAttorneyDate) : undefined,
        tags: tags !== undefined
          ? { deleteMany: {}, create: tags.map(t => ({ tag: t })) }
          : undefined,
      },
      include: { tags: true },
    })
    await writeAuditLog({ userId: caller.sub, clientId: id, action: 'CLIENT_UPDATED', entityType: 'Client', entityId: id, before, after: updated })
    return reply.send(updated)
  })

  // DELETE /api/clients/:id (soft delete = deactivate)
  app.delete('/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!['ADMIN', 'ACCOUNTANT'].includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const client = await prisma.client.update({ where: { id }, data: { isActive: false } })
    await writeAuditLog({ userId: caller.sub, clientId: id, action: 'CLIENT_DEACTIVATED', entityType: 'Client', entityId: id })
    return reply.send(client)
  })

  // POST /api/clients/:id/contacts
  app.post('/:id/contacts', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }
    const body = z.object({
      name: z.string().min(1), role: z.string().optional(),
      email: z.string().email().optional(), phone: z.string().optional(),
      mobile: z.string().optional(), isPrimary: z.boolean().optional(), notes: z.string().optional(),
    }).parse(req.body)
    const contact = await prisma.clientContact.create({ data: { ...body, clientId: id } })
    return reply.status(201).send(contact)
  })

  // GET /api/clients/:id/health  – Health Score
  app.get('/:id/health', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }
    const now = new Date()
    const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const [overdueCount, openMissing, openDebt] = await Promise.all([
      prisma.processInstance.count({ where: { clientId: id, isOverdue: true, createdAt: { gte: days90 } } }),
      prisma.task.count({ where: { clientId: id, taskType: 'DOCUMENT_REQUEST', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.billingCharge.count({ where: { clientId: id, isPaid: false } }),
    ])
    let score = 100
    score -= overdueCount * 10
    score -= openMissing * 5
    score -= openDebt * 8
    score = Math.max(0, Math.min(100, score))
    const color = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red'
    const recommendation = score < 50 ? 'דרוש תיאום דחוף עם הלקוח' : score < 80 ? 'מומלץ לשוחח עם הלקוח' : 'תיק תקין'
    await prisma.client.update({ where: { id }, data: { healthScore: score, healthUpdatedAt: now } })
    return reply.send({ score, color, recommendation, components: { overdueCount, openMissing, openDebt } })
  })
}
