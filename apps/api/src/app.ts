import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { env } from './config/env'
import { errorHandler } from './core/errors/handler'
import { authRoutes }           from './modules/auth/auth.routes'
import { produtosRoutes }       from './modules/produtos/produtos.routes'
import { catalogosRoutes }      from './modules/catalogos/catalogos.routes'
import { clientesRoutes }       from './modules/clientes/clientes.routes'
import { cashbackRoutes }       from './modules/clientes/cashback.routes'
import { estoqueRoutes }        from './modules/estoque/estoque.routes'
import { financeiroRoutes }     from './modules/financeiro/financeiro.routes'
import { formasPagamentoRoutes}  from './modules/financeiro/formas-pagamento.routes'
import { colaboradoresRoutes }   from './modules/colaboradores/colaboradores.routes'
import { documentosRoutes }      from './modules/colaboradores/documentos.routes'

export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV === 'development' })

  app.register(cors, { origin: true })
  app.register(jwt,  { secret: env.JWT_SECRET })
  app.setErrorHandler(errorHandler)

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(authRoutes,            { prefix: '/auth' })
  app.register(produtosRoutes,        { prefix: '/produtos' })
  app.register(catalogosRoutes,       { prefix: '/catalogos' })
  app.register(clientesRoutes,        { prefix: '/clientes' })
  app.register(cashbackRoutes,        { prefix: '/cashback-regras' })
  app.register(estoqueRoutes,         { prefix: '/estoque' })
  app.register(financeiroRoutes,      { prefix: '/financeiro' })
  app.register(formasPagamentoRoutes, { prefix: '/formas-pagamento' })
  app.register(colaboradoresRoutes,   { prefix: '/colaboradores' })
  app.register(documentosRoutes,      { prefix: '/colaboradores' })

  return app
}
