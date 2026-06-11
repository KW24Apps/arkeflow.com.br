import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginSchema } from './auth.schema'
import { login } from './auth.service'
import { AppError } from '../../core/errors/AppError'

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, senha, forcar } = loginSchema.parse(request.body)
  const ip = request.headers['x-forwarded-for']?.toString() || request.ip

  try {
    const payload = await login(email, senha, ip, forcar)
    const token = await reply.jwtSign(payload, { expiresIn: '7d' })
    return reply.send({ token, usuario: payload })
  } catch (err) {
    if (err instanceof AppError && err.code === 'SESSAO_ATIVA') {
      const d = err.data as { ip: string | null; em: Date | null }
      return reply.status(409).send({ code: 'SESSAO_ATIVA', ip: d.ip, em: d.em })
    }
    throw err
  }
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify()
  return reply.send({ usuario: request.user })
}
