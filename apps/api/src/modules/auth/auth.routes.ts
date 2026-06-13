import type { FastifyInstance } from 'fastify'
import { loginHandler, meHandler } from './auth.controller'
import { authMiddleware } from '../../core/middlewares/auth'
import { platformPool } from '../../config/database'
import type { JwtPayload } from '@arkeflow/shared'

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', loginHandler)
  app.get('/me', { preHandler: authMiddleware }, meHandler)

  // Heartbeat — atualiza ultimo_acesso enquanto o usuário está com a aba aberta
  app.post('/ping', { preHandler: authMiddleware }, async (req, reply) => {
    const user = req.user as JwtPayload
    await platformPool.query(
      'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [user.id]
    )
    return reply.send({ ok: true })
  })

  // Registra saída e invalida sessão da plataforma atual
  app.post('/logout', { preHandler: authMiddleware }, async (req, reply) => {
    const user = req.user as JwtPayload
    const isWeb = user.plataforma === 'web' || user.plataforma === 'desktop'
    const clearCol = isWeb
      ? 'sessao_web = NULL, sessao_web_ip = NULL, sessao_web_em = NULL'
      : 'sessao_mobile = NULL, sessao_mobile_ip = NULL, sessao_mobile_em = NULL'
    await Promise.all([
      platformPool.query(
        `UPDATE usuarios SET ${clearCol} WHERE id = $1`,
        [user.id]
      ),
      platformPool.query(
        `INSERT INTO logs_acesso (usuario_id, loja_id, ip, tipo) VALUES ($1,$2,$3,'logout')`,
        [user.id, user.loja_id ?? null,
         req.headers['x-forwarded-for']?.toString() || req.ip]
      ).catch(() => {}),
    ])
    return reply.send({ ok: true })
  })
}
