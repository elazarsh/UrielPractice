import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { ForbiddenError } from '../shared/errors'
import { ADMIN_ROLES, STAFF_ROLES, paginate } from '../shared/types'
import { UserRole } from '@prisma/client'

// ─────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // ── GET /api/audit ───────────────────────────────────────────────────────────
  // Paginated full audit log with optional filters. ADMIN only.
  app.get('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()

    const q = req.query as {
      userId?:     string
      clientId?:   string
      entityType?: string
      action?:     string
      dateFrom?:   string
      dateTo?:     string
      page?:       string
      limit?:      string
    }

    const page  = Math.max(1, parseInt(q.page  ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '25')))

    const where: Record<string, unknown> = {}
    if (q.userId)     where.userId     = q.userId
    if (q.clientId)   where.clientId   = q.clientId
    if (q.entityType) where.entityType = q.entityType
    if (q.action)     where.action     = q.action

    if (q.dateFrom || q.dateTo) {
      const createdAt: Record<string, Date> = {}
      if (q.dateFrom) createdAt.gte = new Date(q.dateFrom)
      if (q.dateTo)   createdAt.lte = new Date(q.dateTo)
      where.createdAt = createdAt
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          user:   { select: { id: true, firstName: true, lastName: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ])

    return reply.send(paginate(logs, total, page, limit))
  })

  // ── GET /api/audit/actions ───────────────────────────────────────────────────
  // Distinct action types that exist in the audit log (for filter dropdowns). ADMIN only.
  // NOTE: Must be declared before /client/:clientId and /entity/:entityType/:entityId
  //       so the literal segment "actions" is matched first.
  app.get('/actions', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()

    const rows = await prisma.auditLog.groupBy({
      by:      ['action'],
      orderBy: { action: 'asc' },
    })

    return reply.send(rows.map(r => r.action))
  })

  // ── GET /api/audit/client/:clientId ─────────────────────────────────────────
  // Audit log scoped to a specific client. Accessible by all Staff roles.
  app.get('/client/:clientId', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { clientId } = req.params as { clientId: string }
    const q = req.query as { page?: string; limit?: string }

    const page  = Math.max(1, parseInt(q.page  ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '25')))

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where:   { clientId },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: { clientId } }),
    ])

    return reply.send(paginate(logs, total, page, limit))
  })

  // ── GET /api/audit/entity/:entityType/:entityId ──────────────────────────────
  // Audit log for a specific entity (e.g. a Document, Task, or ProcessInstance). ADMIN only.
  app.get('/entity/:entityType/:entityId', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()

    const { entityType, entityId } = req.params as { entityType: string; entityId: string }
    const q = req.query as { page?: string; limit?: string }

    const page  = Math.max(1, parseInt(q.page  ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '25')))

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where:   { entityType, entityId },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          user:   { select: { id: true, firstName: true, lastName: true } },
          client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: { entityType, entityId } }),
    ])

    return reply.send(paginate(logs, total, page, limit))
  })
}
