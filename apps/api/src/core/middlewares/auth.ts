import type { FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../errors/AppError'
import { platformPool, getTenantPool } from '../../config/database'
import type { JwtPayload } from '@arkeflow/shared'

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    throw new AppError('Não autorizado', 401, 'UNAUTHORIZED')
  }

  const user = request.user as JwtPayload

  // Platform admins have no tenant context — just refresh activity and proceed
  if (!user.banco_id || !user.loja_id) {
    await platformPool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [user.id])
    return
  }

  // Fetch last activity + inactivity config in parallel (two indexed PK lookups)
  const [usuarioRes, cfgRes] = await Promise.all([
    platformPool.query<{ ultimo_acesso: Date | null }>(
      'SELECT ultimo_acesso FROM usuarios WHERE id = $1', [user.id]
    ),
    getTenantPool(user.banco_id).query<{ inatividade_minutos: number }>(
      'SELECT inatividade_minutos FROM configuracoes_loja LIMIT 1'
    ),
  ])

  const ultimoAcesso: Date | null = usuarioRes.rows[0]?.ultimo_acesso ?? null
  const inatividadeMinutos: number = cfgRes.rows[0]?.inatividade_minutos ?? 360

  if (ultimoAcesso !== null) {
    const diffMinutes = (Date.now() - ultimoAcesso.getTime()) / 60000
    if (diffMinutes > inatividadeMinutos) {
      throw new AppError('Sessão expirada por inatividade', 401, 'SESSAO_EXPIRADA')
    }
  }

  // Refresh the inactivity clock
  await platformPool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [user.id])
}
