import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'

const dono = [authMiddleware, authorize('dono_loja')]

const lancamentoSchema = z.object({
  tipo:      z.enum(['entrada', 'saida']),
  descricao: z.string().min(1),
  valor:     z.coerce.number().positive(),
  data:      z.string().optional(),
  categoria: z.string().optional(),
  status:    z.enum(['realizado', 'pendente']).default('realizado'),
})

export async function financeiroRoutes(app: FastifyInstance) {

  // Fluxo de caixa — lista lançamentos
  app.get('/lancamentos', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { de, ate, tipo } = req.query as { de?: string; ate?: string; tipo?: string }

    const params: any[] = []
    const conds: string[] = []
    if (de)   { params.push(de);   conds.push(`data >= $${params.length}`) }
    if (ate)  { params.push(ate);  conds.push(`data <= $${params.length}`) }
    if (tipo) { params.push(tipo); conds.push(`tipo = $${params.length}`)  }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
    const { rows } = await pool.query(
      `SELECT * FROM lancamentos ${where} ORDER BY data DESC, id DESC LIMIT 200`,
      params
    )
    return reply.send(rows)
  })

  // Resumo do período (totais)
  app.get('/lancamentos/resumo', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { de, ate } = req.query as { de?: string; ate?: string }

    const params: any[] = []
    const conds: string[] = []
    if (de)  { params.push(de);  conds.push(`data >= $${params.length}`) }
    if (ate) { params.push(ate); conds.push(`data <= $${params.length}`) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

    const { rows: [r] } = await pool.query(
      `SELECT
         COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada' AND status = 'realizado'), 0) AS total_entradas,
         COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'   AND status = 'realizado'), 0) AS total_saidas,
         COUNT(*) FILTER (WHERE tipo = 'entrada') AS qtd_entradas,
         COUNT(*) FILTER (WHERE tipo = 'saida')   AS qtd_saidas
       FROM lancamentos ${where}`,
      params
    )
    return reply.send(r)
  })

  // Criar lançamento manual (ex: despesa)
  app.post('/lancamentos', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const data = lancamentoSchema.parse(req.body)
    const { rows: [l] } = await pool.query(
      `INSERT INTO lancamentos (tipo, descricao, valor, data, categoria, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.tipo, data.descricao, data.valor,
       data.data ?? new Date().toISOString().split('T')[0],
       data.categoria ?? null, data.status]
    )
    return reply.status(201).send(l)
  })

  // Contas a receber — parcelas do crediário
  app.get('/contas-receber', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { status } = req.query as { status?: string }

    const where = status ? `WHERE pc.status = '${status}'` : `WHERE pc.status IN ('pendente', 'vencido')`

    const { rows } = await pool.query(`
      SELECT pc.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
             v.total AS venda_total, v.criado_em AS venda_data
      FROM parcelas_crediario pc
      JOIN pagamentos_venda pv ON pv.id = pc.pagamento_venda_id
      JOIN vendas v ON v.id = pv.venda_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      ${where}
      ORDER BY pc.vencimento ASC
      LIMIT 200
    `)
    return reply.send(rows)
  })

  // Baixar parcela como paga
  app.put('/contas-receber/:id/pagar', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [pc] } = await pool.query(
      `UPDATE parcelas_crediario
       SET status = 'pago', pago_em = CURRENT_DATE
       WHERE id = $1 RETURNING *`,
      [id]
    )
    if (!pc) return reply.status(404).send({ error: 'Parcela não encontrada' })

    // Gera lançamento de entrada para o recebimento
    await pool.query(
      `INSERT INTO lancamentos (tipo, descricao, valor, categoria, status)
       VALUES ('entrada', 'Recebimento crediário', $1, 'crediario', 'realizado')`,
      [pc.valor]
    )

    return reply.send(pc)
  })
}
