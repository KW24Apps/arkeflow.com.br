import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
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
    const { rows: [turnoAberto] } = await pool.query(
      `SELECT t.*,
         COALESCE(SUM(v.total), 0)::numeric AS total_vendas,
         COUNT(v.id)::int                   AS qtd_vendas,
         COALESCE(SUM(mv.valor) FILTER (WHERE mv.tipo = 'sangria'), 0)::numeric    AS total_sangrias,
         COALESCE(SUM(mv.valor) FILTER (WHERE mv.tipo = 'suprimento'), 0)::numeric AS total_suprimentos
       FROM turnos_caixa t
       LEFT JOIN vendas v
         ON v.usuario_id = t.usuario_id
         AND v.status = 'finalizada'
         AND v.criado_em >= t.aberto_em
         AND (t.fechado_em IS NULL OR v.criado_em <= t.fechado_em)
       LEFT JOIN movimentos_caixa mv ON mv.turno_id = t.id
       WHERE t.status = 'aberto'
         AND t.usuario_id = $1
       GROUP BY t.id
       ORDER BY t.aberto_em DESC
       LIMIT 1`,
      [user.id]
    )

    // Sem turno aberto — busca o último fechado do dia deste usuário
    if (!turnoAberto) {
      const { rows: [ultimo] } = await pool.query(
        `SELECT t.*,
           COALESCE(SUM(v.total), 0)::numeric AS total_vendas,
           COUNT(v.id)::int                   AS qtd_vendas
         FROM turnos_caixa t
         LEFT JOIN vendas v
           ON v.usuario_id = t.usuario_id
           AND v.status = 'finalizada'
           AND v.criado_em >= t.aberto_em
           AND v.criado_em <= t.fechado_em
         WHERE DATE(t.aberto_em) = CURRENT_DATE
           AND t.status = 'fechado'
           AND t.usuario_id = $1
         GROUP BY t.id
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

    // Verifica se este usuário já tem turno aberto
    const { rows: [aberto] } = await pool.query(
      `SELECT id FROM turnos_caixa WHERE status = 'aberto' AND usuario_id = $1 LIMIT 1`,
      [user.id]
    )
    if (aberto) throw new AppError('Você já tem um caixa aberto. Feche-o antes de abrir um novo.', 400)

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
    const { saldo_final, observacao } = req.body as { saldo_final?: number; observacao?: string }

    const { rows: [t] } = await pool.query(
      `UPDATE turnos_caixa SET status = 'fechado', saldo_final = $1, observacao = $2, fechado_em = NOW()
       WHERE status = 'aberto' AND usuario_id = $3
       RETURNING *`,
      [saldo_final ?? 0, observacao ?? null, user.id]
    )
    if (!t) throw new AppError('Nenhum caixa aberto para fechar.', 400)
    return reply.send(t)
  })

  // Sangria / Suprimento
  app.post('/movimento', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { tipo, valor, motivo } = req.body as { tipo: 'sangria' | 'suprimento'; valor: number; motivo?: string }

    const { rows: [t] } = await pool.query(`SELECT id FROM turnos_caixa WHERE status = 'aberto' LIMIT 1`)
    if (!t) throw new AppError('Abra o caixa primeiro.', 400)

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
