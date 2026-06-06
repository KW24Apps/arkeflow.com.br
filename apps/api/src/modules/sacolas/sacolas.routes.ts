import type { FastifyInstance } from 'fastify'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

export async function sacolasRoutes(app: FastifyInstance) {

  // List sacolas by status
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool   = getTenantPoolFromRequest(req)
    const status = (req.query as any).status ?? 'aguardando'

    const { rows } = await pool.query(
      `SELECT s.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id',            i.id,
               'versao_id',     i.versao_id,
               'produto_id',    i.produto_id,
               'nome',          i.nome,
               'atributos',     i.atributos,
               'preco_unitario',i.preco_unitario,
               'quantidade',    i.quantidade,
               'codigo_barras', i.codigo_barras
             ) ORDER BY i.id
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'
         ) AS itens
       FROM sacolas s
       LEFT JOIN sacola_itens i ON i.sacola_id = s.id
       WHERE s.status = $1
       GROUP BY s.id
       ORDER BY s.criado_em DESC`,
      [status]
    )
    return reply.send(rows)
  })

  // Get one sacola with items
  app.get('/:id', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [s] } = await pool.query(
      `SELECT s.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id',            i.id,
               'versao_id',     i.versao_id,
               'produto_id',    i.produto_id,
               'nome',          i.nome,
               'atributos',     i.atributos,
               'preco_unitario',i.preco_unitario,
               'quantidade',    i.quantidade,
               'codigo_barras', i.codigo_barras
             ) ORDER BY i.id
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'
         ) AS itens
       FROM sacolas s
       LEFT JOIN sacola_itens i ON i.sacola_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [id]
    )
    if (!s) throw new AppError('Sacola não encontrada.', 404)
    return reply.send(s)
  })

  // Create a sacola (from mobile or POS)
  app.post('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const { cliente_id, cliente_nome, observacao, itens = [] } = req.body as any

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [sacola] } = await client.query(
        `INSERT INTO sacolas (criado_por, nome_vendedor, cliente_id, cliente_nome, observacao)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user.id, (user as any).nome ?? null, cliente_id ?? null, cliente_nome ?? null, observacao ?? null]
      )

      for (const item of itens) {
        await client.query(
          `INSERT INTO sacola_itens (sacola_id, versao_id, produto_id, nome, atributos, preco_unitario, quantidade, codigo_barras)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [sacola.id, item.versao_id, item.produto_id, item.nome,
           JSON.stringify(item.atributos ?? {}),
           item.preco_unitario, item.quantidade, item.codigo_barras ?? null]
        )
      }

      await client.query('COMMIT')
      return reply.status(201).send({ ...sacola, itens })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  })

  // Update status (load into POS, finalize, cancel)
  app.patch('/:id/status', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }

    const allowed = ['aguardando', 'em_atendimento', 'finalizada', 'cancelada']
    if (!allowed.includes(status)) throw new AppError('Status inválido.', 400)

    const { rows: [s] } = await pool.query(
      `UPDATE sacolas SET status = $1, atualizado_em = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    )
    if (!s) throw new AppError('Sacola não encontrada.', 404)
    return reply.send(s)
  })

  // Add item to existing sacola
  app.post('/:id/itens', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const item = req.body as any

    const { rows: [i] } = await pool.query(
      `INSERT INTO sacola_itens (sacola_id, versao_id, produto_id, nome, atributos, preco_unitario, quantidade, codigo_barras)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, item.versao_id, item.produto_id, item.nome,
       JSON.stringify(item.atributos ?? {}),
       item.preco_unitario, item.quantidade, item.codigo_barras ?? null]
    )
    return reply.status(201).send(i)
  })
}
