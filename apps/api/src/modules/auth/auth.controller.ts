import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginSchema } from './auth.schema'
import { login } from './auth.service'
import { AppError } from '../../core/errors/AppError'

function extractSid(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const raw = authHeader.slice(7).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(raw, 'base64').toString())
    return typeof payload?.sid === 'string' ? payload.sid : null
  } catch {
    return null
  }
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, senha, forcar, plataforma } = loginSchema.parse(request.body)
  const ip = request.headers['x-forwarded-for']?.toString() || request.ip
  const currentSid = extractSid(request.headers.authorization)

  try {
    const payload = await login(email, senha, ip, forcar, plataforma, currentSid)
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
