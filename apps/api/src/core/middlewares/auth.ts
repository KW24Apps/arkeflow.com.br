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

  // Platform admins have no tenant context — sid check only, then refresh
  if (!user.banco_id || !user.loja_id) {
    if (user.sid) {
      const { rows: [u] } = await platformPool.query<{ sessao_atual: string | null }>(
        'SELECT sessao_atual FROM usuarios WHERE id = $1', [user.id]
      )
      if (u?.sessao_atual !== user.sid) {
        throw new AppError('Sessão encerrada — login em outro dispositivo', 401, 'SESSAO_SUBSTITUIDA')
      }
    }
    await platformPool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [user.id])
    return
  }

  // Tenant users: sid check + inactivity check in parallel
  const [usuarioRes, cfgRes] = await Promise.all([
    platformPool.query<{ ultimo_acesso: Date | null; sessao_atual: string | null }>(
      'SELECT ultimo_acesso, sessao_atual FROM usuarios WHERE id = $1', [user.id]
    ),
    getTenantPool(user.banco_id).query<{ inatividade_minutos: number }>(
      'SELECT inatividade_minutos FROM configuracoes_loja LIMIT 1'
    ),
  ])

  const ultimoAcesso: Date | null    = usuarioRes.rows[0]?.ultimo_acesso ?? null
  const sessaoAtual: string | null   = usuarioRes.rows[0]?.sessao_atual ?? null
  const inatividadeMinutos: number   = cfgRes.rows[0]?.inatividade_minutos ?? 360

  // Order: sid check first, then inactivity
  if (user.sid && sessaoAtual !== user.sid) {
    throw new AppError('Sessão encerrada — login em outro dispositivo', 401, 'SESSAO_SUBSTITUIDA')
  }

  if (ultimoAcesso !== null) {
    const diffMinutes = (Date.now() - ultimoAcesso.getTime()) / 60000
    if (diffMinutes > inatividadeMinutos) {
      throw new AppError('Sessão expirada por inatividade', 401, 'SESSAO_EXPIRADA')
    }
  }

  await platformPool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [user.id])
}
