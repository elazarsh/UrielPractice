import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { STAFF_ROLES, ADMIN_ROLES, paginate } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { MessageChannel, UserRole } from '@prisma/client'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const sendMessageSchema = z.object({
  channel:      z.nativeEnum(MessageChannel),
  subject:      z.string().optional(),
  body:         z.string().min(1),
  isFromClient: z.boolean().optional(),
  processId:    z.string().uuid().optional(),
  templateRef:  z.string().optional(),
})

// ─── Route plugin ─────────────────────────────────────────────────────────────

export async function communicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // ── GET /api/communications/client/:clientId
  //    Paginated message list for a client. Query: channel?, page?, limit?
  app.get('/client/:clientId', async (req, reply) => {
    const caller = req.user as { role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { clientId } = req.params as { clientId: string }
    const q = req.query as {
      channel?: MessageChannel
      page?:    string
      limit?:   string
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    })
    if (!client) throw new NotFoundError('לקוח', clientId)

    const page  = parseInt(q.page  ?? '1')
    const limit = parseInt(q.limit ?? '25')

    const where: Record<string, unknown> = { clientId }
    if (q.channel) where.channel = q.channel

    const [messages, total] = await Promise.all([
      prisma.communicationMessage.findMany({
        where,
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { sentAt: 'desc' },
      }),
      prisma.communicationMessage.count({ where }),
    ])

    return reply.send(paginate(messages, total, page, limit))
  })

  // ── POST /api/communications/client/:clientId
  //    Send/record a message for a client
  app.post('/client/:clientId', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { clientId } = req.params as { clientId: string }
    const body = sendMessageSchema.parse(req.body)

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) throw new NotFoundError('לקוח', clientId)

    const message = await prisma.communicationMessage.create({
      data: {
        clientId,
        senderId:     caller.sub,
        channel:      body.channel,
        subject:      body.subject,
        body:         body.body,
        isFromClient: body.isFromClient ?? false,
        processId:    body.processId,
        templateRef:  body.templateRef,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    await writeAuditLog({
      userId:     caller.sub,
      clientId,
      action:     'COMMUNICATION_MESSAGE_SENT',
      entityType: 'CommunicationMessage',
      entityId:   message.id,
      after: {
        channel:      body.channel,
        isFromClient: body.isFromClient ?? false,
        hasSubject:   !!body.subject,
      },
    })

    return reply.status(201).send(message)
  })

  // ── PATCH /api/communications/:id/read – mark message as read
  app.patch('/:id/read', async (req, reply) => {
    const caller = req.user as { role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { id } = req.params as { id: string }

    const message = await prisma.communicationMessage.findUnique({ where: { id } })
    if (!message) throw new NotFoundError('הודעה', id)

    const updated = await prisma.communicationMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return reply.send(updated)
  })

  // ── GET /api/communications/unread-count
  //    Count unread messages grouped by client for all (staff) accessible clients
  app.get('/unread-count', async (req, reply) => {
    const caller = req.user as { role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    // Group unread messages by clientId
    const grouped = await prisma.communicationMessage.groupBy({
      by:     ['clientId'],
      where:  { isRead: false },
      _count: { id: true },
    })

    if (grouped.length === 0) return reply.send([])

    // Fetch client names for the grouped clientIds
    const clientIds = grouped.map(g => g.clientId)
    const clients   = await prisma.client.findMany({
      where:  { id: { in: clientIds } },
      select: { id: true, name: true },
    })

    const clientMap = new Map(clients.map(c => [c.id, c.name]))

    const result = grouped.map(g => ({
      clientId:   g.clientId,
      clientName: clientMap.get(g.clientId) ?? '',
      count:      g._count.id,
    }))

    return reply.send(result)
  })

  // ── DELETE /api/communications/:id – hard delete (ADMIN only)
  app.delete('/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError('רק מנהל מערכת יכול למחוק הודעות')

    const { id } = req.params as { id: string }

    const message = await prisma.communicationMessage.findUnique({ where: { id } })
    if (!message) throw new NotFoundError('הודעה', id)

    await prisma.communicationMessage.delete({ where: { id } })

    await writeAuditLog({
      userId:     caller.sub,
      clientId:   message.clientId,
      action:     'COMMUNICATION_MESSAGE_DELETED',
      entityType: 'CommunicationMessage',
      entityId:   id,
      before:     message,
    })

    return reply.status(204).send()
  })
}
