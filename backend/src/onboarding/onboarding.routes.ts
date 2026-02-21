import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { STAFF_ROLES } from '../shared/types'
import { OnboardingStatus, UserRole } from '@prisma/client'
import { writeAuditLog } from '../shared/audit'

// Default onboarding checklist for Israeli CPA firm
const DEFAULT_CHECKLIST = [
  { id: 'power-of-attorney', title: 'ייפוי כוח שע"מ', done: false, required: true },
  { id: 'id-copy', title: 'צילום ת"ז / תעודת התאגדות', done: false, required: true },
  { id: 'bank-details', title: 'פרטי חשבון בנק', done: false, required: true },
  { id: 'vat-registration', title: 'אישור רישום מע"מ', done: false, required: false },
  { id: 'income-tax-file', title: 'פתיחת תיק מס הכנסה', done: false, required: true },
  { id: 'nl-registration', title: 'רישום ביטוח לאומי', done: false, required: true },
  { id: 'contact-details', title: 'עדכון פרטי קשר מלאים', done: false, required: true },
  { id: 'prev-accountant', title: 'קבלת מידע מרואה חשבון קודם', done: false, required: false },
  { id: 'opening-balances', title: 'יתרות פתיחה', done: false, required: false },
  { id: 'service-agreement', title: 'חוזה שירות חתום', done: false, required: true },
  { id: 'payroll-setup', title: 'הגדרת עובדים (אם יש שכר)', done: false, required: false },
  { id: 'first-process', title: 'פתיחת תהליך ראשון במערכת', done: false, required: true },
]

const checklistItemSchema = z.object({
  id: z.string(),
  done: z.boolean(),
})

export async function onboardingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  const requireStaff = (role: UserRole) => {
    if (!STAFF_ROLES.includes(role)) throw new ForbiddenError()
  }

  // GET /api/onboarding – list all active onboardings
  app.get('/', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)

    const onboardings = await prisma.clientOnboarding.findMany({
      where: { status: { in: ['IN_PROGRESS', 'ON_HOLD'] } },
      include: { client: { select: { id: true, name: true, taxId: true, clientType: true } } },
      orderBy: { startedAt: 'desc' },
    })

    return reply.send(onboardings.map(o => {
      const checklist = (o.checklist as typeof DEFAULT_CHECKLIST) ?? DEFAULT_CHECKLIST
      const total = checklist.length
      const done = checklist.filter(i => i.done).length
      return { ...o, progress: { total, done, percent: Math.round((done / total) * 100) } }
    }))
  })

  // GET /api/onboarding/:clientId – get onboarding for client
  app.get('/:clientId', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { clientId } = req.params as { clientId: string }

    const onboarding = await prisma.clientOnboarding.findUnique({
      where: { clientId },
      include: { client: { select: { id: true, name: true, clientType: true } } },
    })

    if (!onboarding) {
      // Return default template if not started
      return reply.send({
        clientId,
        status: 'NOT_STARTED',
        checklist: DEFAULT_CHECKLIST,
        progress: { total: DEFAULT_CHECKLIST.length, done: 0, percent: 0 },
      })
    }

    const checklist = (onboarding.checklist as typeof DEFAULT_CHECKLIST) ?? DEFAULT_CHECKLIST
    return reply.send({
      ...onboarding,
      progress: {
        total: checklist.length,
        done: checklist.filter(i => i.done).length,
        percent: Math.round((checklist.filter(i => i.done).length / checklist.length) * 100),
      },
    })
  })

  // POST /api/onboarding/:clientId/start – create/start onboarding
  app.post('/:clientId/start', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { clientId } = req.params as { clientId: string }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) throw new NotFoundError('לקוח לא נמצא')

    const onboarding = await prisma.clientOnboarding.upsert({
      where: { clientId },
      update: { status: 'IN_PROGRESS', startedAt: new Date() },
      create: {
        clientId,
        status: 'IN_PROGRESS',
        assignedToId: (req.user as { sub: string }).sub,
        checklist: DEFAULT_CHECKLIST,
      },
    })

    await writeAuditLog({
      userId: (req.user as { sub: string }).sub,
      clientId,
      action: 'ONBOARDING_STARTED',
      entityType: 'ClientOnboarding',
      entityId: onboarding.id,
    })

    return reply.status(201).send(onboarding)
  })

  // PATCH /api/onboarding/:clientId/checklist – update checklist items
  app.patch('/:clientId/checklist', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { clientId } = req.params as { clientId: string }
    const body = z.object({ items: z.array(checklistItemSchema) }).parse(req.body)

    const existing = await prisma.clientOnboarding.findUnique({ where: { clientId } })
    if (!existing) throw new NotFoundError('קליטה לא נמצאה')

    const currentChecklist = (existing.checklist as typeof DEFAULT_CHECKLIST) ?? DEFAULT_CHECKLIST
    const updatedChecklist = currentChecklist.map(item => {
      const update = body.items.find(u => u.id === item.id)
      return update ? { ...item, done: update.done } : item
    })

    const allRequiredDone = updatedChecklist.filter(i => i.required).every(i => i.done)
    const allDone = updatedChecklist.every(i => i.done)

    const updated = await prisma.clientOnboarding.update({
      where: { clientId },
      data: {
        checklist: updatedChecklist,
        status: allDone ? 'COMPLETED' : existing.status,
        completedAt: allDone && !existing.completedAt ? new Date() : existing.completedAt,
      },
    })

    return reply.send({
      ...updated,
      allRequiredDone,
      progress: {
        total: updatedChecklist.length,
        done: updatedChecklist.filter(i => i.done).length,
        percent: Math.round((updatedChecklist.filter(i => i.done).length / updatedChecklist.length) * 100),
      },
    })
  })

  // PATCH /api/onboarding/:clientId/status – change onboarding status
  app.patch('/:clientId/status', async (req, reply) => {
    requireStaff((req.user as { role: UserRole }).role)
    const { clientId } = req.params as { clientId: string }
    const body = z.object({
      status: z.nativeEnum(OnboardingStatus),
      notes: z.string().optional(),
    }).parse(req.body)

    const updated = await prisma.clientOnboarding.update({
      where: { clientId },
      data: {
        status: body.status,
        notes: body.notes,
        completedAt: body.status === 'COMPLETED' ? new Date() : undefined,
      },
    })

    return reply.send(updated)
  })
}
