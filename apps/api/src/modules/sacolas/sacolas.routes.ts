import type { FastifyInstance } from 'fastify'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const WITH_ITENS = `
  SELECT s.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id',             i.id,
          'versao_id',      i.versao_id,
          'produto_id',     i.produto_id,
          'nome',           i.nome,
          'atributos',      i.atributos,
          'preco_unitario', i.preco_unitario,
          'quantidade',     i.quantidade,
          'codigo_barras',  i.codigo_barras
        ) ORDER BY i.id
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'
    ) AS itens
  FROM sacolas s
  LEFT JOIN sacola_itens i ON i.sacola_id = s.id
  WHERE s.id = $1
  GROUP BY s.id
`

async function decrementStock(client: any, itens: any[], controleGlobal: boolean) {
  for (const item of itens) {
    if (!item.versao_id) continue
    const { rows: [v] } = await client.query(
      `SELECT v.estoque_atual, p.controle_estoque
       FROM versoes v JOIN produtos_arkevest p ON p.id = v.produto_id
       WHERE v.id = $1 AND v.ativo = true FOR UPDATE`,
      [item.versao_id]
    )
    if (!v) throw new AppError(`Variação não encontrada: ${item.versao_id}`, 404)
    const controla = controleGlobal && v.controle_estoque
    if (controla && v.estoque_atual < item.quantidade) {
      throw new AppError(
        `Estoque insuficiente para "${item.nome}" (disponível: ${v.estoque_atual}).`, 400
      )
    }
    if (controla) {
      await client.query(
        `UPDATE versoes SET estoque_atual = estoque_atual - $1 WHERE id = $2`,
        [item.quantidade, item.versao_id]
      )
    }
  }
}

async function restoreStock(client: any, sacola_id: string) {
  const { rows: itens } = await client.query(
    `SELECT versao_id, quantidade FROM sacola_itens WHERE sacola_id = $1`, [sacola_id]
  )
  for (const item of itens) {
    await client.query(
      `UPDATE versoes SET estoque_atual = estoque_atual + $1 WHERE id = $2`,
      [item.quantidade, item.versao_id]
    )
  }
}

async function insertItens(client: any, sacola_id: string, itens: any[]) {
  for (const item of itens) {
    await client.query(
      `INSERT INTO sacola_itens
         (sacola_id, versao_id, produto_id, nome, atributos, preco_unitario, quantidade, codigo_barras)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [sacola_id, item.versao_id, item.produto_id, item.nome,
       JSON.stringify(item.atributos ?? {}),
       item.preco_unitario, item.quantidade, item.codigo_barras ?? null]
    )
  }
}

export async function sacolasRoutes(app: FastifyInstance) {

  // GET /sacolas — list by status with items
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool   = getTenantPoolFromRequest(req)
    const status = (req.query as any).status ?? 'aguardando'

    const singleStatuses = ['aguardando', 'em_atendimento', 'finalizada', 'cancelada']
    // 'all' (used by caixa modal) → show aguardando + em_atendimento together
    const statuses: string[] = status === 'all' || !singleStatuses.includes(status)
      ? ['aguardando', 'em_atendimento']
      : [status]

    const { rows } = await pool.query(
      `SELECT s.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id',             i.id,
               'versao_id',      i.versao_id,
               'produto_id',     i.produto_id,
               'nome',           i.nome,
               'atributos',      i.atributos,
               'preco_unitario', i.preco_unitario,
               'quantidade',     i.quantidade,
               'codigo_barras',  i.codigo_barras
             ) ORDER BY i.id
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'
         ) AS itens
       FROM sacolas s
       LEFT JOIN sacola_itens i ON i.sacola_id = s.id
       WHERE s.status = ANY($1)
       GROUP BY s.id
       ORDER BY s.criado_em DESC`,
      [statuses]
    )
    return reply.send(rows)
  })

  // GET /sacolas/:id — single sacola with items
  app.get('/:id', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { rows: [s] } = await pool.query(WITH_ITENS, [id])
    if (!s) throw new AppError('Sacola não encontrada.', 404)
    return reply.send(s)
  })

  // POST /sacolas — create bag with stock validation + decrement
  app.post('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const { cliente_id, cliente_nome, observacao, itens = [], vendedor_id, vendedor_nome } = req.body as any

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [config] } = await client.query(
        `SELECT controle_estoque FROM configuracoes_loja LIMIT 1`
      )
      const controleGlobal = config?.controle_estoque ?? true

      await decrementStock(client, itens, controleGlobal)

      const sacolaVendedorId   = vendedor_id   ?? user.id
      const sacolaVendedorNome = vendedor_nome ?? user.nome ?? null

      const { rows: [sacola] } = await client.query(
        `INSERT INTO sacolas (criado_por, nome_vendedor, cliente_id, cliente_nome, observacao)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [sacolaVendedorId, sacolaVendedorNome, cliente_id ?? null, cliente_nome ?? null, observacao ?? null]
      )

      await insertItens(client, sacola.id, itens)

      await client.query('COMMIT')
      const { rows: [full] } = await pool.query(WITH_ITENS, [sacola.id])
      return reply.status(201).send(full)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  })

  // PATCH /sacolas/:id/status — simple status update (kept for backward compat)
  app.patch('/:id/status', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }

    const allowed = ['aguardando', 'em_atendimento', 'finalizada', 'cancelada']
    if (!allowed.includes(status)) throw new AppError('Status inválido.', 400)

    const { rows: [s] } = await pool.query(
      `UPDATE sacolas SET status = $1, atualizado_em = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    )
    if (!s) throw new AppError('Sacola não encontrada.', 404)
    return reply.send(s)
  })

  // PUT /sacolas/:id/cancelar — cancel bag + restore stock
  app.put('/:id/cancelar', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [sacola] } = await client.query(
        `SELECT * FROM sacolas WHERE id = $1 FOR UPDATE`, [id]
      )
      if (!sacola) throw new AppError('Sacola não encontrada.', 404)
      if (sacola.status === 'cancelada')  throw new AppError('Sacola já está cancelada.', 400)
      if (sacola.status === 'finalizada') throw new AppError('Sacola já foi finalizada.', 400)

      await restoreStock(client, id)

      const { rows: [updated] } = await client.query(
        `UPDATE sacolas SET status = 'cancelada', atualizado_em = NOW() WHERE id = $1 RETURNING *`, [id]
      )

      await client.query('COMMIT')
      return reply.send(updated)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  })

  // PUT /sacolas/:id/itens — replace all items (restore old stock, decrement new)
  app.put('/:id/itens', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { itens = [], cliente_id, cliente_nome } = req.body as any

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [sacola] } = await client.query(
        `SELECT * FROM sacolas WHERE id = $1 FOR UPDATE`, [id]
      )
      if (!sacola) throw new AppError('Sacola não encontrada.', 404)
      if (sacola.status !== 'aguardando') throw new AppError('Sacola não está aguardando.', 400)

      await restoreStock(client, id)

      const { rows: [config] } = await client.query(
        `SELECT controle_estoque FROM configuracoes_loja LIMIT 1`
      )
      const controleGlobal = config?.controle_estoque ?? true

      await decrementStock(client, itens, controleGlobal)

      await client.query(`DELETE FROM sacola_itens WHERE sacola_id = $1`, [id])
      await insertItens(client, id, itens)

      if (cliente_id !== undefined || cliente_nome !== undefined) {
        await client.query(
          `UPDATE sacolas SET cliente_id = $1, cliente_nome = $2, atualizado_em = NOW() WHERE id = $3`,
          [cliente_id ?? null, cliente_nome ?? null, id]
        )
      }

      await client.query('COMMIT')
      const { rows: [full] } = await pool.query(WITH_ITENS, [id])
      return reply.send(full)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  })

  // PUT /sacolas/:id/devolver — return bag from caixa back to aguardando (no stock change)
  app.put('/:id/devolver', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [sacola] } = await pool.query(
      `SELECT * FROM sacolas WHERE id = $1 AND status = 'em_atendimento'`, [id]
    )
    if (!sacola) throw new AppError('Sacola não encontrada ou não está no caixa.', 404)

    const { rows: [updated] } = await pool.query(
      `UPDATE sacolas SET status = 'aguardando', atualizado_em = NOW() WHERE id = $1 RETURNING *`, [id]
    )
    return reply.send(updated)
  })

  // PUT /sacolas/:id/puxar — cashier pulls bag into POS
  // Accepts both 'aguardando' and 'em_atendimento' (re-pulling is valid for switching bags)
  app.put('/:id/puxar', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [sacola] } = await pool.query(
      `SELECT * FROM sacolas WHERE id = $1 AND status IN ('aguardando', 'em_atendimento')`, [id]
    )
    if (!sacola) throw new AppError('Sacola não encontrada ou não disponível.', 404)

    if (sacola.status === 'aguardando') {
      await pool.query(
        `UPDATE sacolas SET status = 'em_atendimento', atualizado_em = NOW() WHERE id = $1`, [id]
      )
    }

    const { rows: [full] } = await pool.query(WITH_ITENS, [id])
    return reply.send(full)
  })
}
