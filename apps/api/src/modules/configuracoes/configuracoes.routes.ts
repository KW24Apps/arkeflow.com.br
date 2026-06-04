import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'

const dono = [authMiddleware, authorize('dono_loja')]
const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const schema = z.object({
  controle_estoque: z.boolean().optional(),
})

export async function configuracoesRoutes(app: FastifyInstance) {

  // Lê configurações da loja
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows: [cfg] } = await pool.query(`SELECT * FROM configuracoes_loja LIMIT 1`)
    return reply.send(cfg ?? { controle_estoque: true })
  })

  // Atualiza configurações
  app.put('/', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const data = schema.parse(req.body)

    const keys   = Object.keys(data)
    const values = Object.values(data)
    const set    = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')

    const { rows: [cfg] } = await pool.query(
      `UPDATE configuracoes_loja SET ${set}, atualizado_em = NOW() RETURNING *`,
      values
    )
    return reply.send(cfg)
  })
}
