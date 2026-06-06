import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
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
import { configuracoesRoutes }      from './modules/configuracoes/configuracoes.routes'
import { dadosLojaRoutes }          from './modules/configuracoes/dados-loja.routes'
import { modelosPermissaoRoutes }   from './modules/colaboradores/modelos-permissao.routes'
import { promocoesRoutes }          from './modules/promocoes/promocoes.routes'
import { vendasRoutes }             from './modules/vendas/vendas.routes'
import { caixaRoutes }              from './modules/caixa/caixa.routes'
import { sacolasRoutes }            from './modules/sacolas/sacolas.routes'

export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV === 'development' })

  app.register(cors, { origin: true })
  app.register(jwt,  { secret: env.JWT_SECRET })
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB
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
  app.register(configuracoesRoutes,    { prefix: '/configuracoes-loja' })
  app.register(dadosLojaRoutes,        { prefix: '/dados-loja' })
  app.register(modelosPermissaoRoutes, { prefix: '/modelos-permissao' })
  app.register(promocoesRoutes,        { prefix: '/promocoes' })
  app.register(vendasRoutes,           { prefix: '/vendas' })
  app.register(caixaRoutes,            { prefix: '/caixa' })
  app.register(sacolasRoutes,          { prefix: '/sacolas' })

  return app
}
