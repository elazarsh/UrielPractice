import { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError } from '../shared/errors'

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    throw new UnauthorizedError('נדרשת התחברות. אנא התחבר מחדש.')
  }
}
