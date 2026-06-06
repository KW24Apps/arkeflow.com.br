import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { AppError } from '../../core/errors/AppError'

const dono = [authMiddleware, authorize('dono_loja')]
const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const schema = z.object({
  nome:                 z.string().min(1),
  tipo:                 z.string().min(1),
  desconto_percentual:  z.coerce.number().min(0).max(100).default(0),
  desconto_maximo:      z.coerce.number().min(0).default(0),
  ativo:                z.boolean().default(true),
  aceita_desconto:      z.boolean().default(true),
})

export async function formasPagamentoRoutes(app: FastifyInstance) {

  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { incluir_inativos } = (req.query ?? {}) as { incluir_inativos?: string }
    const where = incluir_inativos === 'true' ? '' : 'WHERE ativo = true'
    const { rows } = await pool.query(
      `SELECT * FROM formas_pagamento ${where} ORDER BY padrao_sistema DESC, nome`
    )
    return reply.send(rows)
  })

  app.post('/', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const data = schema.parse(req.body)
    const { rows: [r] } = await pool.query(
      `INSERT INTO formas_pagamento (nome, tipo, desconto_percentual, desconto_maximo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.nome, data.tipo, data.desconto_percentual, data.desconto_maximo]
    )
    return reply.status(201).send(r)
  })

  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const data = schema.partial().parse(req.body)

    const { rows: [atual] } = await pool.query(
      `SELECT padrao_sistema, nome, tipo FROM formas_pagamento WHERE id = $1`, [id]
    )
    // Block only when padrao_sistema fields are actually being changed
    if (atual?.padrao_sistema) {
      if (data.nome !== undefined && data.nome !== atual.nome)
        throw new AppError('Nome de formas padrão do sistema não pode ser alterado.', 400)
      if (data.tipo !== undefined && data.tipo !== atual.tipo)
        throw new AppError('Tipo de formas padrão do sistema não pode ser alterado.', 400)
    }

    const keys   = Object.keys(data)
    const values = Object.values(data)
    const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const { rows: [r] } = await pool.query(
      `UPDATE formas_pagamento SET ${set} WHERE id = $1 RETURNING *`, [id, ...values]
    )
    return reply.send(r)
  })

  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { rows: [fp] } = await pool.query(
      `SELECT padrao_sistema FROM formas_pagamento WHERE id = $1`, [id]
    )
    if (fp?.padrao_sistema) {
      throw new AppError('Formas de pagamento padrão do sistema não podem ser removidas.', 400)
    }
    await pool.query(`UPDATE formas_pagamento SET ativo = false WHERE id = $1`, [id])
    return reply.status(204).send()
  })
}
