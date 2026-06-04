import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { createClienteSchema, updateClienteSchema } from './clientes.schema'
import * as repo from './clientes.repository'
import { AppError } from '../../core/errors/AppError'

const auth  = [authMiddleware, authorize('dono_loja', 'vendedor')]
const dono  = [authMiddleware, authorize('dono_loja')]

export async function clientesRoutes(app: FastifyInstance) {

  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { q } = req.query as { q?: string }
    return reply.send(await repo.findAll(pool, q))
  })

  app.get('/:id', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const c = await repo.findById(pool, id)
    if (!c) throw new AppError('Cliente não encontrado', 404)
    return reply.send(c)
  })

  app.get('/:id/historico', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    return reply.send(await repo.findHistorico(pool, id))
  })

  app.post('/', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const data = createClienteSchema.parse(req.body)
    return reply.status(201).send(await repo.create(pool, data))
  })

  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const data = updateClienteSchema.parse(req.body)
    return reply.send(await repo.update(pool, id, data))
  })

  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    await repo.softDelete(pool, id)
    return reply.status(204).send()
  })
}
