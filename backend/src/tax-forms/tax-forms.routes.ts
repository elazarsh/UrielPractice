import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { STAFF_ROLES } from '../shared/types'
import { IsraeliFormType, FormStatus, UserRole } from '@prisma/client'
import { writeAuditLog } from '../shared/audit'

const formSchema = z.object({
  formType:       z.nativeEnum(IsraeliFormType),
  taxYear:        z.number().int().min(2000).max(2100),
  periodMonth:    z.number().int().min(1).max(12).optional(),
  dueDate:        z.string().datetime().optional(),
  notes:          z.string().optional(),
  relatedProcessId: z.string().uuid().optional(),
})

export async function taxFormsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  const requireStaff = (role: UserRole) => {
    if (!STAFF_ROLES.includes(role)) throw new ForbiddenError()
  }

  // GET /api/tax-forms/client/:clientId – list all tax forms for client
  app.get('/client/:clientId', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { clientId } = req.params as { clientId: string }
    const q = req.query as { year?: string; status?: string }

    const forms = await prisma.israeliFormSubmission.findMany({
      where: {
        clientId,
        ...(q.year ? { taxYear: parseInt(q.year) } : {}),
        ...(q.status ? { status: q.status as FormStatus } : {}),
      },
      orderBy: [{ taxYear: 'desc' }, { formType: 'asc' }],
    })

    return reply.send(forms)
  })

  // GET /api/tax-forms/overview – overview of all clients' forms for a year
  app.get('/overview', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const q = req.query as { year?: string }
    const year = parseInt(q.year ?? String(new Date().getFullYear()))

    const forms = await prisma.israeliFormSubmission.findMany({
      where: { taxYear: year },
      include: { client: { select: { id: true, name: true, taxId: true, clientType: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    })

    const statusCounts = forms.reduce((acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return reply.send({ year, totalForms: forms.length, statusCounts, forms })
  })

  // POST /api/tax-forms/client/:clientId – create or update a tax form record
  app.post('/client/:clientId', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { clientId } = req.params as { clientId: string }
    const body = formSchema.parse(req.body)

    const form = await prisma.israeliFormSubmission.upsert({
      where: {
        clientId_formType_taxYear_periodMonth: {
          clientId,
          formType: body.formType,
          taxYear: body.taxYear,
          periodMonth: body.periodMonth ?? null as unknown as number,
        },
      },
      update: {
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
        relatedProcessId: body.relatedProcessId,
      },
      create: {
        clientId,
        formType: body.formType,
        taxYear: body.taxYear,
        periodMonth: body.periodMonth,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
        relatedProcessId: body.relatedProcessId,
        preparedById: (req.user as { sub: string }).sub,
      },
    })

    return reply.status(201).send(form)
  })

  // PATCH /api/tax-forms/:id/status – update form status
  app.patch('/:id/status', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { id } = req.params as { id: string }
    const body = z.object({
      status: z.nativeEnum(FormStatus),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body)

    const existing = await prisma.israeliFormSubmission.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('טופס לא נמצא')

    const updated = await prisma.israeliFormSubmission.update({
      where: { id },
      data: {
        status: body.status,
        referenceNumber: body.referenceNumber,
        notes: body.notes,
        submittedAt: body.status === 'SUBMITTED' ? new Date() : existing.submittedAt,
        approvedById: ['ACCEPTED'].includes(body.status) ? (req.user as { sub: string }).sub : existing.approvedById,
      },
    })

    await writeAuditLog({
      userId: (req.user as { sub: string }).sub,
      clientId: existing.clientId,
      action: `FORM_STATUS_CHANGED_${body.status}`,
      entityType: 'IsraeliFormSubmission',
      entityId: id,
      before: { status: existing.status },
      after: { status: body.status },
    })

    return reply.send(updated)
  })

  // GET /api/tax-forms/pending – all forms pending action
  app.get('/pending', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)

    const forms = await prisma.israeliFormSubmission.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PREPARATION', 'PENDING_SIGNATURE'] },
        dueDate: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 100,
    })

    return reply.send({ count: forms.length, forms })
  })
}
