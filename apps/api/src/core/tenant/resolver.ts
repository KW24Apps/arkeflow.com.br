import type { FastifyRequest } from 'fastify'
import { getTenantPool } from '../../config/database'
import { AppError } from '../errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

// Retorna o pool do banco da loja autenticada na requisição
export function getTenantPoolFromRequest(request: FastifyRequest) {
  const user = request.user as JwtPayload
  if (!user?.banco_id) throw new AppError('Contexto de loja não encontrado', 401)
  return getTenantPool(user.banco_id)
}
