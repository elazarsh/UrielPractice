import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginUser, refreshAccessToken, logoutUser } from './auth.service'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post('/login', async (req, reply) => {
    const body = loginSchema.parse(req.body)
    const result = await loginUser(app, body.email, body.password, req.ip)
    return reply.status(200).send(result)
  })

  // POST /api/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const body = refreshSchema.parse(req.body)
    const result = await refreshAccessToken(app, body.refreshToken)
    return reply.status(200).send(result)
  })

  // POST /api/auth/logout
  app.post('/logout', async (req, reply) => {
    const body = refreshSchema.parse(req.body)
    await logoutUser(body.refreshToken)
    return reply.status(200).send({ message: 'התנתקת בהצלחה' })
  })

  // GET /api/auth/me  (requires auth)
  app.get('/me', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const user = await import('../shared/prisma').then(({ prisma }) =>
      prisma.user.findUnique({
        where:  { id: (req.user as { sub: string }).sub },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, lastLoginAt: true },
      })
    )
    return reply.send(user)
  })
}
