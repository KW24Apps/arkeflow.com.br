import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { platformPool } from '../../config/database'
import type { JwtPayload } from '@arkeflow/shared'

const dono = [authMiddleware, authorize('dono_loja')]

// Used by report endpoints (accepts explicit inicio/fim dates)
function range(q: any) {
  const now = new Date()
  const ini = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const fim = now.toISOString().split('T')[0]
  return { inicio: (q.inicio as string) || ini, fim: (q.fim as string) || fim }
}

// Used by dashboard: converts ?periodo=hoje|semana|mes to a date range
type Periodo = 'hoje' | 'semana' | 'mes'
function periodoRange(q: any): { inicio: string; fim: string; periodo: Periodo; granularity: 'hour' | 'day' } {
  const now  = new Date()
  const pad  = (n: number) => String(n).padStart(2, '0')
  const ymd  = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = ymd(now)
  const periodo = (['hoje', 'semana', 'mes'].includes(q.periodo) ? q.periodo : 'hoje') as Periodo

  if (periodo === 'semana') {
    const dow = now.getDay()            // 0=Sun
    const diff = dow === 0 ? -6 : 1 - dow  // steps back to Monday
    const mon = new Date(now)
    mon.setDate(now.getDate() + diff)
    return { inicio: ymd(mon), fim: today, periodo, granularity: 'day' }
  }
  if (periodo === 'mes') {
    return { inicio: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, fim: today, periodo, granularity: 'day' }
  }
  // hoje
  return { inicio: today, fim: today, periodo, granularity: 'hour' }
}

export async function relatoriosRoutes(app: FastifyInstance) {

  // ── 1. Dashboard executivo ──────────────────────────────────────────────────
  app.get('/dashboard', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = (req as any).user as JwtPayload
    const { inicio, fim, periodo, granularity } = periodoRange(req.query)

    // ── Round 1: all tenant queries in parallel ─────────────────────────────
    const porDiaQuery = granularity === 'hour'
      ? pool.query(
          `SELECT EXTRACT(HOUR FROM criado_em)::int AS hora, SUM(total)::float AS faturamento
           FROM vendas WHERE status='finalizada' AND DATE(criado_em)=$1
           GROUP BY hora ORDER BY hora`,
          [inicio])
      : pool.query(
          `SELECT DATE(criado_em)::text AS dia, SUM(total)::float AS faturamento
           FROM vendas WHERE status='finalizada' AND DATE(criado_em) BETWEEN $1 AND $2
           GROUP BY 1 ORDER BY 1`,
          [inicio, fim])

    const horaInicioQuery = granularity === 'hour'
      ? pool.query(`
          WITH primeira AS (
            SELECT MIN(aberto_em) AS ts FROM turnos_caixa WHERE DATE(aberto_em) = $1
            UNION ALL
            SELECT MIN(criado_em) AS ts FROM vendas WHERE status='finalizada' AND DATE(criado_em) = $1
          )
          SELECT EXTRACT(HOUR FROM MIN(ts))::int AS hora_inicio FROM primeira WHERE ts IS NOT NULL
        `, [inicio])
      : Promise.resolve({ rows: [{ hora_inicio: null as number | null }] })

    const kpiHojeQuery = pool.query(`
      SELECT
        COALESCE(SUM(v.total), 0) AS faturamento,
        COUNT(DISTINCT v.id)       AS qtd_vendas,
        COALESCE(AVG(v.total), 0)  AS ticket_medio
      FROM vendas v
      WHERE v.status = 'finalizada' AND DATE(v.criado_em) = CURRENT_DATE
    `)

    const despesasQuery = pool.query(`
      SELECT COUNT(*) AS qtd, COALESCE(SUM(valor), 0) AS total
      FROM lancamentos WHERE tipo = 'saida' AND data BETWEEN $1 AND $2
    `, [inicio, fim])

    const [kpiRes, porDiaRes, formaRes, topVendRes, topProdRes,
           contasRes, cbSaldoRes, promoRes, caixasRes, cfgRes, horaInicioRes,
           kpiHojeRes, despesasRes] = await Promise.all([

      pool.query(`
        SELECT
          COALESCE(SUM(v.total), 0)                                   AS faturamento,
          COUNT(DISTINCT v.id)                                         AS qtd_vendas,
          COALESCE(AVG(v.total), 0)                                    AS ticket_medio,
          COALESCE(SUM(iv.quantidade), 0)                              AS qtd_itens,
          COALESCE(SUM(v.subtotal), 0)                                 AS subtotal_total,
          COALESCE(SUM(v.subtotal - v.total - v.cashback_usado), 0)   AS desconto_total,
          COALESCE(SUM(v.cashback_gerado), 0)                          AS cashback_gerado,
          COALESCE(SUM(v.cashback_usado), 0)                           AS cashback_usado
        FROM vendas v
        LEFT JOIN itens_venda iv ON iv.venda_id = v.id
        WHERE v.status = 'finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
      `, [inicio, fim]),

      porDiaQuery,

      pool.query(`
        SELECT fp.nome, fp.tipo, SUM(pv.valor) AS total
        FROM pagamentos_venda pv
        JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
        JOIN vendas v ON v.id = pv.venda_id
        WHERE v.status = 'finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
        GROUP BY fp.id, fp.nome, fp.tipo ORDER BY total DESC
      `, [inicio, fim]),

      // vendedor_nome = attributed salesperson on the sale (NOT the caixa operator)
      pool.query(`
        SELECT v.vendedor_nome,
          COUNT(DISTINCT v.id) AS qtd_vendas,
          SUM(v.total) AS faturamento
        FROM vendas v
        WHERE v.status = 'finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
          AND v.vendedor_nome IS NOT NULL
        GROUP BY v.vendedor_nome ORDER BY faturamento DESC LIMIT 5
      `, [inicio, fim]),

      pool.query(`
        SELECT p.nome, SUM(iv.quantidade * iv.preco_unitario - iv.desconto_item) AS faturamento,
          SUM(iv.quantidade) AS qtd
        FROM itens_venda iv
        JOIN versoes vr ON vr.id = iv.versao_id
        JOIN produtos p ON p.id = vr.produto_id
        JOIN vendas v ON v.id = iv.venda_id
        WHERE v.status = 'finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
        GROUP BY p.id, p.nome ORDER BY faturamento DESC LIMIT 5
      `, [inicio, fim]),

      pool.query(`
        SELECT COUNT(*) AS qtd, COALESCE(SUM(valor), 0) AS total,
          COUNT(*) FILTER (WHERE vencimento < CURRENT_DATE) AS vencidas,
          COALESCE(SUM(valor) FILTER (WHERE vencimento < CURRENT_DATE), 0) AS total_vencido
        FROM parcelas_crediario WHERE status != 'pago'
      `),

      pool.query(`
        SELECT COALESCE(SUM(saldo_cashback), 0) AS saldo
        FROM clientes WHERE ativo = true AND arquivado = false
      `),

      // Live: promoções ativas agora
      pool.query(`
        SELECT id, nome, tipo, inicio, fim
        FROM promocoes
        WHERE ativo = true AND encerrada = false
          AND (inicio IS NULL OR inicio <= CURRENT_DATE)
          AND (fim IS NULL OR fim >= CURRENT_DATE)
        ORDER BY nome
      `),

      // Live: caixas abertos hoje
      pool.query(`
        SELECT
          t.id, t.usuario_id, t.aberto_em,
          t.saldo_inicial::float AS saldo_inicial,
          COALESCE((
            SELECT SUM(mv.valor) FROM movimentos_caixa mv
            WHERE mv.turno_id = t.id AND mv.tipo = 'sangria'
          ), 0)::float AS total_sangrias,
          COALESCE((
            SELECT SUM(mv.valor) FROM movimentos_caixa mv
            WHERE mv.turno_id = t.id AND mv.tipo = 'suprimento'
          ), 0)::float AS total_suprimentos,
          COALESCE((
            SELECT SUM(pv.valor)
            FROM vendas v
            JOIN pagamentos_venda pv ON pv.venda_id = v.id
            JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
            WHERE v.status = 'finalizada' AND fp.tipo = 'dinheiro'
              AND v.criado_em >= t.aberto_em
              AND (t.fechado_em IS NULL OR v.criado_em <= t.fechado_em)
          ), 0)::float AS vendas_dinheiro
        FROM turnos_caixa t
        WHERE t.status = 'aberto' AND DATE(t.aberto_em) = CURRENT_DATE
        ORDER BY t.aberto_em
      `),

      // Tenant inactivity config (needed for online_agora calculation)
      pool.query(`SELECT inatividade_minutos FROM configuracoes_loja LIMIT 1`),

      horaInicioQuery,
      kpiHojeQuery,
      despesasQuery,
    ])

    // ── Round 2: platform queries (need inatividade_minutos + operator ids) ─
    const inativMin     = cfgRes.rows[0]?.inatividade_minutos ?? 360
    const operadorIds   = caixasRes.rows.map(r => r.usuario_id)

    const onlineQuery = `
      SELECT nome, nivel,
        'web' AS plataforma,
        sessao_web_em AS login_em,
        ultimo_acesso_web AS ultimo_acesso
      FROM usuarios
      WHERE loja_id = $1
        AND sessao_web IS NOT NULL
        AND ultimo_acesso_web IS NOT NULL
        AND ultimo_acesso_web >= NOW() - ($2 || ' minutes')::interval
      UNION ALL
      SELECT nome, nivel,
        'mobile' AS plataforma,
        sessao_mobile_em AS login_em,
        ultimo_acesso_mobile AS ultimo_acesso
      FROM usuarios
      WHERE loja_id = $1
        AND sessao_mobile IS NOT NULL
        AND ultimo_acesso_mobile IS NOT NULL
        AND ultimo_acesso_mobile >= NOW() - ($2 || ' minutes')::interval
      ORDER BY ultimo_acesso DESC
    `

    const [onlineRes, operadoresRes] = await Promise.all([
      platformPool.query<{ nome: string; nivel: string; plataforma: string; login_em: Date; ultimo_acesso: Date }>(
        onlineQuery,
        [user.loja_id, String(inativMin)]),

      operadorIds.length > 0
        ? platformPool.query<{ id: string; nome: string }>(
            `SELECT id::text, nome FROM usuarios WHERE id = ANY($1::uuid[])`,
            [operadorIds])
        : Promise.resolve({ rows: [] as { id: string; nome: string }[] }),
    ])

    // ── Build response ──────────────────────────────────────────────────────
    const opNomes: Record<string, string> = {}
    for (const op of operadoresRes.rows) opNomes[op.id] = op.nome

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faturamento_por_dia = granularity === 'hour'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (porDiaRes.rows as any[]).map(r => ({ hora: Number(r.hora), faturamento: Number(r.faturamento) }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (porDiaRes.rows as any[]).map(r => ({ dia: String(r.dia), faturamento: Number(r.faturamento) }))

    const horaInicioVal = (horaInicioRes as any).rows[0]?.hora_inicio
    const hora_inicio   = horaInicioVal !== null && horaInicioVal !== undefined
      ? Number(horaInicioVal) : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kh  = (kpiHojeRes as any).rows[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dsp = (despesasRes as any).rows[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formaTotal = (formaRes.rows as any[]).reduce((s, r) => s + Number(r.total), 0)

    return reply.send({
      periodo: { inicio, fim, nome: periodo },
      granularity,
      hora_inicio,
      // Zone 1 — always today
      kpis_hoje: {
        faturamento:  Number(kh.faturamento),
        qtd_vendas:   Number(kh.qtd_vendas),
        ticket_medio: Number(kh.ticket_medio),
      },
      a_receber: {
        total:    Number(contasRes.rows[0].total),
        vencidas: Number(contasRes.rows[0].vencidas),
        qtd:      Number(contasRes.rows[0].qtd),
      },
      online_agora: onlineRes.rows.map(u => ({
        nome: u.nome,
        nivel: u.nivel,
        plataforma: u.plataforma,
        login_em: u.login_em,
        ultimo_acesso: u.ultimo_acesso,
      })),
      promocoes_ativas: promoRes.rows.map(p => ({
        id: p.id, nome: p.nome, tipo: p.tipo, inicio: p.inicio, fim: p.fim,
      })),
      caixas_dia: caixasRes.rows.map(t => ({
        operador:      opNomes[t.usuario_id] ?? 'Operador',
        aberto_em:     t.aberto_em,
        valor_rodando: t.saldo_inicial + t.vendas_dinheiro + t.total_suprimentos - t.total_sangrias,
      })),
      // Zone 2 — period-dependent
      faturamento_por_dia,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      por_forma: (formaRes.rows as any[]).map(r => ({
        nome: r.nome, tipo: r.tipo, total: Number(r.total),
        pct: formaTotal > 0 ? Number(r.total) / formaTotal * 100 : 0,
      })),
      top_vendedores: topVendRes.rows.map(r => ({
        nome: r.vendedor_nome, qtd_vendas: Number(r.qtd_vendas), faturamento: Number(r.faturamento),
      })),
      top_produtos: topProdRes.rows.map(r => ({
        nome: r.nome, faturamento: Number(r.faturamento), qtd: Number(r.qtd),
      })),
      despesas: {
        total: Number(dsp.total),
        qtd:   Number(dsp.qtd),
      },
    })
  })

  // ── 2. Vendas ───────────────────────────────────────────────────────────────
  app.get('/vendas', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { inicio, fim } = range(req.query)
    const pg = Math.max(1, parseInt((req.query as any).page || '1'))
    const PER = 50

    const [kpiRes, formaRes, vendRes, listaRes, cntRes] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(v.total),0) AS faturamento, COUNT(DISTINCT v.id) AS qtd_vendas,
          COALESCE(AVG(v.total),0) AS ticket_medio, COALESCE(SUM(iv.quantidade),0) AS qtd_itens
        FROM vendas v LEFT JOIN itens_venda iv ON iv.venda_id = v.id
        WHERE v.status='finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
      `, [inicio, fim]),
      pool.query(`
        SELECT fp.nome, fp.tipo, SUM(pv.valor) AS total, COUNT(DISTINCT pv.venda_id) AS qtd
        FROM pagamentos_venda pv
        JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
        JOIN vendas v ON v.id = pv.venda_id
        WHERE v.status='finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
        GROUP BY fp.id, fp.nome, fp.tipo ORDER BY total DESC
      `, [inicio, fim]),
      pool.query(`
        SELECT v.vendedor_nome, COUNT(DISTINCT v.id) AS qtd_vendas,
          SUM(v.total) AS faturamento, AVG(v.total) AS ticket_medio,
          SUM(iv.quantidade) AS qtd_itens
        FROM vendas v LEFT JOIN itens_venda iv ON iv.venda_id = v.id
        WHERE v.status='finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
          AND v.vendedor_nome IS NOT NULL
        GROUP BY v.vendedor_nome ORDER BY faturamento DESC
      `, [inicio, fim]),
      pool.query(`
        SELECT v.id, v.criado_em, v.total, v.vendedor_nome, c.nome AS cliente_nome
        FROM vendas v LEFT JOIN clientes c ON c.id = v.cliente_id
        WHERE v.status='finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
        ORDER BY v.criado_em DESC LIMIT $3 OFFSET $4
      `, [inicio, fim, PER, (pg - 1) * PER]),
      pool.query(`
        SELECT COUNT(*) FROM vendas WHERE status='finalizada' AND DATE(criado_em) BETWEEN $1 AND $2
      `, [inicio, fim]),
    ])

    const fat = Number(kpiRes.rows[0].faturamento)
    const qv = Number(kpiRes.rows[0].qtd_vendas)

    return reply.send({
      periodo: { inicio, fim },
      kpis: {
        faturamento: fat, qtd_vendas: qv,
        ticket_medio: Number(kpiRes.rows[0].ticket_medio),
        qtd_itens: Number(kpiRes.rows[0].qtd_itens),
      },
      por_forma: formaRes.rows.map(r => ({
        nome: r.nome, tipo: r.tipo, total: Number(r.total),
        qtd: Number(r.qtd), pct: fat > 0 ? Number(r.total) / fat * 100 : 0,
      })),
      por_vendedor: vendRes.rows.map(r => {
        const q = Number(r.qtd_vendas), f = Number(r.faturamento)
        return {
          nome: r.vendedor_nome, qtd_vendas: q, faturamento: f,
          ticket_medio: Number(r.ticket_medio),
          pa: q > 0 ? Number(r.qtd_itens) / q : 0,
          pct: fat > 0 ? f / fat * 100 : 0,
        }
      }),
      vendas: listaRes.rows.map(r => ({
        id: r.id, criado_em: r.criado_em, total: Number(r.total),
        vendedor: r.vendedor_nome, cliente: r.cliente_nome,
      })),
      paginacao: { total: Number(cntRes.rows[0].count), page: pg, per_page: PER },
    })
  })

  // ── 3. Giro de grade ────────────────────────────────────────────────────────
  app.get('/giro-grade', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { inicio, fim } = range(req.query)
    const prod_id = (req.query as any).produto_id
    const params: any[] = [inicio, fim]
    const filter = prod_id ? (params.push(prod_id), `AND p.id = $${params.length}`) : ''

    const { rows } = await pool.query(`
      SELECT
        p.id AS produto_id, p.nome AS produto,
        vr.id AS versao_id,
        COALESCE(vr.atributos_json->>'Cor', vr.atributos_json->>'cor', '') AS cor,
        COALESCE(vr.atributos_json->>'Tamanho', vr.atributos_json->>'tamanho',
                 vr.atributos_json->>'Size', '') AS tamanho,
        vr.estoque_atual,
        COALESCE(s.qtd, 0) AS qtd_vendida
      FROM versoes vr
      JOIN produtos p ON p.id = vr.produto_id
      LEFT JOIN (
        SELECT iv.versao_id, SUM(iv.quantidade) AS qtd
        FROM itens_venda iv JOIN vendas v ON v.id = iv.venda_id
        WHERE v.status='finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
        GROUP BY iv.versao_id
      ) s ON s.versao_id = vr.id
      WHERE vr.arquivado=false AND p.arquivado=false ${filter}
      ORDER BY p.nome, cor, tamanho
    `, params)

    return reply.send({
      periodo: { inicio, fim },
      itens: rows.map(r => {
        const v = Number(r.qtd_vendida), e = Number(r.estoque_atual)
        return {
          produto_id: r.produto_id, produto: r.produto, versao_id: r.versao_id,
          cor: r.cor, tamanho: r.tamanho, estoque_atual: e, qtd_vendida: v,
          sell_through: (v + e) > 0 ? v / (v + e) : 0,
        }
      }),
    })
  })

  // ── 4. Aging de estoque ─────────────────────────────────────────────────────
  app.get('/aging-estoque', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)

    const { rows } = await pool.query(`
      SELECT
        p.id AS produto_id, p.nome AS produto, vr.id AS versao_id,
        COALESCE(vr.preco_especifico, p.preco_base) AS preco,
        COALESCE(vr.atributos_json->>'Cor', vr.atributos_json->>'cor', '') AS cor,
        COALESCE(vr.atributos_json->>'Tamanho', vr.atributos_json->>'tamanho', '') AS tamanho,
        vr.estoque_atual,
        uv.ultima_venda_em,
        CASE
          WHEN uv.ultima_venda_em IS NOT NULL
            THEN CURRENT_DATE - uv.ultima_venda_em::date
          WHEN ae.entrada_em IS NOT NULL
            THEN CURRENT_DATE - ae.entrada_em::date
          ELSE NULL
        END AS dias_parado
      FROM versoes vr
      JOIN produtos p ON p.id = vr.produto_id
      LEFT JOIN (
        SELECT iv.versao_id, MAX(v.criado_em) AS ultima_venda_em
        FROM itens_venda iv JOIN vendas v ON v.id = iv.venda_id
        WHERE v.status='finalizada' GROUP BY iv.versao_id
      ) uv ON uv.versao_id = vr.id
      LEFT JOIN (
        SELECT versao_id, MAX(criado_em) AS entrada_em
        FROM ajustes_estoque WHERE tipo='entrada' GROUP BY versao_id
      ) ae ON ae.versao_id = vr.id
      WHERE vr.estoque_atual > 0 AND vr.arquivado=false AND p.arquivado=false
      ORDER BY dias_parado DESC NULLS LAST, p.nome
    `)

    const itens = rows.map(r => {
      const dias = r.dias_parado !== null ? Number(r.dias_parado) : null
      const preco = Number(r.preco), estoque = Number(r.estoque_atual)
      const bucket = dias === null ? '+90' :
        dias <= 30 ? '0-30' : dias <= 60 ? '31-60' : dias <= 90 ? '61-90' : '+90'
      return {
        produto_id: r.produto_id, produto: r.produto, versao_id: r.versao_id,
        cor: r.cor, tamanho: r.tamanho, estoque_atual: estoque,
        preco, valor_parado: preco * estoque,
        ultima_venda_em: r.ultima_venda_em,
        dias_parado: dias, bucket,
      }
    })

    // Bucket summary
    const resumo: Record<string, number> = {}
    for (const it of itens) { resumo[it.bucket] = (resumo[it.bucket] ?? 0) + 1 }

    return reply.send({
      itens,
      resumo: Object.entries(resumo).map(([bucket, qtd_skus]) => ({ bucket, qtd_skus })),
    })
  })

  // ── 5. Cesta de compras ─────────────────────────────────────────────────────
  app.get('/cesta', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { inicio, fim } = range(req.query)

    const { rows } = await pool.query(`
      SELECT p1.nome AS produto_a, p2.nome AS produto_b, COUNT(*) AS contagem
      FROM itens_venda iv1
      JOIN versoes v1 ON v1.id = iv1.versao_id JOIN produtos p1 ON p1.id = v1.produto_id
      JOIN itens_venda iv2 ON iv2.venda_id = iv1.venda_id AND iv1.id < iv2.id
      JOIN versoes v2 ON v2.id = iv2.versao_id JOIN produtos p2 ON p2.id = v2.produto_id
      JOIN vendas vn ON vn.id = iv1.venda_id
      WHERE vn.status='finalizada' AND DATE(vn.criado_em) BETWEEN $1 AND $2 AND p1.id < p2.id
      GROUP BY p1.nome, p2.nome ORDER BY contagem DESC LIMIT 30
    `, [inicio, fim])

    return reply.send({
      periodo: { inicio, fim },
      pares: rows.map(r => ({
        produto_a: r.produto_a, produto_b: r.produto_b, vezes: Number(r.contagem),
      })),
    })
  })

  // ── 6. Financeiro ───────────────────────────────────────────────────────────
  app.get('/financeiro', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { inicio, fim } = range(req.query)

    const [contasRes, cbRes, cbSaldoRes, cbExpirandoRes, turnosRes] = await Promise.all([
      pool.query(`
        SELECT status, COUNT(*) AS qtd, COALESCE(SUM(valor),0) AS total
        FROM parcelas_crediario GROUP BY status
      `),
      pool.query(`
        SELECT tipo, COALESCE(SUM(valor),0) AS total
        FROM historico_cashback WHERE DATE(criado_em) BETWEEN $1 AND $2 GROUP BY tipo
      `, [inicio, fim]),
      pool.query(`SELECT COALESCE(SUM(saldo_cashback),0) AS saldo FROM clientes WHERE ativo=true AND arquivado=false`),
      pool.query(`
        SELECT COALESCE(SUM(valor),0) AS total FROM historico_cashback
        WHERE tipo='ganho' AND expira_em IS NOT NULL
          AND expira_em BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      `),
      pool.query(`
        SELECT t.id, t.aberto_em, t.fechado_em, t.status,
          t.saldo_inicial, t.saldo_final, t.divergencia,
          COALESCE(mc.sangrias,0) AS total_sangrias,
          COALESCE(mc.suprimentos,0) AS total_suprimentos,
          COALESCE(
            (SELECT SUM(pv.valor)
             FROM vendas v JOIN pagamentos_venda pv ON pv.venda_id = v.id
             JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
             WHERE v.status='finalizada' AND fp.tipo='dinheiro'
               AND v.criado_em >= t.aberto_em
               AND (t.fechado_em IS NULL OR v.criado_em <= t.fechado_em)
            ), 0) AS total_dinheiro
        FROM turnos_caixa t
        LEFT JOIN (
          SELECT turno_id,
            SUM(valor) FILTER (WHERE tipo='sangria') AS sangrias,
            SUM(valor) FILTER (WHERE tipo='suprimento') AS suprimentos
          FROM movimentos_caixa GROUP BY turno_id
        ) mc ON mc.turno_id = t.id
        WHERE DATE(t.aberto_em) BETWEEN $1 AND $2
        ORDER BY t.aberto_em DESC LIMIT 50
      `, [inicio, fim]),
    ])

    const contasPorStatus: Record<string, { qtd: number; total: number }> = {}
    for (const r of contasRes.rows) contasPorStatus[r.status] = { qtd: Number(r.qtd), total: Number(r.total) }
    const cbGerado = cbRes.rows.find(r => r.tipo === 'ganho')
    const cbUsado  = cbRes.rows.find(r => r.tipo === 'resgate')

    return reply.send({
      periodo: { inicio, fim },
      contas_receber: contasRes.rows.map(r => ({
        status: r.status, qtd: Number(r.qtd), total: Number(r.total),
      })),
      cashback: {
        gerado:        Number(cbGerado?.total ?? 0),
        usado:         Number(cbUsado?.total ?? 0),
        saldo_total:   Number(cbSaldoRes.rows[0].saldo),
        expirando_30d: Number(cbExpirandoRes.rows[0].total),
      },
      turnos: turnosRes.rows.map(t => ({
        id: t.id, aberto_em: t.aberto_em, fechado_em: t.fechado_em, status: t.status,
        fundo_caixa:      Number(t.saldo_inicial),
        total_dinheiro:   Number(t.total_dinheiro),
        total_sangrias:   Number(t.total_sangrias),
        total_suprimentos:Number(t.total_suprimentos),
        total_vendas:     Number(t.total_dinheiro),
      })),
    })
  })

  // ── 8. Acessos ─────────────────────────────────────────────────────────────
  app.get('/acessos', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { inicio, fim, usuario_id, plataforma } = req.query as any

    const dataInicio = inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const dataFim = fim || new Date().toISOString().split('T')[0]

    const params: any[] = [user.loja_id, dataInicio, dataFim]
    let filters = ''
    if (usuario_id) { params.push(usuario_id); filters += ` AND l.usuario_id = $${params.length}` }
    if (plataforma) { params.push(plataforma); filters += ` AND l.plataforma = $${params.length}` }

    const [logsRes, kpisRes, porHoraRes, topUsuariosRes, colaboradoresRes] = await Promise.all([
      platformPool.query(`
        SELECT l.tipo, l.ip, l.plataforma, l.motivo, l.criado_em, u.nome
        FROM logs_acesso l
        JOIN usuarios u ON u.id = l.usuario_id
        WHERE l.loja_id = $1
          AND DATE(l.criado_em) BETWEEN $2 AND $3
          ${filters}
        ORDER BY l.criado_em DESC
        LIMIT 200
      `, params),

      platformPool.query(`
        SELECT
          COUNT(*) FILTER (WHERE tipo = 'login') AS total_logins,
          COUNT(DISTINCT usuario_id) AS usuarios_ativos,
          COUNT(*) FILTER (WHERE plataforma = 'mobile') AS logins_mobile,
          COUNT(*) FILTER (WHERE plataforma = 'web' OR plataforma IS NULL) AS logins_web
        FROM logs_acesso
        WHERE loja_id = $1 AND DATE(criado_em) BETWEEN $2 AND $3 AND tipo = 'login'
      `, [user.loja_id, dataInicio, dataFim]),

      platformPool.query(`
        SELECT EXTRACT(HOUR FROM criado_em)::int AS hora, COUNT(*)::int AS total
        FROM logs_acesso
        WHERE loja_id = $1 AND DATE(criado_em) BETWEEN $2 AND $3 AND tipo = 'login'
        GROUP BY hora ORDER BY hora
      `, [user.loja_id, dataInicio, dataFim]),

      platformPool.query(`
        SELECT u.nome, COUNT(*) FILTER (WHERE l.tipo = 'login')::int AS logins
        FROM logs_acesso l
        JOIN usuarios u ON u.id = l.usuario_id
        WHERE l.loja_id = $1 AND DATE(l.criado_em) BETWEEN $2 AND $3
        GROUP BY u.nome ORDER BY logins DESC LIMIT 10
      `, [user.loja_id, dataInicio, dataFim]),

      platformPool.query(`
        SELECT id, nome FROM usuarios WHERE loja_id = $1 AND ativo = true ORDER BY nome
      `, [user.loja_id]),
    ])

    const k = kpisRes.rows[0]
    return reply.send({
      logs: logsRes.rows,
      kpis: {
        total_logins:    Number(k.total_logins),
        usuarios_ativos: Number(k.usuarios_ativos),
        logins_mobile:   Number(k.logins_mobile),
        logins_web:      Number(k.logins_web),
      },
      porHora:       porHoraRes.rows,
      topUsuarios:   topUsuariosRes.rows,
      colaboradores: colaboradoresRes.rows,
    })
  })

  // ── 7. Clientes RFM ─────────────────────────────────────────────────────────
  app.get('/clientes-rfm', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { inicio, fim } = range(req.query)

    const { rows } = await pool.query(`
      WITH rfm AS (
        SELECT c.id, c.nome,
          CURRENT_DATE - MAX(v.criado_em)::date AS recencia_dias,
          MAX(v.criado_em)::date::text           AS ultima_compra,
          COUNT(DISTINCT v.id)                   AS frequencia,
          COALESCE(SUM(v.total), 0)              AS valor
        FROM clientes c JOIN vendas v ON v.cliente_id = c.id
        WHERE v.status='finalizada' AND DATE(v.criado_em) BETWEEN $1 AND $2
        GROUP BY c.id, c.nome
      ),
      scored AS (
        SELECT *,
          NTILE(5) OVER (ORDER BY recencia_dias ASC)  AS r_score,
          NTILE(5) OVER (ORDER BY frequencia DESC)     AS f_score,
          NTILE(5) OVER (ORDER BY valor DESC)           AS m_score
        FROM rfm
      )
      SELECT *, (r_score + f_score + m_score) AS total_score FROM scored
      ORDER BY total_score DESC
    `, [inicio, fim])

    const clientes = rows.map(r => {
      const rs = Number(r.r_score), fs = Number(r.f_score), ms = Number(r.m_score)
      const ts = rs + fs + ms
      const segmento =
        ts >= 13 ? 'Campeões' :
        ts >= 10 ? 'Leais' :
        rs >= 4 && fs <= 2 ? 'Novos' :
        rs <= 2 && fs >= 3 ? 'Em risco' :
        ts <= 5 ? 'Perdidos' : 'Em desenvolvimento'
      return {
        id: r.id, nome: r.nome,
        recencia_dias: Number(r.recencia_dias),
        frequencia: Number(r.frequencia),
        total_gasto: Number(r.valor),
        ultima_compra: r.ultima_compra,
        r_score: rs, f_score: fs, m_score: ms, rfm_score: ts, segmento,
      }
    })

    return reply.send({
      periodo: { inicio, fim },
      clientes,
    })
  })
}
