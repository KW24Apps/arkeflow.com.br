import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const itemSchema = z.object({
  versao_id:     z.string().uuid(),
  quantidade:    z.coerce.number().int().positive(),
  preco_unitario:z.coerce.number().positive(),
  desconto_item: z.coerce.number().min(0).default(0),
})

const pagamentoSchema = z.object({
  forma_pagamento_id: z.string().uuid(),
  valor:          z.coerce.number().positive(),
  parcelas:       z.coerce.number().int().min(1).default(1),
  detalhe:        z.string().optional().nullable(),
  valor_recebido: z.coerce.number().min(0).optional().nullable(),
  troco:          z.coerce.number().min(0).optional().nullable(),
})

const vendaSchema = z.object({
  cliente_id:        z.string().uuid().optional().nullable(),
  itens:             z.array(itemSchema).min(1),
  pagamentos:        z.array(pagamentoSchema).min(1),
  cashback_usado:    z.coerce.number().min(0).default(0),
  desconto_promocao: z.coerce.number().min(0).default(0),
  vendedor_id:       z.string().uuid().optional().nullable(),
  vendedor_nome:     z.string().optional().nullable(),
})

export async function vendasRoutes(app: FastifyInstance) {

  // Registrar uma venda completa
  app.post('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const data = vendaSchema.parse(req.body)

    // Verifica configuração global de estoque
    const { rows: [cfg] } = await pool.query(`SELECT controle_estoque FROM configuracoes_loja LIMIT 1`)
    const controleGlobal = cfg?.controle_estoque ?? true

    // Calcula totais
    const subtotal = data.itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
    const desconto_total = data.itens.reduce((s, i) => s + i.desconto_item, 0) + data.desconto_promocao
    const total = Math.max(0, subtotal - desconto_total - data.cashback_usado)

    // Valida que pagamentos cobrem o total
    const totalPago = data.pagamentos.reduce((s, p) => s + p.valor, 0)
    if (Math.abs(totalPago - total) > 0.01) {
      throw new AppError(`Total pago (R$${totalPago.toFixed(2)}) não bate com o total da venda (R$${total.toFixed(2)})`, 400)
    }

    // Inicia transação
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Valida e deduz estoque
      for (const item of data.itens) {
        const { rows: [v] } = await client.query(
          `SELECT v.estoque_atual, v.estoque_minimo, p.controle_estoque
           FROM versoes v JOIN produtos p ON p.id = v.produto_id
           WHERE v.id = $1 AND v.ativo = true FOR UPDATE`,
          [item.versao_id]
        )
        if (!v) throw new AppError(`Variação não encontrada: ${item.versao_id}`, 404)

        const controla = controleGlobal && v.controle_estoque
        if (controla && v.estoque_atual < item.quantidade) {
          throw new AppError(`Estoque insuficiente para uma das variações (disponível: ${v.estoque_atual}).`, 400)
        }
        if (controla) {
          await client.query(
            `UPDATE versoes SET estoque_atual = estoque_atual - $1 WHERE id = $2`,
            [item.quantidade, item.versao_id]
          )
        }
      }

      // Calcula cashback gerado
      let cashback_gerado = 0
      if (data.cliente_id) {
        const { rows: [cli] } = await client.query(
          `SELECT c.saldo_cashback, rc.percentual
           FROM clientes c LEFT JOIN regras_cashback rc ON rc.id = c.regra_cashback_id
           WHERE c.id = $1`, [data.cliente_id]
        )
        if (cli?.percentual) {
          cashback_gerado = total * (Number(cli.percentual) / 100)
        }
      }

      // Cria venda
      const { rows: [venda] } = await client.query(
        `INSERT INTO vendas (cliente_id, usuario_id, subtotal, desconto_promocao,
           desconto_pagamento, cashback_usado, total, cashback_gerado, status,
           vendedor_id, vendedor_nome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'finalizada',$9,$10) RETURNING id`,
        [data.cliente_id ?? null, user.id, subtotal, data.desconto_promocao,
         0, data.cashback_usado, total, cashback_gerado,
         data.vendedor_id ?? null, data.vendedor_nome ?? null]
      )
      const venda_id = venda.id

      // Cria itens
      for (const item of data.itens) {
        await client.query(
          `INSERT INTO itens_venda (venda_id, versao_id, quantidade, preco_unitario, desconto_item)
           VALUES ($1,$2,$3,$4,$5)`,
          [venda_id, item.versao_id, item.quantidade, item.preco_unitario, item.desconto_item]
        )
      }

      // Cria pagamentos + parcelas crediário
      for (const pag of data.pagamentos) {
        const { rows: [fp] } = await client.query(
          `SELECT tipo FROM formas_pagamento WHERE id = $1`, [pag.forma_pagamento_id]
        )
        const { rows: [pv] } = await client.query(
          `INSERT INTO pagamentos_venda (venda_id, forma_pagamento_id, valor, parcelas, detalhe, valor_recebido, troco)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [venda_id, pag.forma_pagamento_id, pag.valor, pag.parcelas, pag.detalhe ?? null, pag.valor_recebido ?? null, pag.troco ?? null]
        )
        const pv_id = pv.id

        if (fp?.tipo === 'crediario' && pag.parcelas > 1) {
          const valorParcela = pag.valor / pag.parcelas
          for (let n = 1; n <= pag.parcelas; n++) {
            const venc = new Date()
            venc.setMonth(venc.getMonth() + n)
            await client.query(
              `INSERT INTO parcelas_crediario (pagamento_venda_id, numero_parcela, valor, vencimento)
               VALUES ($1,$2,$3,$4)`,
              [pv_id, n, valorParcela.toFixed(2), venc.toISOString().split('T')[0]]
            )
          }
        }
      }

      // Lançamento financeiro
      await client.query(
        `INSERT INTO lancamentos (tipo, descricao, valor, venda_id, categoria, status)
         VALUES ('entrada', 'Venda', $1, $2, 'vendas', 'realizado')`,
        [total, venda_id]
      )

      // Cashback
      if (data.cliente_id) {
        // Debita cashback usado
        if (data.cashback_usado > 0) {
          await client.query(
            `UPDATE clientes SET saldo_cashback = saldo_cashback - $1 WHERE id = $2`,
            [data.cashback_usado, data.cliente_id]
          )
          await client.query(
            `INSERT INTO historico_cashback (cliente_id, venda_id, tipo, valor)
             VALUES ($1,$2,'resgate',$3)`,
            [data.cliente_id, venda_id, data.cashback_usado]
          )
        }
        // Adiciona cashback gerado
        if (cashback_gerado > 0) {
          await client.query(
            `UPDATE clientes SET saldo_cashback = saldo_cashback + $1 WHERE id = $2`,
            [cashback_gerado, data.cliente_id]
          )
          await client.query(
            `INSERT INTO historico_cashback (cliente_id, venda_id, tipo, valor)
             VALUES ($1,$2,'ganho',$3)`,
            [data.cliente_id, venda_id, cashback_gerado]
          )
        }
      }

      await client.query('COMMIT')
      return reply.status(201).send({ venda_id, total, cashback_gerado })

    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // Histórico de vendas
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { de, ate, limit = '50' } = req.query as { de?: string; ate?: string; limit?: string }

    const params: any[] = []
    const conds: string[] = ['v.status != \'cancelada\'']
    if (de)  { params.push(de);  conds.push(`DATE(v.criado_em) >= $${params.length}`) }
    if (ate) { params.push(ate); conds.push(`DATE(v.criado_em) <= $${params.length}`) }

    const { rows } = await pool.query(
      `SELECT v.id, v.total, v.subtotal, v.desconto_promocao, v.cashback_usado,
              v.cashback_gerado, v.status, v.criado_em,
              v.vendedor_id, v.vendedor_nome,
              c.nome AS cliente_nome, c.telefone AS cliente_telefone,
              COUNT(iv.id)::int AS total_itens
       FROM vendas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN itens_venda iv ON iv.venda_id = v.id
       WHERE ${conds.join(' AND ')}
       GROUP BY v.id, c.nome, c.telefone
       ORDER BY v.criado_em DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit)]
    )
    return reply.send(rows)
  })

  // Detalhe de uma venda
  app.get('/:id', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { id } = req.params as { id: string }

    const { rows: [v] } = await pool.query(
      `SELECT v.*, c.nome AS cliente_nome FROM vendas v
       LEFT JOIN clientes c ON c.id = v.cliente_id WHERE v.id = $1`, [id]
    )
    if (!v) throw new AppError('Venda não encontrada', 404)

    const { rows: itens }     = await pool.query(`SELECT iv.*, vr.atributos_json, p.nome AS produto_nome FROM itens_venda iv JOIN versoes vr ON vr.id = iv.versao_id JOIN produtos p ON p.id = vr.produto_id WHERE iv.venda_id = $1`, [id])
    const { rows: pagamentos } = await pool.query(`SELECT pv.*, fp.nome AS forma_nome, fp.tipo FROM pagamentos_venda pv JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id WHERE pv.venda_id = $1`, [id])

    return reply.send({ ...v, itens, pagamentos })
  })
}
