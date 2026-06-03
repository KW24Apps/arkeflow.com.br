import type { FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../errors/AppError'
import type { JwtPayload, NivelUsuario } from '@arkeflow/shared'

// Retorna um hook que bloqueia níveis não listados
export function authorize(...niveis: NivelUsuario[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as JwtPayload
    if (!niveis.includes(user?.nivel)) {
      throw new AppError('Acesso negado', 403, 'FORBIDDEN')
    }
  }
}
