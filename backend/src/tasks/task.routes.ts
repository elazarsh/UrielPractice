import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { STAFF_ROLES, paginate } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { TaskType, Priority, TaskStatus, UserRole } from '@prisma/client'

const taskSchema = z.object({
  title:          z.string().min(1),
  description:    z.string().optional(),
  taskType:       z.nativeEnum(TaskType),
  priority:       z.nativeEnum(Priority).optional(),
  clientId:       z.string().uuid().optional(),
  processId:      z.string().uuid().optional(),
  assigneeId:     z.string().uuid().optional(),
  dueDate:        z.string().datetime().optional(),
  estimatedHours: z.number().positive().optional(),
  isRecurring:    z.boolean().optional(),
  recurringRule:  z.string().optional(),
  checklist:      z.array(z.object({ item: z.string(), done: z.boolean() })).optional(),
  notes:          z.string().optional(),
})

export async function taskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/tasks
  app.get('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const q = req.query as {
      assigneeId?: string; clientId?: string; status?: TaskStatus;
      taskType?: TaskType; priority?: Priority; myTasks?: string;
      page?: string; limit?: string
    }
    const page  = parseInt(q.page  ?? '1')
    const limit = parseInt(q.limit ?? '25')
    const where: Record<string, unknown> = {}
    if (q.myTasks === 'true') where.assigneeId = caller.sub
    else if (q.assigneeId) where.assigneeId = q.assigneeId
    if (q.clientId) where.clientId = q.clientId
    if (q.status)   where.status   = q.status
    if (q.taskType) where.taskType = q.taskType
    if (q.priority) where.priority = q.priority

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          client:   { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      }),
      prisma.task.count({ where }),
    ])
    return reply.send(paginate(tasks, total, page, limit))
  })

  // GET /api/tasks/workload  – עומס עובדים
  app.get('/workload', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { not: 'CLIENT_USER' } },
      select: { id: true, firstName: true, lastName: true, role: true },
    })
    const workload = await Promise.all(users.map(async u => {
      const [open, inProgress, overdue] = await Promise.all([
        prisma.task.count({ where: { assigneeId: u.id, status: 'OPEN' } }),
        prisma.task.count({ where: { assigneeId: u.id, status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { assigneeId: u.id, status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } } }),
      ])
      return { user: u, open, inProgress, overdue, total: open + inProgress }
    }))
    return reply.send(workload)
  })

  // POST /api/tasks
  app.post('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const body = taskSchema.parse(req.body)
    const task = await prisma.task.create({
      data: {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        createdById: caller.sub,
        checklist: body.checklist ?? [],
      },
      include: {
        client:   { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    await writeAuditLog({ userId: caller.sub, clientId: body.clientId, action: 'TASK_CREATED', entityType: 'Task', entityId: task.id, after: task })
    return reply.status(201).send(task)
  })

  // GET /api/tasks/:id
  app.get('/:id', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        client:    { select: { id: true, name: true } },
        assignee:  { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        process:   { select: { id: true, periodLabel: true, status: true } },
      },
    })
    if (!task) throw new NotFoundError('משימה', id)
    return reply.send(task)
  })

  // PATCH /api/tasks/:id
  app.patch('/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const body = taskSchema.partial().extend({
      status: z.nativeEnum(TaskStatus).optional(),
    }).parse(req.body)
    const updateData: Record<string, unknown> = {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    }
    if (body.status === 'IN_PROGRESS') updateData.startedAt   = new Date()
    if (body.status === 'DONE')        updateData.completedAt = new Date()
    const updated = await prisma.task.update({ where: { id }, data: updateData })
    await writeAuditLog({ userId: caller.sub, action: 'TASK_UPDATED', entityType: 'Task', entityId: id, after: { status: body.status } })
    return reply.send(updated)
  })

  // DELETE /api/tasks/:id
  app.delete('/:id', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    await prisma.task.update({ where: { id }, data: { status: 'CANCELLED' } })
    return reply.status(204).send()
  })
}
