import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginV1Schema } from './auth.v1.schema'
import { login } from './auth.service'
import { resolveApiKeyCaller, assertLicenciado, buildIdentityResponse } from './auth.v1.service'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

export async function loginV1Handler(request: FastifyRequest, reply: FastifyReply) {
  const caller = await resolveApiKeyCaller(request.headers['x-api-key']?.toString())
  const { email, senha, produto_slug } = loginV1Schema.parse(request.body)

  // A key pertence a um produto específico -- não pode ser usada pra checar licença de outro.
  if (caller.slug !== produto_slug) {
    throw new AppError('Chave de API não corresponde ao produto solicitado', 403, 'API_KEY_PRODUTO_DIVERGENTE')
  }

  const ip = request.headers['x-forwarded-for']?.toString() || request.ip

  let payload: JwtPayload
  try {
    payload = await login(email, senha, ip, false, 'web')
  } catch (err) {
    if (err instanceof AppError && err.code === 'SESSAO_ATIVA') {
      return reply.status(409).send({ error: err.message, code: 'SESSAO_ATIVA' })
    }
    throw err
  }

  await assertLicenciado(payload.cliente_id, produto_slug)

  const token    = await reply.jwtSign(payload, { expiresIn: '7d' })
  const identity = await buildIdentityResponse(payload)

  return reply.send({ token, ...identity })
}

export async function meV1Handler(request: FastifyRequest, reply: FastifyReply) {
  await resolveApiKeyCaller(request.headers['x-api-key']?.toString())
  await request.jwtVerify()

  const payload  = request.user as JwtPayload
  const identity = await buildIdentityResponse(payload)

  return reply.send(identity)
}
