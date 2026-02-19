import bcrypt from 'bcryptjs'
import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { config } from '../shared/config'
import { UnauthorizedError } from '../shared/errors'
import { JwtPayload } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { addDays } from '../shared/dateUtils'

export async function loginUser(
  app: FastifyInstance,
  email: string,
  password: string,
  ipAddress?: string,
) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !user.isActive) throw new UnauthorizedError('אימייל או סיסמה שגויים')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('אימייל או סיסמה שגויים')

  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, type: 'access' }
  const accessToken = app.jwt.sign(payload, { expiresIn: config.JWT_EXPIRES_IN as string })

  const refreshPayload: JwtPayload = { ...payload, type: 'refresh' }
  const refreshToken = app.jwt.sign(refreshPayload, { expiresIn: config.JWT_REFRESH_EXPIRES_IN as string, secret: config.JWT_REFRESH_SECRET })

  await prisma.refreshToken.create({
    data: {
      token:     refreshToken,
      userId:    user.id,
      expiresAt: addDays(new Date(), 7),
    },
  })

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  await writeAuditLog({
    userId:     user.id,
    action:     'USER_LOGIN',
    entityType: 'User',
    entityId:   user.id,
    source:     'UI',
    ipAddress,
    notes:      `כניסה למערכת: ${user.email}`,
  })

  const { passwordHash: _, mfaSecret: __, ...safeUser } = user
  return { accessToken, refreshToken, user: safeUser }
}

export async function refreshAccessToken(app: FastifyInstance, token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } })
  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token לא תקין או פג תוקף')
  }

  let decoded: JwtPayload
  try {
    decoded = app.jwt.verify<JwtPayload>(token, { key: config.JWT_REFRESH_SECRET })
  } catch {
    throw new UnauthorizedError('Refresh token לא תקין')
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } })
  if (!user || !user.isActive) throw new UnauthorizedError('משתמש לא פעיל')

  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, type: 'access' }
  const accessToken = app.jwt.sign(payload, { expiresIn: config.JWT_EXPIRES_IN as string })

  return { accessToken }
}

export async function logoutUser(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } })
}
