import type { FastifyInstance } from 'fastify'
import { loginHandler, meHandler } from './auth.controller'
import { authMiddleware } from '../../core/middlewares/auth'

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', loginHandler)
  app.get('/me', { preHandler: authMiddleware }, meHandler)
}
