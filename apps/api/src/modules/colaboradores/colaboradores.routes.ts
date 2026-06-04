import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const dono = [authMiddleware, authorize('dono_loja')]

const createSchema = z.object({
  nome:       z.string().min(1),
  email:      z.string().email(),
  senha:      z.string().min(6, 'Senha mínimo 6 caracteres'),
  permissoes: z.array(z.string()).default([]),
})

const updateSchema = z.object({
  nome:       z.string().min(1).optional(),
  permissoes: z.array(z.string()).optional(),
  ativo:      z.boolean().optional(),
})

export async function colaboradoresRoutes(app: FastifyInstance) {

  // Listar colaboradores da loja
  app.get('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT id, nome, email, nivel, permissoes, ativo, ultimo_acesso
       FROM usuarios
       WHERE loja_id = $1 AND nivel = 'vendedor' AND ativo = true
       ORDER BY nome`,
      [user.loja_id]
    )
    return reply.send(rows)
  })

  // Detalhe de um colaborador
  app.get('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { rows: [c] } = await platformPool.query(
      `SELECT id, nome, email, nivel, permissoes, ativo, ultimo_acesso
       FROM usuarios WHERE id = $1 AND loja_id = $2`,
      [id, user.loja_id]
    )
    if (!c) throw new AppError('Colaborador não encontrado', 404)
    return reply.send(c)
  })

  // Criar colaborador
  app.post('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = createSchema.parse(req.body)

    const { rows: [existe] } = await platformPool.query(
      `SELECT id FROM usuarios WHERE email = $1`, [data.email]
    )
    if (existe) throw new AppError('Este email já está em uso.', 409)

    const hash = await bcrypt.hash(data.senha, 10)
    const { rows: [c] } = await platformPool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, nivel, loja_id, permissoes, ativo)
       VALUES ($1, $2, $3, 'vendedor', $4, $5, true) RETURNING id, nome, email, nivel, permissoes`,
      [data.nome, data.email, hash, user.loja_id, JSON.stringify(data.permissoes)]
    )
    return reply.status(201).send(c)
  })

  // Atualizar colaborador
  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const data = updateSchema.parse(req.body)

    const updates: string[] = []
    const values: any[]    = [id, user.loja_id]

    if (data.nome       !== undefined) { values.push(data.nome);                         updates.push(`nome = $${values.length}`) }
    if (data.permissoes !== undefined) { values.push(JSON.stringify(data.permissoes));   updates.push(`permissoes = $${values.length}`) }
    if (data.ativo      !== undefined) { values.push(data.ativo);                        updates.push(`ativo = $${values.length}`) }

    if (!updates.length) return reply.status(400).send({ error: 'Nada para atualizar' })

    const { rows: [c] } = await platformPool.query(
      `UPDATE usuarios SET ${updates.join(', ')}
       WHERE id = $1 AND loja_id = $2 AND nivel = 'vendedor' RETURNING id, nome, email, permissoes, ativo`,
      values
    )
    if (!c) throw new AppError('Colaborador não encontrado', 404)
    return reply.send(c)
  })

  // Desativar colaborador
  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    await platformPool.query(
      `UPDATE usuarios SET ativo = false WHERE id = $1 AND loja_id = $2 AND nivel = 'vendedor'`,
      [id, user.loja_id]
    )
    return reply.status(204).send()
  })

  // Redefinir senha
  app.put('/:id/senha', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { senha } = req.body as { senha: string }
    if (!senha || senha.length < 6) throw new AppError('Senha mínimo 6 caracteres', 400)

    const hash = await bcrypt.hash(senha, 10)
    await platformPool.query(
      `UPDATE usuarios SET senha_hash = $1 WHERE id = $2 AND loja_id = $3 AND nivel = 'vendedor'`,
      [hash, id, user.loja_id]
    )
    return reply.send({ ok: true })
  })
}
