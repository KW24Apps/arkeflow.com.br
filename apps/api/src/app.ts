import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { env } from './config/env'
import { errorHandler } from './core/errors/handler'

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
  })

  app.register(cors, { origin: true })
  app.register(jwt, { secret: env.JWT_SECRET })

  app.setErrorHandler(errorHandler)

  app.get('/health', async () => ({ status: 'ok' }))

  // Módulos registrados aqui conforme cada fase é implementada
  // app.register(authRoutes,    { prefix: '/auth' })
  // app.register(produtosRoutes, { prefix: '/produtos' })

  return app
}
