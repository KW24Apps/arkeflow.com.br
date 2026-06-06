import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'

const dono = [authMiddleware, authorize('dono_loja')]

export async function fornecedoresRoutes(app: FastifyInstance) {

  app.get('/', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { q } = req.query as { q?: string }
    const params: any[] = []
    let where = 'WHERE arquivado = false AND ativo = true'
    if (q) {
      params.push(`%${q}%`)
      where += ` AND (razao_social ILIKE $1 OR cnpj ILIKE $1)`
    }
    const { rows } = await pool.query(
      `SELECT * FROM fornecedores ${where} ORDER BY razao_social`, params
    )
    return reply.send(rows)
  })

  app.get('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { rows: [f] } = await pool.query(
      `SELECT * FROM fornecedores WHERE id = $1 AND arquivado = false`, [id]
    )
    if (!f) return reply.status(404).send({ error: 'Fornecedor não encontrado' })
    return reply.send(f)
  })

  app.post('/', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { razao_social, nome_fantasia, cnpj, email, telefones,
            cep, logradouro, numero, complemento, bairro, cidade, estado } = req.body as any
    const { rows: [f] } = await pool.query(
      `INSERT INTO fornecedores
         (razao_social, nome_fantasia, cnpj, email, telefones,
          cep, logradouro, numero, complemento, bairro, cidade, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [razao_social, nome_fantasia ?? null, cnpj ?? null, email ?? null,
       JSON.stringify(telefones ?? []),
       cep ?? null, logradouro ?? null, numero ?? null, complemento ?? null,
       bairro ?? null, cidade ?? null, estado ?? null]
    )
    return reply.status(201).send(f)
  })

  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, any>
    if (body.telefones !== undefined) body.telefones = JSON.stringify(body.telefones)
    const keys   = Object.keys(body)
    const values = Object.values(body)
    const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const { rows: [f] } = await pool.query(
      `UPDATE fornecedores SET ${set} WHERE id = $1 AND arquivado = false RETURNING *`,
      [id, ...values]
    )
    if (!f) return reply.status(404).send({ error: 'Fornecedor não encontrado' })
    return reply.send(f)
  })

  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    await pool.query(`UPDATE fornecedores SET arquivado = true WHERE id = $1`, [id])
    return reply.status(204).send()
  })
}
