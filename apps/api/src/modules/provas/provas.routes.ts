import type { FastifyInstance } from 'fastify'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const WITH_ITENS = `
  SELECT p.*,
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
          'codigo_barras',  i.codigo_barras,
          'devolvido',      i.devolvido
        ) ORDER BY i.id
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'
    ) AS itens
  FROM provas_em_casa p
  LEFT JOIN prova_itens i ON i.prova_id = p.id
  WHERE p.id = $1
  GROUP BY p.id
`

async function decrementStock(client: any, itens: any[], controleGlobal: boolean) {
  for (const item of itens) {
    if (!item.versao_id) continue
    const { rows: [v] } = await client.query(
      `SELECT v.estoque_atual, p.controle_estoque
       FROM versoes v JOIN produtos p ON p.id = v.produto_id
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

async function restoreStockForItems(client: any, items: { versao_id: string; quantidade: number }[]) {
  for (const item of items) {
    await client.query(
      `UPDATE versoes SET estoque_atual = estoque_atual + $1 WHERE id = $2`,
      [item.quantidade, item.versao_id]
    )
  }
}

async function insertItens(client: any, prova_id: string, itens: any[]) {
  for (const item of itens) {
    await client.query(
      `INSERT INTO prova_itens
         (prova_id, versao_id, produto_id, nome, atributos, preco_unitario, quantidade, codigo_barras)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [prova_id, item.versao_id, item.produto_id, item.nome,
       JSON.stringify(item.atributos ?? {}),
       item.preco_unitario, item.quantidade, item.codigo_barras ?? null]
    )
  }
}

export async function provasRoutes(app: FastifyInstance) {

  // GET /provas-em-casa — list by status with items
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool   = getTenantPoolFromRequest(req)
    const status = (req.query as any).status ?? 'ativas'

    let statuses: string[]
    if (status === 'ativas')     statuses = ['em_prova', 'aguardando_caixa']
    else if (status === 'concluidas') statuses = ['finalizada', 'cancelada']
    else                         statuses = [status]

    const { rows } = await pool.query(
      `SELECT p.*,
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
               'codigo_barras',  i.codigo_barras,
               'devolvido',      i.devolvido
             ) ORDER BY i.id
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'
         ) AS itens
       FROM provas_em_casa p
       LEFT JOIN prova_itens i ON i.prova_id = p.id
       WHERE p.status = ANY($1)
       GROUP BY p.id
       ORDER BY p.criado_em DESC`,
      [statuses]
    )
    return reply.send(rows)
  })

  // GET /provas-em-casa/:id — single prova with items
  app.get('/:id', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { rows: [p] } = await pool.query(WITH_ITENS, [id])
    if (!p) throw new AppError('Prova não encontrada.', 404)
    return reply.send(p)
  })

  // POST /provas-em-casa — create prova with stock decrement
  app.post('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const { cliente_id, cliente_nome, prazo, observacao, itens = [], vendedor_id, vendedor_nome } = req.body as any

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [config] } = await client.query(
        `SELECT controle_estoque FROM configuracoes_loja LIMIT 1`
      )
      const controleGlobal = config?.controle_estoque ?? true

      await decrementStock(client, itens, controleGlobal)

      const provaVendedorId   = vendedor_id   ?? user.id
      const provaVendedorNome = vendedor_nome ?? user.nome ?? null

      const { rows: [prova] } = await client.query(
        `INSERT INTO provas_em_casa (criado_por, nome_vendedor, cliente_id, cliente_nome, prazo, observacao)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [provaVendedorId, provaVendedorNome, cliente_id ?? null, cliente_nome ?? null, prazo ?? null, observacao ?? null]
      )

      await insertItens(client, prova.id, itens)

      await client.query('COMMIT')
      const { rows: [full] } = await pool.query(WITH_ITENS, [prova.id])
      return reply.status(201).send(full)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  })

  // PUT /provas-em-casa/:id/devolver — mark items as devolvido + restore stock
  app.put('/:id/devolver', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }
    const { itens_devolvidos = [] } = req.body as { itens_devolvidos: string[] }

    if (itens_devolvidos.length === 0) {
      throw new AppError('Nenhum item informado para devolução.', 400)
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [prova] } = await client.query(
        `SELECT * FROM provas_em_casa WHERE id = $1 FOR UPDATE`, [id]
      )
      if (!prova) throw new AppError('Prova não encontrada.', 404)
      if (prova.status === 'finalizada' || prova.status === 'cancelada') {
        throw new AppError('Prova já encerrada.', 400)
      }

      // Get items to restore
      const { rows: itemsToRestore } = await client.query(
        `SELECT versao_id, quantidade FROM prova_itens
         WHERE id = ANY($1) AND prova_id = $2 AND devolvido = false`,
        [itens_devolvidos, id]
      )

      await restoreStockForItems(client, itemsToRestore)

      await client.query(
        `UPDATE prova_itens SET devolvido = true WHERE id = ANY($1) AND prova_id = $2`,
        [itens_devolvidos, id]
      )

      await client.query(
        `UPDATE provas_em_casa SET atualizado_em = NOW() WHERE id = $1`, [id]
      )

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

  // PUT /provas-em-casa/:id/liberar-caixa — move to aguardando_caixa
  app.put('/:id/liberar-caixa', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [prova] } = await pool.query(
      `SELECT * FROM provas_em_casa WHERE id = $1`, [id]
    )
    if (!prova) throw new AppError('Prova não encontrada.', 404)
    if (prova.status !== 'em_prova') throw new AppError('Prova não está em andamento.', 400)

    // Verify there are non-devolvido items to send to cashier
    const { rows: ativos } = await pool.query(
      `SELECT id FROM prova_itens WHERE prova_id = $1 AND devolvido = false`, [id]
    )
    if (ativos.length === 0) throw new AppError('Todos os itens foram devolvidos. Cancele a prova.', 400)

    const { rows: [updated] } = await pool.query(
      `UPDATE provas_em_casa SET status = 'aguardando_caixa', atualizado_em = NOW() WHERE id = $1 RETURNING *`, [id]
    )
    return reply.send(updated)
  })

  // PUT /provas-em-casa/:id/puxar — cashier pulls prova into POS (non-devolvido items only)
  app.put('/:id/puxar', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [prova] } = await pool.query(
      `SELECT * FROM provas_em_casa WHERE id = $1 AND status = 'aguardando_caixa'`, [id]
    )
    if (!prova) throw new AppError('Prova não encontrada ou não está aguardando o caixa.', 404)

    const { rows: [full] } = await pool.query(WITH_ITENS, [id])
    return reply.send(full)
  })

  // PUT /provas-em-casa/:id/finalizar — cashier finalizes after sale
  app.put('/:id/finalizar', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [updated] } = await pool.query(
      `UPDATE provas_em_casa SET status = 'finalizada', atualizado_em = NOW()
       WHERE id = $1 AND status IN ('em_prova', 'aguardando_caixa') RETURNING *`,
      [id]
    )
    if (!updated) throw new AppError('Prova não encontrada ou já encerrada.', 404)
    return reply.send(updated)
  })

  // PUT /provas-em-casa/:id/cancelar — cancel prova + restore stock for non-devolvido items
  app.put('/:id/cancelar', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [prova] } = await client.query(
        `SELECT * FROM provas_em_casa WHERE id = $1 FOR UPDATE`, [id]
      )
      if (!prova) throw new AppError('Prova não encontrada.', 404)
      if (prova.status === 'cancelada')  throw new AppError('Prova já está cancelada.', 400)
      if (prova.status === 'finalizada') throw new AppError('Prova já foi finalizada.', 400)

      // Restore stock only for items NOT yet returned
      const { rows: naoDevolvidos } = await client.query(
        `SELECT versao_id, quantidade FROM prova_itens
         WHERE prova_id = $1 AND devolvido = false`, [id]
      )
      await restoreStockForItems(client, naoDevolvidos)

      const { rows: [updated] } = await client.query(
        `UPDATE provas_em_casa SET status = 'cancelada', atualizado_em = NOW() WHERE id = $1 RETURNING *`, [id]
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
}
