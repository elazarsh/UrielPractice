import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../shared/prisma'
import { ForbiddenError, NotFoundError, ConflictError } from '../shared/errors'
import { ADMIN_ROLES, paginate } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { UserRole } from '@prisma/client'

const createUserSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  role:      z.nativeEnum(UserRole),
  phone:     z.string().optional(),
})

const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  isActive: z.boolean().optional(),
})

export async function userRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook('preHandler', app.authenticate)

  // GET /api/users
  app.get('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { page = 1, limit = 50 } = req.query as { page?: number; limit?: number }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, phone: true, lastLoginAt: true, createdAt: true },
        orderBy: { firstName: 'asc' },
      }),
      prisma.user.count(),
    ])
    return reply.send(paginate(users, total, page, limit))
  })

  // POST /api/users
  app.post('/', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()
    const body = createUserSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
    if (existing) throw new ConflictError(`משתמש עם אימייל זה כבר קיים`)
    const hash = await bcrypt.hash(body.password, 12)
    const user = await prisma.user.create({
      data: { ...body, email: body.email.toLowerCase(), passwordHash: hash },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    })
    await writeAuditLog({ userId: caller.sub, action: 'USER_CREATED', entityType: 'User', entityId: user.id, after: user })
    return reply.status(201).send(user)
  })

  // GET /api/users/:id
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role) && caller.sub !== id) throw new ForbiddenError()
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, phone: true, lastLoginAt: true, createdAt: true },
    })
    if (!user) throw new NotFoundError('משתמש', id)
    return reply.send(user)
  })

  // PATCH /api/users/:id
  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role) && caller.sub !== id) throw new ForbiddenError()
    const body = updateUserSchema.parse(req.body)
    const before = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, isActive: true } })
    if (!before) throw new NotFoundError('משתמש', id)
    const updated = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    })
    await writeAuditLog({ userId: caller.sub, action: 'USER_UPDATED', entityType: 'User', entityId: id, before, after: updated })
    return reply.send(updated)
  })

  // POST /api/users/:id/reset-password (admin only)
  app.post('/:id/reset-password', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!ADMIN_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body)
    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id }, data: { passwordHash: hash } })
    await writeAuditLog({ userId: caller.sub, action: 'USER_PASSWORD_RESET', entityType: 'User', entityId: id })
    return reply.send({ message: 'סיסמה עודכנה בהצלחה' })
  })
}
