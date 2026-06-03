import type { FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../errors/AppError'

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    throw new AppError('Não autorizado', 401, 'UNAUTHORIZED')
  }
}
