import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Pool } from 'pg'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { AppError } from '../../core/errors/AppError'

const dono = [authMiddleware, authorize('dono_loja')]
const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const schema = z.object({
  nome:                z.string().min(1),
  codigo:              z.string().optional().nullable(),
  tipo:                z.enum(['desconto_percentual','desconto_fixo','segunda_peca','compre_ganhe','primeira_compra']),
  aplica_todos:        z.boolean().default(false),
  categorias_alvo:     z.array(z.string()).optional(),
  aplicacao:           z.enum(['produtos_selecionados','categoria','todos']).default('todos'),
  valor_desconto:      z.coerce.number().min(0).optional().nullable(),
  unidade:             z.enum(['percentual','reais']).optional().nullable(),
  quantidade_compre:   z.coerce.number().int().min(1).optional().nullable(),
  quantidade_brinde:   z.coerce.number().int().min(1).optional().nullable(),
  percentual_brinde:   z.coerce.number().min(0).max(100).optional().nullable(),
  inicio:              z.string().optional().nullable(),
  fim:                 z.string().optional().nullable(),
  categoria_alvo:      z.string().optional().nullable(),
  produtos_ids:        z.array(z.string().uuid()).optional(),
  ativo:               z.boolean().default(true),
})

async function verificarConflitoProdutos(
  pool: Pool,
  promo: { id?: string; tipo: string; aplica_todos: boolean; produtos_ids: string[] },
): Promise<string | null> {
  if (promo.tipo === 'primeira_compra') return null
  if (!promo.aplica_todos && promo.produtos_ids.length === 0) return null

  const excludeClause = promo.id ? `AND p.id != $1` : ''
  const excludeParam  = promo.id ? [promo.id] : []

  if (promo.aplica_todos) {
    const { rows } = await pool.query(
      `SELECT p.nome FROM promocoes p
       WHERE p.ativo = true AND p.tipo != 'primeira_compra'
         AND (p.aplica_todos = true OR EXISTS (
           SELECT 1 FROM promocoes_produtos pp WHERE pp.promocao_id = p.id
         ))
         ${excludeClause}
       LIMIT 1`,
      excludeParam,
    )
    if (rows.length > 0) {
      return `Conflito: a promoção "${rows[0].nome}" já está ativa e se aplica a produtos que se sobreporiam.`
    }
  } else {
    const offset = promo.id ? 2 : 1
    const placeholders = promo.produtos_ids.map((_, i) => `$${i + offset}`).join(',')
    const { rows } = await pool.query(
      `SELECT p.nome FROM promocoes p
       JOIN promocoes_produtos pp ON pp.promocao_id = p.id
       WHERE p.ativo = true AND p.tipo != 'primeira_compra'
         AND pp.produto_id IN (${placeholders})
         ${excludeClause}
       LIMIT 1`,
      [...excludeParam, ...promo.produtos_ids],
    )
    if (rows.length > 0) {
      return `Conflito: o produto já pertence à promoção ativa "${rows[0].nome}".`
    }
  }

  return null
}

const STATUS_CASE = `
  CASE
    WHEN p.encerrada = true THEN 'encerrada'
    WHEN p.ativo = false    THEN 'encerrada'
    WHEN p.ativo = true
         AND (p.inicio IS NULL OR p.inicio <= CURRENT_DATE)
         AND (p.fim    IS NULL OR p.fim    >= CURRENT_DATE) THEN 'ativa'
    WHEN p.ativo = true AND p.inicio IS NOT NULL AND p.inicio > CURRENT_DATE THEN 'agendada'
    ELSE 'encerrada'
  END AS status
`

export async function promocoesRoutes(app: FastifyInstance) {

  // ── PDV: only currently active promotions ────────────────────────────
  app.get('/ativas', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows } = await pool.query(
      `SELECT p.*,
         COALESCE(JSON_AGG(pp.produto_id) FILTER (WHERE pp.produto_id IS NOT NULL), '[]') AS produtos_ids
       FROM promocoes p
       LEFT JOIN promocoes_produtos pp ON pp.promocao_id = p.id
       WHERE p.ativo = true AND p.encerrada = false
         AND (p.inicio IS NULL OR p.inicio <= CURRENT_DATE)
         AND (p.fim    IS NULL OR p.fim    >= CURRENT_DATE)
       GROUP BY p.id
       ORDER BY p.nome`
    )
    return reply.send(rows)
  })

  // ── Management: all promos with computed status ───────────────────────
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows } = await pool.query(
      `SELECT p.*,
         COALESCE(JSON_AGG(pp.produto_id) FILTER (WHERE pp.produto_id IS NOT NULL), '[]') AS produtos_ids,
         ${STATUS_CASE}
       FROM promocoes p
       LEFT JOIN promocoes_produtos pp ON pp.promocao_id = p.id
       GROUP BY p.id
       ORDER BY p.nome`
    )
    return reply.send(rows)
  })

  app.get('/conflitos', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { ids, promocao_id } = req.query as { ids?: string; promocao_id?: string }
    if (!ids) return reply.send({ conflitos: [] })
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean)
    if (!idList.length) return reply.send({ conflitos: [] })

    const { rows } = await pool.query(
      `SELECT pp.produto_id, pr.nome AS promocao_nome, pr.id AS promocao_id
       FROM promocoes_produtos pp
       JOIN promocoes pr ON pr.id = pp.promocao_id
       WHERE pp.produto_id = ANY($1::uuid[])
         AND pr.ativo = true
         ${promocao_id ? 'AND pr.id != $2' : ''}`,
      promocao_id ? [idList, promocao_id] : [idList],
    )
    return reply.send({ conflitos: rows })
  })

  app.get('/:id', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { rows: [p] } = await pool.query(
      `SELECT p.*, COALESCE(
         JSON_AGG(pp.produto_id) FILTER (WHERE pp.produto_id IS NOT NULL), '[]'
       ) AS produtos_ids
       FROM promocoes p
       LEFT JOIN promocoes_produtos pp ON pp.promocao_id = p.id
       WHERE p.id = $1 GROUP BY p.id`,
      [id]
    )
    if (!p) throw new AppError('Promoção não encontrada', 404)
    return reply.send(p)
  })

  app.post('/', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { produtos_ids, ...data } = schema.parse(req.body)

    if (data.ativo) {
      const conflito = await verificarConflitoProdutos(pool, {
        tipo:         data.tipo,
        aplica_todos: data.aplica_todos ?? false,
        produtos_ids: produtos_ids ?? [],
      })
      if (conflito) throw new AppError(conflito, 409)
    }

    const { rows: [p] } = await pool.query(
      `INSERT INTO promocoes (
         nome, codigo, tipo, aplicacao, aplica_todos, categorias_alvo,
         valor_desconto, unidade, quantidade_compre, quantidade_brinde, percentual_brinde,
         inicio, fim, categoria_alvo, ativo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [data.nome, data.codigo ?? null, data.tipo,
       data.aplica_todos ? 'todos' : (data.aplicacao ?? 'produtos_selecionados'),
       data.aplica_todos ?? false,
       JSON.stringify(data.categorias_alvo ?? []),
       data.valor_desconto ?? null, data.unidade ?? null,
       data.quantidade_compre ?? null, data.quantidade_brinde ?? null,
       data.percentual_brinde ?? null,
       data.inicio ?? null, data.fim ?? null,
       (data.categorias_alvo?.[0]) ?? data.categoria_alvo ?? null,
       data.ativo]
    )

    if (produtos_ids?.length) {
      for (const pid of produtos_ids) {
        await pool.query(
          `INSERT INTO promocoes_produtos (promocao_id, produto_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [p.id, pid]
        ).catch(() => {})
      }
    }

    return reply.status(201).send(p)
  })

  app.put('/:id/encerrar', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    await pool.query(`UPDATE promocoes SET ativo = false, encerrada = true WHERE id = $1`, [id])
    return reply.send({ ok: true })
  })

  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { produtos_ids, ...data } = schema.partial().parse(req.body)

    const needsConflictCheck =
      data.ativo === true ||
      produtos_ids !== undefined ||
      data.aplica_todos !== undefined ||
      data.tipo !== undefined

    if (needsConflictCheck) {
      const { rows: [current] } = await pool.query(
        `SELECT tipo, aplica_todos,
           COALESCE(
             (SELECT ARRAY_AGG(produto_id) FROM promocoes_produtos WHERE promocao_id = $1),
             ARRAY[]::uuid[]
           ) AS produtos_ids
         FROM promocoes WHERE id = $1`,
        [id],
      )

      if (!current) throw new AppError('Promoção não encontrada', 404)

      const tipoFinal        = data.tipo        ?? current.tipo
      const aplicaTodosFinal = data.aplica_todos ?? current.aplica_todos
      const produtosFinal: string[] = produtos_ids != null
        ? produtos_ids.map(String)
        : Array.isArray(current.produtos_ids)
          ? (current.produtos_ids as any[]).map(String)
          : []

      const conflito = await verificarConflitoProdutos(pool, {
        id,
        tipo:         tipoFinal,
        aplica_todos: aplicaTodosFinal,
        produtos_ids: produtosFinal,
      })
      if (conflito) throw new AppError(conflito, 409)
    }

    const keys   = Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined)
    const values = keys.map(k => (data as any)[k] ?? null)
    const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')

    if (keys.length) {
      await pool.query(`UPDATE promocoes SET ${set} WHERE id = $1`, [id, ...values])
    }

    if (produtos_ids !== undefined) {
      await pool.query(`DELETE FROM promocoes_produtos WHERE promocao_id = $1`, [id])
      if (produtos_ids.length) {
        await pool.query(
          `DELETE FROM promocoes_produtos WHERE produto_id = ANY($1::uuid[]) AND promocao_id != $2`,
          [produtos_ids, id],
        )
        for (const pid of produtos_ids) {
          await pool.query(
            `INSERT INTO promocoes_produtos (promocao_id, produto_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [id, pid]
          ).catch(() => {})
        }
      }
    }

    return reply.send(await pool.query(`SELECT * FROM promocoes WHERE id = $1`, [id]).then(r => r.rows[0]))
  })

  app.post('/:id/duplicar', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { rows: [src] } = await pool.query(`SELECT * FROM promocoes WHERE id = $1`, [id])
    if (!src) throw new AppError('Promoção não encontrada', 404)

    const { rows: [nova] } = await pool.query(
      `INSERT INTO promocoes (
         nome, codigo, tipo, aplicacao, aplica_todos, categorias_alvo,
         valor_desconto, unidade, quantidade_compre, quantidade_brinde, percentual_brinde,
         categoria_alvo, ativo, encerrada
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        src.nome + ' (cópia)', src.codigo, src.tipo, src.aplicacao, src.aplica_todos, src.categorias_alvo,
        src.valor_desconto, src.unidade, src.quantidade_compre, src.quantidade_brinde, src.percentual_brinde,
        src.categoria_alvo, true, false,
      ]
    )

    const { rows: srcProds } = await pool.query(
      `SELECT produto_id FROM promocoes_produtos WHERE promocao_id = $1`, [id]
    )
    for (const { produto_id } of srcProds) {
      await pool.query(
        `INSERT INTO promocoes_produtos (promocao_id, produto_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [nova.id, produto_id]
      ).catch(() => {})
    }

    return reply.status(201).send({ ...nova, produtos_ids: srcProds.map((r: any) => r.produto_id) })
  })

  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    await pool.query(`UPDATE promocoes SET ativo = false WHERE id = $1`, [id])
    return reply.status(204).send()
  })
}
