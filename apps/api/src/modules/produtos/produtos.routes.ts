import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import * as ctrl from './produtos.controller'

const dono = [authMiddleware, authorize('dono_loja')]
const loja = [authMiddleware, authorize('dono_loja', 'vendedor')]

export async function produtosRoutes(app: FastifyInstance) {
  // Listagem e consulta — vendedor também pode ler
  app.get('/',    { preHandler: loja }, ctrl.listHandler)
  app.get('/:id', { preHandler: loja }, ctrl.getHandler)

  // CRUD — apenas dono da loja
  app.post('/',    { preHandler: dono }, ctrl.createHandler)
  app.put('/:id',  { preHandler: dono }, ctrl.updateHandler)
  app.delete('/:id', { preHandler: dono }, ctrl.deleteHandler)

  // Atributos
  app.post('/:id/atributos',               { preHandler: dono }, ctrl.addAtributoHandler)
  app.delete('/:id/atributos/:atributo_id',{ preHandler: dono }, ctrl.removeAtributoHandler)

  // Versões
  app.post('/:id/versoes',              { preHandler: dono }, ctrl.createVersaoHandler)
  app.put('/:id/versoes/:versao_id',    { preHandler: dono }, ctrl.updateVersaoHandler)
  app.delete('/:id/versoes/:versao_id', { preHandler: dono }, ctrl.deleteVersaoHandler)
}
