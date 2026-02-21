import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors'
import { STAFF_ROLES, ADMIN_ROLES } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { TaxPaymentType, UserRole } from '@prisma/client'

// ─────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────

const createTaxPaymentSchema = z.object({
  paymentType:     z.nativeEnum(TaxPaymentType),
  periodYear:      z.number().int().min(2000).max(2100),
  periodMonth:     z.number().int().min(1).max(12).optional(),
  amount:          z.number().positive(),
  vatAmount:       z.number().min(0).optional(),
  referenceNumber: z.string().optional(),
  dueDate:         z.string().datetime(),
  notes:           z.string().optional(),
})

const updateTaxPaymentSchema = z.object({
  amount:          z.number().positive().optional(),
  referenceNumber: z.string().optional(),
  notes:           z.string().optional(),
  dueDate:         z.string().datetime().optional(),
})

const markPaidSchema = z.object({
  paidAt:          z.string().datetime().optional(),
  paidById:        z.string().uuid().optional(),
  bankBranch:      z.string().optional(),
  referenceNumber: z.string().optional(),
})

// ─────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────

export async function taxPaymentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // ── GET /api/tax-payments/upcoming ──────────────────────────────────────────
  // Unpaid payments due within the next 30 days, across all clients. Staff only.
  app.get('/upcoming', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const now     = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const payments = await prisma.taxPayment.findMany({
      where: {
        isPaid:  false,
        dueDate: { gte: now, lte: in30Days },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return reply.send(payments)
  })

  // ── GET /api/tax-payments/overdue ────────────────────────────────────────────
  // Unpaid payments whose dueDate is in the past. Returns days overdue. Staff only.
  app.get('/overdue', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const now = new Date()

    const payments = await prisma.taxPayment.findMany({
      where: {
        isPaid:  false,
        dueDate: { lt: now },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    const result = payments.map(p => ({
      ...p,
      daysOverdue: Math.floor((now.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    return reply.send(result)
  })

  // ── GET /api/tax-payments/client/:clientId ──────────────────────────────────
  // List tax payments for a specific client with optional filters.
  app.get('/client/:clientId', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { clientId } = req.params as { clientId: string }
    const q = req.query as {
      year?:        string
      paymentType?: TaxPaymentType
      isPaid?:      string
    }

    const where: Record<string, unknown> = { clientId }
    if (q.year)        where.periodYear  = parseInt(q.year)
    if (q.paymentType) where.paymentType = q.paymentType
    if (q.isPaid !== undefined) where.isPaid = q.isPaid === 'true'

    const payments = await prisma.taxPayment.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { dueDate: 'asc' }],
    })

    return reply.send(payments)
  })

  // ── POST /api/tax-payments/client/:clientId ──────────────────────────────────
  // Create a tax payment record for a client.
  app.post('/client/:clientId', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { clientId } = req.params as { clientId: string }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) throw new NotFoundError('לקוח', clientId)

    const body = createTaxPaymentSchema.parse(req.body)

    const payment = await prisma.taxPayment.create({
      data: {
        clientId,
        paymentType:     body.paymentType,
        periodYear:      body.periodYear,
        periodMonth:     body.periodMonth,
        amount:          body.amount,
        vatAmount:       body.vatAmount,
        referenceNumber: body.referenceNumber,
        dueDate:         new Date(body.dueDate),
        notes:           body.notes,
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId,
      action:     'TAX_PAYMENT_CREATED',
      entityType: 'TaxPayment',
      entityId:   payment.id,
      after:      payment,
    })

    return reply.status(201).send(payment)
  })

  // ── PATCH /api/tax-payments/:id ──────────────────────────────────────────────
  // Update editable fields on a tax payment.
  app.patch('/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { id } = req.params as { id: string }
    const body   = updateTaxPaymentSchema.parse(req.body)

    const existing = await prisma.taxPayment.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('תשלום מס', id)

    const updated = await prisma.taxPayment.update({
      where: { id },
      data:  {
        amount:          body.amount,
        referenceNumber: body.referenceNumber,
        notes:           body.notes,
        dueDate:         body.dueDate ? new Date(body.dueDate) : undefined,
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId:   existing.clientId,
      action:     'TAX_PAYMENT_UPDATED',
      entityType: 'TaxPayment',
      entityId:   id,
      before:     existing,
      after:      updated,
    })

    return reply.send(updated)
  })

  // ── POST /api/tax-payments/:id/mark-paid ────────────────────────────────────
  // Mark a tax payment as paid.
  app.post('/:id/mark-paid', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { id } = req.params as { id: string }
    const body   = markPaidSchema.parse(req.body)

    const existing = await prisma.taxPayment.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('תשלום מס', id)
    if (existing.isPaid) throw new BadRequestError('תשלום זה כבר סומן כשולם')

    const updated = await prisma.taxPayment.update({
      where: { id },
      data: {
        isPaid:          true,
        paidAt:          body.paidAt ? new Date(body.paidAt) : new Date(),
        paidById:        body.paidById  ?? caller.sub,
        bankBranch:      body.bankBranch,
        referenceNumber: body.referenceNumber ?? existing.referenceNumber,
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId:   existing.clientId,
      action:     'TAX_PAYMENT_MARKED_PAID',
      entityType: 'TaxPayment',
      entityId:   id,
      before:     existing,
      after:      updated,
    })

    return reply.send(updated)
  })
}
