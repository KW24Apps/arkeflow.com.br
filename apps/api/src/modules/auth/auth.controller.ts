import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginSchema } from './auth.schema'
import { login } from './auth.service'

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, senha } = loginSchema.parse(request.body)
  const payload = await login(email, senha)
  const token = await reply.jwtSign(payload, { expiresIn: '7d' })
  return reply.send({ token, usuario: payload })
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify()
  return reply.send({ usuario: request.user })
}
