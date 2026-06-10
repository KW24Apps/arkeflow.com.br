import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]
const dono = [authMiddleware, authorize('dono_loja')]

export async function caixaRoutes(app: FastifyInstance) {

  // Status do caixa hoje (turno atual ou último)
  app.get('/status', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload

    // Turno aberto DO USUÁRIO LOGADO
    // Correlated subqueries keep vendas and movimentos aggregations independent —
    // a single JOIN of both tables would fan-out rows (vendas × movimentos) before
    // GROUP BY, causing each SUM to multiply by the other table's row count.
    const { rows: [turnoAberto] } = await pool.query(
      `SELECT t.*,
         COALESCE((
           SELECT SUM(v.total) FROM vendas v
           WHERE v.usuario_id = t.usuario_id
             AND v.status = 'finalizada'
             AND v.criado_em >= t.aberto_em
             AND (t.fechado_em IS NULL OR v.criado_em <= t.fechado_em)
         ), 0)::numeric AS total_vendas,
         COALESCE((
           SELECT COUNT(v.id)::int FROM vendas v
           WHERE v.usuario_id = t.usuario_id
             AND v.status = 'finalizada'
             AND v.criado_em >= t.aberto_em
             AND (t.fechado_em IS NULL OR v.criado_em <= t.fechado_em)
         ), 0)::int AS qtd_vendas,
         COALESCE((
           SELECT SUM(mv.valor) FROM movimentos_caixa mv
           WHERE mv.turno_id = t.id AND mv.tipo = 'sangria'
         ), 0)::numeric AS total_sangrias,
         COALESCE((
           SELECT SUM(mv.valor) FROM movimentos_caixa mv
           WHERE mv.turno_id = t.id AND mv.tipo = 'suprimento'
         ), 0)::numeric AS total_suprimentos
       FROM turnos_caixa t
       WHERE t.status = 'aberto'
         AND t.usuario_id = $1
       ORDER BY t.aberto_em DESC
       LIMIT 1`,
      [user.id]
    )

    // Sem turno aberto — busca o último fechado do dia deste usuário
    if (!turnoAberto) {
      const { rows: [ultimo] } = await pool.query(
        `SELECT t.*,
           COALESCE((
             SELECT SUM(v.total) FROM vendas v
             WHERE v.usuario_id = t.usuario_id
               AND v.status = 'finalizada'
               AND v.criado_em >= t.aberto_em
               AND v.criado_em <= t.fechado_em
           ), 0)::numeric AS total_vendas,
           COALESCE((
             SELECT COUNT(v.id)::int FROM vendas v
             WHERE v.usuario_id = t.usuario_id
               AND v.status = 'finalizada'
               AND v.criado_em >= t.aberto_em
               AND v.criado_em <= t.fechado_em
           ), 0)::int AS qtd_vendas
         FROM turnos_caixa t
         WHERE DATE(t.aberto_em) = CURRENT_DATE
           AND t.status = 'fechado'
           AND t.usuario_id = $1
         ORDER BY t.aberto_em DESC
         LIMIT 1`,
        [user.id]
      )
      return reply.send({ status: 'fechado', turno: ultimo ?? null })
    }

    return reply.send({ status: 'aberto', turno: turnoAberto })
  })

  // Abrir caixa
  app.post('/abrir', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const { saldo_inicial, observacao } = req.body as { saldo_inicial?: number; observacao?: string }

    // Se já tem turno aberto, devolve o existente (idempotente — evita duplicar turnos)
    const { rows: [aberto] } = await pool.query(
      `SELECT * FROM turnos_caixa WHERE status = 'aberto' AND usuario_id = $1 LIMIT 1`,
      [user.id]
    )
    if (aberto) return reply.send(aberto)

    const { rows: [t] } = await pool.query(
      `INSERT INTO turnos_caixa (usuario_id, saldo_inicial, observacao)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.id, saldo_inicial ?? 0, observacao ?? null]
    )
    return reply.status(201).send(t)
  })

  // Fechar caixa
  app.post('/fechar', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const { saldo_final, observacao, justificativa, autorizacao_id } = req.body as {
      saldo_final?:    number
      observacao?:     string
      justificativa?:  string | null
      autorizacao_id?: string | null
    }

    // Find open shift
    const { rows: [turno] } = await pool.query(
      `SELECT id, saldo_inicial, aberto_em, usuario_id FROM turnos_caixa
       WHERE status = 'aberto' AND usuario_id = $1 LIMIT 1`,
      [user.id]
    )
    if (!turno) throw new AppError('Nenhum caixa aberto para fechar.', 400)

    // Compute expected cash value server-side
    const [cashRes, movRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(pv.valor), 0) AS total
         FROM pagamentos_venda pv
         JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
         JOIN vendas v            ON v.id  = pv.venda_id
         WHERE fp.tipo = 'dinheiro'
           AND v.status = 'finalizada'
           AND v.usuario_id = $1
           AND v.criado_em >= $2`,
        [turno.usuario_id, turno.aberto_em]
      ),
      pool.query<{ suprimentos: string; sangrias: string }>(
        `SELECT
           COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0) AS suprimentos,
           COALESCE(SUM(CASE WHEN tipo = 'sangria'    THEN valor ELSE 0 END), 0) AS sangrias
         FROM movimentos_caixa WHERE turno_id = $1`,
        [turno.id]
      ),
    ])

    const saldoInicial   = Number(turno.saldo_inicial)
    const cashVendas     = Number(cashRes.rows[0].total)
    const suprimentos    = Number(movRes.rows[0].suprimentos)
    const sangrias       = Number(movRes.rows[0].sangrias)
    const valorEsperado  = saldoInicial + cashVendas + suprimentos - sangrias
    const saldoFinalNum  = saldo_final ?? 0
    const divergencia    = Math.round((saldoFinalNum - valorEsperado) * 100) / 100

    // Read supervision config
    const { rows: [cfg] } = await pool.query<{
      supervisao_habilitada:   boolean
      exige_auth_fechar_falta: boolean
      exige_auth_fechar_sobra: boolean
    }>(
      `SELECT supervisao_habilitada, exige_auth_fechar_falta, exige_auth_fechar_sobra
       FROM configuracoes_loja LIMIT 1`
    )

    const authRequired = !!(
      cfg?.supervisao_habilitada &&
      ((divergencia < 0 && cfg?.exige_auth_fechar_falta) || (divergencia > 0 && cfg?.exige_auth_fechar_sobra))
    )

    if (authRequired) {
      if (!justificativa?.trim()) {
        throw new AppError('Justificativa obrigatória para fechar com divergência.', 400, 'JUSTIFICATIVA_OBRIGATORIA')
      }
      const ehDono = (user as any).nivel === 'dono_loja'
      let ehSupervisor = ehDono
      if (!ehDono) {
        const { rows: [u] } = await platformPool.query<{ is_supervisor: boolean }>(
          `SELECT is_supervisor FROM usuarios WHERE id = $1`,
          [user.id]
        )
        ehSupervisor = !!u?.is_supervisor
      }
      if (!ehSupervisor && !autorizacao_id) {
        throw new AppError('Autorização de supervisor necessária.', 401, 'AUTORIZACAO_NECESSARIA')
      }
    }

    const divergenciaJust = authRequired ? (justificativa?.trim() ?? null) : null
    const autorizacaoId   = authRequired ? (autorizacao_id ?? null) : null

    const { rows: [t] } = await pool.query(
      `UPDATE turnos_caixa
       SET status                    = 'fechado',
           saldo_final               = $1,
           observacao                = $2,
           fechado_em                = NOW(),
           valor_esperado            = $3,
           divergencia               = $4,
           divergencia_justificativa = $5,
           autorizacao_id            = $6
       WHERE status = 'aberto' AND usuario_id = $7
       RETURNING *`,
      [saldoFinalNum, observacao ?? null, valorEsperado, divergencia, divergenciaJust, autorizacaoId, user.id]
    )
    if (!t) throw new AppError('Nenhum caixa aberto para fechar.', 400)
    return reply.send(t)
  })

  // Sangria / Suprimento
  app.post('/movimento', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const { tipo, valor, motivo } = req.body as { tipo: 'sangria' | 'suprimento'; valor: number; motivo?: string }

    const { rows: [t] } = await pool.query(
      `SELECT id, saldo_inicial, aberto_em, usuario_id FROM turnos_caixa WHERE status = 'aberto' AND usuario_id = $1 LIMIT 1`,
      [user.id]
    )
    if (!t) throw new AppError('Abra o caixa primeiro.', 400)

    if (tipo === 'sangria') {
      if (!valor || valor <= 0) throw new AppError('Valor inválido.', 400)

      const [cashRes, movRes] = await Promise.all([
        pool.query<{ total: string }>(
          `SELECT COALESCE(SUM(pv.valor), 0) AS total
           FROM pagamentos_venda pv
           JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
           JOIN vendas v            ON v.id  = pv.venda_id
           WHERE fp.tipo = 'dinheiro'
             AND v.status = 'finalizada'
             AND v.usuario_id = $1
             AND v.criado_em >= $2`,
          [t.usuario_id, t.aberto_em]
        ),
        pool.query<{ suprimentos: string; sangrias: string }>(
          `SELECT
             COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0) AS suprimentos,
             COALESCE(SUM(CASE WHEN tipo = 'sangria'    THEN valor ELSE 0 END), 0) AS sangrias
           FROM movimentos_caixa WHERE turno_id = $1`,
          [t.id]
        ),
      ])

      const disponivel =
        Number(t.saldo_inicial) +
        Number(cashRes.rows[0].total) +
        Number(movRes.rows[0].suprimentos) -
        Number(movRes.rows[0].sangrias)

      if (valor > disponivel) {
        throw new AppError(
          `Sangria maior que o dinheiro em caixa. Disponível: R$ ${disponivel.toFixed(2)}.`,
          400
        )
      }
    }

    const { rows: [m] } = await pool.query(
      `INSERT INTO movimentos_caixa (turno_id, tipo, valor, motivo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [t.id, tipo, valor, motivo ?? null]
    )
    return reply.status(201).send(m)
  })

  // Vendas do turno atual — filtradas pelo usuário logado
  app.get('/vendas', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload

    const { rows: [turno] } = await pool.query(
      `SELECT id, aberto_em FROM turnos_caixa
       WHERE status = 'aberto' AND usuario_id = $1
       ORDER BY aberto_em DESC LIMIT 1`,
      [user.id]
    )

    if (!turno) return reply.send({ turno: null, vendas: [] })

    const { rows } = await pool.query(
      `SELECT v.id, v.total, v.status, v.criado_em,
              v.vendedor_id, v.vendedor_nome,
              c.nome  AS cliente_nome,
              c.telefone AS cliente_telefone,
              COUNT(DISTINCT iv.id)::int AS total_itens,
              COALESCE(
                json_agg(
                  json_build_object(
                    'forma_nome', fp.nome,
                    'tipo',       fp.tipo,
                    'valor',      pv.valor
                  ) ORDER BY pv.id
                ) FILTER (WHERE pv.id IS NOT NULL),
                '[]'
              ) AS pagamentos
       FROM vendas v
       LEFT JOIN clientes c          ON c.id  = v.cliente_id
       LEFT JOIN itens_venda iv      ON iv.venda_id = v.id
       LEFT JOIN pagamentos_venda pv ON pv.venda_id = v.id
       LEFT JOIN formas_pagamento fp ON fp.id = pv.forma_pagamento_id
       WHERE v.status = 'finalizada'
         AND v.usuario_id = $1
         AND v.criado_em >= $2
       GROUP BY v.id, c.nome, c.telefone
       ORDER BY v.criado_em DESC`,
      [user.id, turno.aberto_em]
    )
    return reply.send({ turno, vendas: rows })
  })

  // Histórico de turnos
  app.get('/historico', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows } = await pool.query(
      `SELECT t.*,
         COALESCE(SUM(v.total), 0)::numeric AS total_vendas,
         COUNT(v.id)::int                   AS qtd_vendas
       FROM turnos_caixa t
       LEFT JOIN vendas v
         ON v.status = 'finalizada'
         AND v.criado_em >= t.aberto_em
         AND (t.fechado_em IS NULL OR v.criado_em <= t.fechado_em)
       GROUP BY t.id
       ORDER BY t.aberto_em DESC
       LIMIT 30`
    )
    return reply.send(rows)
  })
}
