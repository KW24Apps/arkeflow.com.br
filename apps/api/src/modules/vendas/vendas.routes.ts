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
  juros:          z.coerce.number().min(0).optional().nullable(),
  detalhe:        z.string().optional().nullable(),
  valor_recebido: z.coerce.number().min(0).optional().nullable(),
  troco:          z.coerce.number().min(0).optional().nullable(),
  primeira_parcela: z.string().optional().nullable(),
})

const vendaSchema = z.object({
  cliente_id:        z.string().uuid().optional().nullable(),
  itens:             z.array(itemSchema).min(1),
  pagamentos:        z.array(pagamentoSchema).min(1),
  cashback_usado:    z.coerce.number().min(0).default(0),
  desconto_promocao: z.coerce.number().min(0).default(0),
  desconto_pagamento: z.coerce.number().min(0).default(0),
  vendedor_id:       z.string().uuid().optional().nullable(),
  vendedor_nome:     z.string().optional().nullable(),
})

export async function vendasRoutes(app: FastifyInstance) {

  // Registrar uma venda completa
  app.post('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const data = vendaSchema.parse(req.body)

    // Verifica configuração global de estoque e cashback
    const { rows: [cfg] } = await pool.query(
      `SELECT controle_estoque, cashback_habilitado, cashback_carencia_dias, cashback_validade_meses
       FROM configuracoes_loja LIMIT 1`
    )
    const controleGlobal     = cfg?.controle_estoque ?? true
    const cashbackHabilitado = !!(cfg?.cashback_habilitado)
    const carenciaDias       = Number(cfg?.cashback_carencia_dias ?? 0)
    const validadeMeses      = Number(cfg?.cashback_validade_meses ?? 0)

    // Lê config de juros do crediário direto da forma_pagamento
    const { rows: [crediarioFp] } = await pool.query(
      `SELECT config FROM formas_pagamento WHERE tipo = 'crediario' AND ativo = true LIMIT 1`
    )
    const cCfg = crediarioFp?.config ?? {}
    const crediario_juros_habilitado: boolean = !!cCfg.juros_habilitado
    const crediario_juros_sem_ate: number = Number(cCfg.juros_sem_ate ?? 0)
    const crediario_juros_mes: number = Number(cCfg.juros_mes ?? 0)

    // Calcula totais
    const subtotal       = data.itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
    const desconto_itens = data.itens.reduce((s, i) => s + i.desconto_item, 0)
    const desconto_total = desconto_itens + data.desconto_pagamento
    const total          = Math.max(0, subtotal - desconto_total - data.cashback_usado)

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
      if (data.cliente_id && cashbackHabilitado) {
        const { rows: [cli] } = await client.query(
          `SELECT c.saldo_cashback, rc.percentual
           FROM clientes c LEFT JOIN regras_cashback rc ON rc.id = c.regra_cashback_id
           WHERE c.id = $1`, [data.cliente_id]
        )
        if (cli?.percentual) {
          cashback_gerado = Math.round(total * (Number(cli.percentual) / 100) * 100) / 100
        }
      }

      // Guarda de crédito para crediário
      for (const pag of data.pagamentos) {
        const { rows: [fpCheck] } = await client.query(
          `SELECT tipo FROM formas_pagamento WHERE id = $1`, [pag.forma_pagamento_id]
        )
        if (fpCheck?.tipo === 'crediario') {
          if (!data.cliente_id) throw new AppError('Crediário exige cliente.', 400)
          const { rows: [cc] } = await client.query(
            `SELECT COALESCE(cc.limite,0) AS limite,
                    COALESCE((SELECT SUM(valor) FROM parcelas_crediario WHERE cliente_id = $1 AND status != 'pago'),0) AS ocupado
             FROM clientes_credito cc WHERE cc.cliente_id = $1`,
            [data.cliente_id]
          )
          const disponivel = Number(cc?.limite ?? 0) - Number(cc?.ocupado ?? 0)
          if (Number(pag.valor) > disponivel + 0.01) {
            throw new AppError('Crédito insuficiente para o valor financiado.', 400)
          }
          break
        }
      }

      // Cria venda
      const { rows: [venda] } = await client.query(
        `INSERT INTO vendas (cliente_id, usuario_id, subtotal, desconto_promocao,
           desconto_pagamento, cashback_usado, total, cashback_gerado, status,
           vendedor_id, vendedor_nome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'finalizada',$9,$10) RETURNING id`,
        [data.cliente_id ?? null, user.id, subtotal, data.desconto_promocao,
         data.desconto_pagamento, data.cashback_usado, total, cashback_gerado,
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
        // Para cartão de crédito, persiste juros e parcelas no campo detalhe
        let detalhe = pag.detalhe ?? null
        if (fp?.tipo === 'credito') {
          const jurosVal = pag.juros ?? 0
          if (jurosVal > 0 || pag.parcelas > 1) {
            detalhe = JSON.stringify({ juros: jurosVal, parcelas: pag.parcelas })
          }
        }
        const { rows: [pv] } = await client.query(
          `INSERT INTO pagamentos_venda (venda_id, forma_pagamento_id, valor, parcelas, detalhe, valor_recebido, troco)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [venda_id, pag.forma_pagamento_id, pag.valor, pag.parcelas, detalhe, pag.valor_recebido ?? null, pag.troco ?? null]
        )
        const pv_id = pv.id

        if (fp?.tipo === 'crediario') {
          const N = pag.parcelas
          const financiado = Number(pag.valor)
          let totalParcelado = financiado
          if (crediario_juros_habilitado && N > crediario_juros_sem_ate) {
            totalParcelado = Math.round(financiado * (1 + (crediario_juros_mes / 100) * N) * 100) / 100
          }
          const base = Math.floor((totalParcelado / N) * 100) / 100
          const baseDate = pag.primeira_parcela
            ? new Date(pag.primeira_parcela + 'T00:00:00')
            : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d })()
          for (let n = 1; n <= N; n++) {
            const valor = n < N ? base : Math.round((totalParcelado - base * (N - 1)) * 100) / 100
            const venc = new Date(baseDate.getTime())
            venc.setMonth(baseDate.getMonth() + (n - 1))
            await client.query(
              `INSERT INTO parcelas_crediario (pagamento_venda_id, cliente_id, numero_parcela, valor, vencimento, status)
               VALUES ($1,$2,$3,$4,$5,'pendente')`,
              [pv_id, data.cliente_id, n, valor.toFixed(2), venc.toISOString().split('T')[0]]
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
        if (cashbackHabilitado && cashback_gerado > 0) {
          const hoje = new Date()
          const dispDe = new Date(hoje)
          if (carenciaDias > 0) dispDe.setDate(dispDe.getDate() + carenciaDias)
          let expiraEm: Date | null = null
          if (validadeMeses > 0) {
            expiraEm = new Date(dispDe)
            expiraEm.setMonth(expiraEm.getMonth() + validadeMeses)
          }
          await client.query(
            `UPDATE clientes SET saldo_cashback = saldo_cashback + $1 WHERE id = $2`,
            [cashback_gerado, data.cliente_id]
          )
          await client.query(
            `INSERT INTO historico_cashback (cliente_id, venda_id, tipo, valor, disponivel_a_partir_de, expira_em)
             VALUES ($1,$2,'ganho',$3,$4,$5)`,
            [data.cliente_id, venda_id, cashback_gerado,
             dispDe.toISOString().split('T')[0],
             expiraEm ? expiraEm.toISOString().split('T')[0] : null]
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

    const { rows: itens }     = await pool.query(`SELECT iv.*, vr.atributos_json, p.nome AS produto_nome, p.aceita_desconto, tp.nome AS tipo_nome FROM itens_venda iv JOIN versoes vr ON vr.id = iv.versao_id JOIN produtos p ON p.id = vr.produto_id LEFT JOIN tipos_produto tp ON tp.id = p.tipo_id WHERE iv.venda_id = $1`, [id])
    const { rows: pagamentos } = await pool.query(`SELECT pv.*, fp.nome AS forma_nome, fp.tipo FROM pagamentos_venda pv JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id WHERE pv.venda_id = $1`, [id])

    return reply.send({ ...v, itens, pagamentos })
  })
}
