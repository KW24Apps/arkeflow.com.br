import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'

// Tabelas válidas de catálogo
const CATALOGOS = ['tamanhos', 'cores', 'tipos_produto', 'composicoes'] as const
type Catalogo = typeof CATALOGOS[number]

function isCatalogo(s: string): s is Catalogo {
  return (CATALOGOS as readonly string[]).includes(s)
}

export async function catalogosRoutes(app: FastifyInstance) {
  const dono = [authMiddleware, authorize('dono_loja')]

  // GET /catalogos/:tipo  — lista itens ativos
  app.get('/:tipo', { preHandler: [authMiddleware, authorize('dono_loja', 'vendedor')] },
    async (request, reply) => {
      const { tipo } = request.params as { tipo: string }
      if (!isCatalogo(tipo)) return reply.status(400).send({ error: 'Catálogo inválido' })

      const pool = getTenantPoolFromRequest(request)
      const orderBy = tipo === 'tamanhos' ? 'ORDER BY ordem, nome' : 'ORDER BY nome'
      const { rows } = await pool.query(
        `SELECT * FROM ${tipo} WHERE ativo = true ${orderBy}`
      )
      return reply.send(rows)
    }
  )

  // POST /catalogos/:tipo
  app.post('/:tipo', { preHandler: dono },
    async (request, reply) => {
      const { tipo } = request.params as { tipo: string }
      if (!isCatalogo(tipo)) return reply.status(400).send({ error: 'Catálogo inválido' })

      const pool = getTenantPoolFromRequest(request)
      const body  = request.body as Record<string, any>

      let row: any
      if (tipo === 'tamanhos') {
        const { rows: [r] } = await pool.query(
          `INSERT INTO tamanhos (nome, ordem) VALUES ($1, $2) RETURNING *`,
          [body.nome, body.ordem ?? 99]
        )
        row = r
      } else if (tipo === 'cores') {
        const { rows: [r] } = await pool.query(
          `INSERT INTO cores (nome, hex_cor) VALUES ($1, $2) RETURNING *`,
          [body.nome, body.hex_cor ?? null]
        )
        row = r
      } else {
        const { rows: [r] } = await pool.query(
          `INSERT INTO ${tipo} (nome) VALUES ($1) RETURNING *`,
          [body.nome]
        )
        row = r
      }

      return reply.status(201).send(row)
    }
  )

  // PUT /catalogos/:tipo/:id
  app.put('/:tipo/:id', { preHandler: dono },
    async (request, reply) => {
      const { tipo, id } = request.params as { tipo: string; id: string }
      if (!isCatalogo(tipo)) return reply.status(400).send({ error: 'Catálogo inválido' })

      const pool = getTenantPoolFromRequest(request)
      const body  = request.body as Record<string, any>

      const fields = Object.keys(body).filter(k => ['nome','hex_cor','ordem','ativo'].includes(k))
      const values = fields.map(k => body[k])
      const set    = fields.map((k, i) => `${k} = $${i + 2}`).join(', ')

      const { rows: [row] } = await pool.query(
        `UPDATE ${tipo} SET ${set} WHERE id = $1 RETURNING *`, [id, ...values]
      )
      return reply.send(row)
    }
  )

  // DELETE /catalogos/:tipo/:id  — soft delete
  app.delete('/:tipo/:id', { preHandler: dono },
    async (request, reply) => {
      const { tipo, id } = request.params as { tipo: string; id: string }
      if (!isCatalogo(tipo)) return reply.status(400).send({ error: 'Catálogo inválido' })

      const pool = getTenantPoolFromRequest(request)
      await pool.query(`UPDATE ${tipo} SET ativo = false WHERE id = $1`, [id])
      return reply.status(204).send()
    }
  )
}
