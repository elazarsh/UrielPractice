import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError, BadRequestError } from '../shared/errors'
import { STAFF_ROLES, ADMIN_ROLES, paginate } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { UserRole } from '@prisma/client'

const VAT_RATE = 0.17

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const createChargeSchema = z.object({
  description: z.string().min(1),
  amount:      z.number().positive(),
  chargeDate:  z.string().datetime(),
  dueDate:     z.string().datetime(),
  notes:       z.string().optional(),
})

const updateChargeSchema = z.object({
  notes:   z.string().optional(),
  dueDate: z.string().datetime().optional(),
})

const recordPaymentSchema = z.object({
  amount:    z.number().positive(),
  method:    z.string().optional(),
  reference: z.string().optional(),
  paidAt:    z.string().datetime().optional(),
  notes:     z.string().optional(),
})

const bulkMonthlySchema = z.object({
  year:        z.number().int().min(2000).max(2100),
  month:       z.number().int().min(1).max(12),
  description: z.string().optional(),
})

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Generate INV-{year}-{padded sequence} based on total count of existing charges */
async function generateInvoiceNumber(year: number): Promise<string> {
  const count = await prisma.billingCharge.count()
  const seq = String(count + 1).padStart(5, '0')
  return `INV-${year}-${seq}`
}

// ─── Route plugin ─────────────────────────────────────────────────────────────

export async function billingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // ── GET /api/billing  – list all charges (admin/staff), with optional filters
  app.get('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const q = req.query as {
      clientId?: string
      isPaid?:   string
      page?:     string
      limit?:    string
    }
    const page  = parseInt(q.page  ?? '1')
    const limit = parseInt(q.limit ?? '25')

    const where: Record<string, unknown> = {}
    if (q.clientId)           where.clientId = q.clientId
    if (q.isPaid !== undefined) where.isPaid = q.isPaid === 'true'

    const [charges, total] = await Promise.all([
      prisma.billingCharge.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          payments: true,
        },
        orderBy: { chargeDate: 'desc' },
      }),
      prisma.billingCharge.count({ where }),
    ])

    return reply.send(paginate(charges, total, page, limit))
  })

  // ── GET /api/billing/summary – aggregated billing summary
  app.get('/summary', async (req, reply) => {
    const caller = req.user as { role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const now = new Date()

    const [allCharges, overdueCount] = await Promise.all([
      prisma.billingCharge.findMany({
        select: { totalAmount: true, isPaid: true, paidAt: true },
      }),
      prisma.billingCharge.count({
        where: {
          isPaid:  false,
          dueDate: { lt: now },
        },
      }),
    ])

    let totalCharged = 0
    let totalPaid    = 0
    let totalUnpaid  = 0

    for (const c of allCharges) {
      totalCharged += c.totalAmount
      if (c.isPaid) {
        totalPaid += c.totalAmount
      } else {
        totalUnpaid += c.totalAmount
      }
    }

    return reply.send({
      totalCharged: Math.round(totalCharged * 100) / 100,
      totalPaid:    Math.round(totalPaid    * 100) / 100,
      totalUnpaid:  Math.round(totalUnpaid  * 100) / 100,
      overdueCount,
    })
  })

  // ── GET /api/billing/client/:clientId – charges for a specific client (with payments)
  app.get('/client/:clientId', async (req, reply) => {
    const caller = req.user as { role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { clientId } = req.params as { clientId: string }

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } })
    if (!client) throw new NotFoundError('לקוח', clientId)

    const q = req.query as { page?: string; limit?: string }
    const page  = parseInt(q.page  ?? '1')
    const limit = parseInt(q.limit ?? '25')

    const [charges, total] = await Promise.all([
      prisma.billingCharge.findMany({
        where: { clientId },
        skip:  (page - 1) * limit,
        take:  limit,
        include: { payments: true },
        orderBy: { chargeDate: 'desc' },
      }),
      prisma.billingCharge.count({ where: { clientId } }),
    ])

    return reply.send(paginate(charges, total, page, limit))
  })

  // ── POST /api/billing/client/:clientId/charges – create a new charge
  app.post('/client/:clientId/charges', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { clientId } = req.params as { clientId: string }
    const body = createChargeSchema.parse(req.body)

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) throw new NotFoundError('לקוח', clientId)

    const vatAmount    = Math.round(body.amount * VAT_RATE * 100) / 100
    const totalAmount  = Math.round((body.amount + vatAmount) * 100) / 100
    const year         = new Date(body.chargeDate).getFullYear()
    const invoiceNumber = await generateInvoiceNumber(year)

    const charge = await prisma.billingCharge.create({
      data: {
        clientId,
        description:   body.description,
        amount:        body.amount,
        vatAmount,
        totalAmount,
        chargeDate:    new Date(body.chargeDate),
        dueDate:       new Date(body.dueDate),
        notes:         body.notes,
        invoiceNumber,
      },
      include: { payments: true },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId,
      action:     'BILLING_CHARGE_CREATED',
      entityType: 'BillingCharge',
      entityId:   charge.id,
      after:      charge,
    })

    return reply.status(201).send(charge)
  })

  // ── POST /api/billing/client/:clientId/charges/bulk-monthly
  //    Bulk-create monthly management fee for ALL active clients that have a servicePlan with monthlyFee
  //    Body: { year, month, description? }
  app.post('/client/:clientId/charges/bulk-monthly', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const body = bulkMonthlySchema.parse(req.body)

    // Fetch all active clients that have a service plan with a monthlyFee
    const clients = await prisma.client.findMany({
      where: {
        isActive:      true,
        servicePlanId: { not: null },
        servicePlan:   { monthlyFee: { not: null } },
      },
      include: { servicePlan: true },
    })

    const monthLabel    = body.month.toString().padStart(2, '0')
    const defaultDesc   = body.description ?? `דמי ניהול ${monthLabel}/${body.year}`
    // Charge date = first day of the given month, due date = last day
    const chargeDate    = new Date(body.year, body.month - 1, 1)
    const dueDate       = new Date(body.year, body.month, 0)   // last day of month

    let created = 0
    let skipped = 0

    for (const client of clients) {
      const monthlyFee = client.servicePlan?.monthlyFee
      if (!monthlyFee) { skipped++; continue }

      // Skip if a charge with the same description + chargeDate already exists
      const existing = await prisma.billingCharge.findFirst({
        where: { clientId: client.id, description: defaultDesc, chargeDate },
      })
      if (existing) { skipped++; continue }

      const vatAmount   = Math.round(monthlyFee * VAT_RATE * 100) / 100
      const totalAmount = Math.round((monthlyFee + vatAmount) * 100) / 100
      const invoiceNumber = await generateInvoiceNumber(body.year)

      await prisma.billingCharge.create({
        data: {
          clientId:    client.id,
          description: defaultDesc,
          amount:      monthlyFee,
          vatAmount,
          totalAmount,
          chargeDate,
          dueDate,
          invoiceNumber,
        },
      })

      await writeAuditLog({
        userId:     caller.sub,
        clientId:   client.id,
        action:     'BILLING_BULK_MONTHLY_CHARGE',
        entityType: 'BillingCharge',
        source:     'SYSTEM',
        notes:      `${monthLabel}/${body.year}`,
      })

      created++
    }

    return reply.status(201).send({ created, skipped })
  })

  // ── PATCH /api/billing/charges/:id – update notes / dueDate (staff only)
  app.patch('/charges/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { id } = req.params as { id: string }
    const body   = updateChargeSchema.parse(req.body)

    const charge = await prisma.billingCharge.findUnique({ where: { id } })
    if (!charge) throw new NotFoundError('חיוב', id)

    const updated = await prisma.billingCharge.update({
      where: { id },
      data: {
        notes:   body.notes   !== undefined ? body.notes   : undefined,
        dueDate: body.dueDate !== undefined ? new Date(body.dueDate) : undefined,
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId:   charge.clientId,
      action:     'BILLING_CHARGE_UPDATED',
      entityType: 'BillingCharge',
      entityId:   id,
      before:     charge,
      after:      updated,
    })

    return reply.send(updated)
  })

  // ── POST /api/billing/charges/:id/pay – record a payment
  app.post('/charges/:id/pay', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { id } = req.params as { id: string }
    const body   = recordPaymentSchema.parse(req.body)

    const charge = await prisma.billingCharge.findUnique({
      where: { id },
      include: { payments: true },
    })
    if (!charge) throw new NotFoundError('חיוב', id)
    if (charge.isPaid) throw new BadRequestError('החיוב כבר שולם במלואו')

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        chargeId:  id,
        amount:    body.amount,
        method:    body.method,
        reference: body.reference,
        paidAt:    body.paidAt ? new Date(body.paidAt) : new Date(),
        notes:     body.notes,
      },
    })

    // Sum all payments including the new one
    const previousTotal = charge.payments.reduce((sum, p) => sum + p.amount, 0)
    const newTotal      = previousTotal + body.amount

    // Mark charge as paid if fully covered
    let updatedCharge: typeof charge = charge
    if (newTotal >= charge.totalAmount) {
      const updated = await prisma.billingCharge.update({
        where: { id },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
        include: { payments: true },
      })
      updatedCharge = updated
    }

    await writeAuditLog({
      userId:     caller.sub,
      clientId:   charge.clientId,
      action:     'BILLING_PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId:   payment.id,
      after:      { paymentId: payment.id, amount: body.amount, isPaid: updatedCharge.isPaid },
    })

    return reply.status(201).send({ payment, charge: updatedCharge })
  })
}
