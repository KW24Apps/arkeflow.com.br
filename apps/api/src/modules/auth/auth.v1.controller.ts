import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginV1Schema } from './auth.v1.schema'
import { login } from './auth.service'
import { resolveApiKeyCaller, resolveClienteIdSemAutenticar, assertLicenciado, buildIdentityResponse } from './auth.v1.service'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

export async function loginV1Handler(request: FastifyRequest, reply: FastifyReply) {
  const caller = await resolveApiKeyCaller(request.headers['x-api-key']?.toString())
  const { email, senha, produto_slug } = loginV1Schema.parse(request.body)

  // A key pertence a um produto específico -- não pode ser usada pra checar licença de outro.
  if (caller.slug !== produto_slug) {
    throw new AppError('Chave de API não corresponde ao produto solicitado', 403, 'API_KEY_PRODUTO_DIVERGENTE')
  }

  // Checa licença ANTES de autenticar de verdade -- login() muda sessao_web/sid como efeito
  // colateral de validar a senha, e isso não pode acontecer pra uma conta sem licença (ver nota
  // em resolveClienteIdSemAutenticar). Se a conta nem existe, deixa pra login() dar o erro real.
  const preCheck = await resolveClienteIdSemAutenticar(email)
  if (preCheck.found) {
    await assertLicenciado(preCheck.clienteId, produto_slug)
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
