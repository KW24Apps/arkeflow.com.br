import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from './AppError'

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code })
  }

  if (error instanceof ZodError) {
    return reply.status(422).send({ error: 'Dados inválidos', issues: error.issues })
  }

  // Erros de validação do próprio Fastify (schema JSON)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  console.error('[unhandled]', error)
  return reply.status(500).send({ error: 'Erro interno do servidor' })
}
