import type { FastifyInstance } from 'fastify'
import { loginHandler, meHandler } from './auth.controller'
import { authMiddleware } from '../../core/middlewares/auth'
import { platformPool } from '../../config/database'
import type { JwtPayload } from '@arkeflow/shared'

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', loginHandler)
  app.get('/me', { preHandler: authMiddleware }, meHandler)

  // Registra saída e limpa sessão
  app.post('/logout', { preHandler: authMiddleware }, async (req, reply) => {
    const user = req.user as JwtPayload
    await platformPool.query(
      `INSERT INTO logs_acesso (usuario_id, loja_id, ip, tipo) VALUES ($1,$2,$3,'logout')`,
      [user.id, user.loja_id ?? null,
       req.headers['x-forwarded-for']?.toString() || req.ip]
    ).catch(() => {})
    return reply.send({ ok: true })
  })
}
