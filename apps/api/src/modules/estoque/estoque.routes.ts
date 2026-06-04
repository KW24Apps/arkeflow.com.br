import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]
const dono = [authMiddleware, authorize('dono_loja')]

const ajusteSchema = z.object({
  versao_id:  z.string().uuid(),
  tipo:       z.enum(['entrada', 'saida', 'ajuste']),
  quantidade: z.coerce.number().int().positive(),
  motivo:     z.string().optional(),
})

export async function estoqueRoutes(app: FastifyInstance) {

  // Posição atual — todos os produtos com estoque
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { alerta } = req.query as { alerta?: string }

    let where = 'WHERE p.ativo = true AND v.ativo = true AND p.controle_estoque = true'
    if (alerta === 'true') where += ' AND v.estoque_atual <= v.estoque_minimo'

    const { rows } = await pool.query(`
      SELECT v.id AS versao_id, v.atributos_json, v.estoque_atual, v.estoque_minimo,
             p.id AS produto_id, p.nome AS produto_nome, p.preco_base,
             (v.estoque_atual <= v.estoque_minimo) AS alerta
      FROM versoes v
      JOIN produtos p ON p.id = v.produto_id
      ${where}
      ORDER BY alerta DESC, p.nome, v.atributos_json::text
    `)
    return reply.send(rows)
  })

  // Registrar ajuste manual
  app.post('/ajuste', { preHandler: dono }, async (req, reply) => {
    const pool  = getTenantPoolFromRequest(req)
    const user  = req.user as JwtPayload
    const data  = ajusteSchema.parse(req.body)

    // Calcula novo estoque
    const { rows: [versao] } = await pool.query(
      `SELECT estoque_atual FROM versoes WHERE id = $1`, [data.versao_id]
    )
    if (!versao) return reply.status(404).send({ error: 'Variação não encontrada' })

    const delta     = data.tipo === 'saida' ? -data.quantidade : data.quantidade
    const novoSaldo = versao.estoque_atual + delta

    if (novoSaldo < 0) {
      return reply.status(400).send({ error: 'Estoque insuficiente para esta saída.' })
    }

    await pool.query(
      `UPDATE versoes SET estoque_atual = $1 WHERE id = $2`,
      [novoSaldo, data.versao_id]
    )
    await pool.query(
      `INSERT INTO ajustes_estoque (versao_id, tipo, quantidade, motivo, usuario_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.versao_id, data.tipo, data.quantidade, data.motivo ?? null, user.id]
    )

    return reply.send({ versao_id: data.versao_id, estoque_atual: novoSaldo })
  })

  // Histórico de ajustes de uma variação
  app.get('/ajustes/:versao_id', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { versao_id } = req.params as { versao_id: string }
    const { rows } = await pool.query(
      `SELECT * FROM ajustes_estoque WHERE versao_id = $1 ORDER BY criado_em DESC LIMIT 50`,
      [versao_id]
    )
    return reply.send(rows)
  })
}
