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
  const isWeb = !user.plataforma || user.plataforma === 'web' || user.plataforma === 'desktop'

  // Platform admins have no tenant context — sid check only, then refresh
  if (!user.banco_id || !user.loja_id) {
    if (user.sid) {
      const { rows: [u] } = await platformPool.query<{ sessao: string | null }>(
        `SELECT ${isWeb ? 'sessao_web' : 'sessao_mobile'} AS sessao FROM usuarios WHERE id = $1`,
        [user.id]
      )
      if (u?.sessao !== user.sid) {
        await platformPool.query(
          `INSERT INTO logs_acesso (usuario_id, loja_id, ip, tipo, plataforma, motivo)
           VALUES ($1, $2, $3, 'logout', $4, 'substituido')`,
          [user.id, user.loja_id ?? null, request.ip, user.plataforma ?? 'web']
        ).catch(() => {})
        throw new AppError('Sessão encerrada — login em outro dispositivo', 401, 'SESSAO_SUBSTITUIDA')
      }
    }
    await platformPool.query(
      `UPDATE usuarios SET ${isWeb ? 'ultimo_acesso_web' : 'ultimo_acesso_mobile'} = NOW() WHERE id = $1`,
      [user.id]
    )
    return
  }

  // Tenant users: sid check + inactivity check in parallel
  const [usuarioRes, cfgRes] = await Promise.all([
    platformPool.query<{ ultimo_acesso_web: Date | null; ultimo_acesso_mobile: Date | null; sessao_web: string | null; sessao_mobile: string | null }>(
      'SELECT ultimo_acesso_web, ultimo_acesso_mobile, sessao_web, sessao_mobile FROM usuarios WHERE id = $1', [user.id]
    ),
    getTenantPool(user.banco_id).query<{ inatividade_minutos: number }>(
      'SELECT inatividade_minutos FROM configuracoes_loja LIMIT 1'
    ),
  ])

  const ultimoAcesso: Date | null = isWeb
    ? (usuarioRes.rows[0]?.ultimo_acesso_web ?? null)
    : (usuarioRes.rows[0]?.ultimo_acesso_mobile ?? null)
  const sessaoAtual: string | null = (isWeb ? usuarioRes.rows[0]?.sessao_web : usuarioRes.rows[0]?.sessao_mobile) ?? null
  const inatividadeMinutos: number = cfgRes.rows[0]?.inatividade_minutos ?? 360

  // Order: sid check first, then inactivity
  if (user.sid && sessaoAtual !== user.sid) {
    await platformPool.query(
      `INSERT INTO logs_acesso (usuario_id, loja_id, ip, tipo, plataforma, motivo)
       VALUES ($1, $2, $3, 'logout', $4, 'substituido')`,
      [user.id, user.loja_id ?? null, request.ip, user.plataforma ?? 'web']
    ).catch(() => {})
    throw new AppError('Sessão encerrada — login em outro dispositivo', 401, 'SESSAO_SUBSTITUIDA')
  }

  if (ultimoAcesso !== null) {
    const diffMinutes = (Date.now() - ultimoAcesso.getTime()) / 60000
    if (diffMinutes > inatividadeMinutos) {
      await platformPool.query(
        `INSERT INTO logs_acesso (usuario_id, loja_id, ip, tipo, plataforma, motivo)
         VALUES ($1, $2, $3, 'logout', $4, 'expirado')`,
        [user.id, user.loja_id ?? null, request.ip, user.plataforma ?? 'web']
      ).catch(() => {})
      throw new AppError('Sessão expirada por inatividade', 401, 'SESSAO_EXPIRADA')
    }
  }

  await platformPool.query(
    `UPDATE usuarios SET ${isWeb ? 'ultimo_acesso_web' : 'ultimo_acesso_mobile'} = NOW() WHERE id = $1`,
    [user.id]
  )
}
