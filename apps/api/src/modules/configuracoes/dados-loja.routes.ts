import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { platformPool } from '../../config/database'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import type { JwtPayload } from '@arkeflow/shared'

const dono = [authMiddleware, authorize('dono_loja')]
const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const enderecoSchema = z.object({
  cep:         z.string().optional().nullable(),
  logradouro:  z.string().optional().nullable(),
  numero:      z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro:      z.string().optional().nullable(),
  cidade:      z.string().optional().nullable(),
  estado:      z.string().max(2).optional().nullable(),
  link_loja:   z.string().optional().nullable(),
})

const contatoSchema = z.object({
  tipo:     z.enum(['comercial', 'financeiro', 'socio']),
  nome:     z.string().min(1),
  telefone: z.string().optional().nullable(),
  email:    z.string().email().optional().nullable(),
})

export async function dadosLojaRoutes(app: FastifyInstance) {

  // Dados completos da loja (inclui endereço + contatos)
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows: [loja] } = await platformPool.query(
      `SELECT id, nome, cnpj, telefone, email, status,
              logo_url, link_loja,
              cep, logradouro, numero, complemento, bairro, cidade, estado
       FROM lojas WHERE id = $1`,
      [user.loja_id]
    )
    const { rows: contatos } = await platformPool.query(
      `SELECT * FROM lojas_contatos WHERE loja_id = $1 ORDER BY tipo, nome`,
      [user.loja_id]
    )
    return reply.send({ ...loja, contatos })
  })

  // Atualizar endereço e dados editáveis
  app.put('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = enderecoSchema.parse(req.body)

    const keys   = Object.keys(data).filter(k => (data as any)[k] !== undefined)
    const values = keys.map(k => (data as any)[k] ?? null)
    const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')

    if (!keys.length) return reply.status(400).send({ error: 'Nada para atualizar' })

    await platformPool.query(
      `UPDATE lojas SET ${set} WHERE id = $1`, [user.loja_id, ...values]
    )
    return reply.send({ ok: true })
  })

  // Listar contatos da loja
  app.get('/contatos', { preHandler: auth }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT * FROM lojas_contatos WHERE loja_id = $1 ORDER BY tipo, nome`,
      [user.loja_id]
    )
    return reply.send(rows)
  })

  // Adicionar contato
  app.post('/contatos', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = contatoSchema.parse(req.body)
    const { rows: [c] } = await platformPool.query(
      `INSERT INTO lojas_contatos (loja_id, tipo, nome, telefone, email)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user.loja_id, data.tipo, data.nome, data.telefone ?? null, data.email ?? null]
    )
    return reply.status(201).send(c)
  })

  // Remover contato
  app.delete('/contatos/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    await platformPool.query(
      `DELETE FROM lojas_contatos WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    return reply.status(204).send()
  })

  // Configurações do sistema (logo, estoque, link)
  app.get('/sistema', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows: [cfg] } = await pool.query(`SELECT * FROM configuracoes_loja LIMIT 1`)

    // Também retorna logo_url da loja para o header
    const user = req.user as JwtPayload
    const { rows: [loja] } = await platformPool.query(
      `SELECT logo_url FROM lojas WHERE id = $1`, [user.loja_id]
    )
    return reply.send({ ...cfg, logo_url_loja: loja?.logo_url ?? null })
  })

  app.put('/sistema', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const { logo_url, link_loja, controle_estoque } = req.body as any

    // Atualiza configuracoes_loja no banco da loja
    if (controle_estoque !== undefined || link_loja !== undefined) {
      const upd: string[] = []; const val: any[] = []
      if (controle_estoque !== undefined) { val.push(controle_estoque); upd.push(`controle_estoque = $${val.length}`) }
      if (link_loja !== undefined)        { val.push(link_loja ?? null); upd.push(`link_loja = $${val.length}`) }
      if (upd.length) await pool.query(`UPDATE configuracoes_loja SET ${upd.join(', ')}`, val)
    }

    // Atualiza logo_url na tabela lojas (plataforma)
    if (logo_url !== undefined) {
      await platformPool.query(`UPDATE lojas SET logo_url = $1 WHERE id = $2`, [logo_url ?? null, user.loja_id])
    }

    return reply.send({ ok: true })
  })
}
