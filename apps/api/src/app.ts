import Fastify from 'fastify'
import { authRoutes } from './modules/auth/auth.routes'
import { produtosRoutes }  from './modules/produtos/produtos.routes'
import { catalogosRoutes } from './modules/catalogos/catalogos.routes'
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

  app.register(authRoutes,    { prefix: '/auth' })
  app.register(produtosRoutes,  { prefix: '/produtos' })
  app.register(catalogosRoutes, { prefix: '/catalogos' })

  return app
}
