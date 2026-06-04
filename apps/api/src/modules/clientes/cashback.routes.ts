import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { AppError } from '../../core/errors/AppError'

const dono = [authMiddleware, authorize('dono_loja')]
const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const regraSchema = z.object({
  nome:           z.string().min(1),
  percentual:     z.coerce.number().min(0).max(100),
  validade_meses: z.coerce.number().int().positive().optional().nullable(),
  padrao:         z.boolean().optional(),
  ativo:          z.boolean().optional(),
})

export async function cashbackRoutes(app: FastifyInstance) {

  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows } = await pool.query(
      `SELECT * FROM regras_cashback WHERE ativo = true ORDER BY padrao DESC, nome`
    )
    return reply.send(rows)
  })

  app.post('/', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const data = regraSchema.parse(req.body)

    // Se marcada como padrão, desmarca as outras
    if (data.padrao) {
      await pool.query(`UPDATE regras_cashback SET padrao = false`)
    }

    const { rows: [r] } = await pool.query(
      `INSERT INTO regras_cashback (nome, percentual, validade_meses, padrao)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.nome, data.percentual, data.validade_meses ?? null, data.padrao ?? false]
    )
    return reply.status(201).send(r)
  })

  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const data = regraSchema.partial().parse(req.body)

    if (data.padrao) {
      await pool.query(`UPDATE regras_cashback SET padrao = false`)
    }

    const keys   = Object.keys(data)
    const values = Object.values(data)
    const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const { rows: [r] } = await pool.query(
      `UPDATE regras_cashback SET ${set} WHERE id = $1 RETURNING *`, [id, ...values]
    )
    if (!r) throw new AppError('Regra não encontrada', 404)
    return reply.send(r)
  })

  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    await pool.query(`UPDATE regras_cashback SET ativo = false WHERE id = $1`, [id])
    return reply.status(204).send()
  })
}
