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
  nome:        z.string().min(1),
  email:       z.string().email(),
  senha:       z.string().min(6, 'Senha mínimo 6 caracteres'),
  permissoes:  z.array(z.string()).default([]),
  dias_semana: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  hora_fim:    z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
})

const updateSchema = z.object({
  nome:        z.string().min(1).optional(),
  permissoes:  z.array(z.string()).optional(),
  ativo:       z.boolean().optional(),
  dias_semana: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  hora_fim:    z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
})

const CAMPOS_LISTAGEM = `
  id, nome, email, nivel, permissoes, ativo, ultimo_acesso,
  dias_semana, hora_inicio, hora_fim
`

export async function colaboradoresRoutes(app: FastifyInstance) {

  // Lista TODOS os usuários da loja (dono + vendedores)
  app.get('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT ${CAMPOS_LISTAGEM}
       FROM usuarios
       WHERE loja_id = $1 AND ativo = true
       ORDER BY nivel DESC, nome`,  // dono primeiro
      [user.loja_id]
    )
    return reply.send(rows)
  })

  app.get('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { rows: [c] } = await platformPool.query(
      `SELECT ${CAMPOS_LISTAGEM} FROM usuarios WHERE id = $1 AND loja_id = $2`,
      [id, user.loja_id]
    )
    if (!c) throw new AppError('Colaborador não encontrado', 404)
    return reply.send(c)
  })

  // Log de acessos de um colaborador
  app.get('/:id/logs', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { rows } = await platformPool.query(
      `SELECT l.tipo, l.ip, l.criado_em
       FROM logs_acesso l
       JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.usuario_id = $1 AND u.loja_id = $2
       ORDER BY l.criado_em DESC LIMIT 50`,
      [id, user.loja_id]
    )
    return reply.send(rows)
  })

  // Logs de todos os colaboradores da loja (para o dashboard)
  app.get('/logs/recentes', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT l.tipo, l.ip, l.criado_em, u.nome, u.email, u.nivel
       FROM logs_acesso l
       JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.loja_id = $1
       ORDER BY l.criado_em DESC LIMIT 100`,
      [user.loja_id]
    )
    return reply.send(rows)
  })

  app.post('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = createSchema.parse(req.body)

    const { rows: [existe] } = await platformPool.query(
      `SELECT id FROM usuarios WHERE email = $1`, [data.email]
    )
    if (existe) throw new AppError('Este email já está em uso.', 409)

    const hash = await bcrypt.hash(data.senha, 10)
    const { rows: [c] } = await platformPool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, nivel, loja_id, permissoes, dias_semana, hora_inicio, hora_fim, ativo)
       VALUES ($1,$2,$3,'vendedor',$4,$5,$6,$7,$8,true) RETURNING ${CAMPOS_LISTAGEM}`,
      [data.nome, data.email, hash, user.loja_id,
       JSON.stringify(data.permissoes),
       data.dias_semana ? JSON.stringify(data.dias_semana) : null,
       data.hora_inicio ?? null, data.hora_fim ?? null]
    )
    return reply.status(201).send(c)
  })

  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const user  = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const data  = updateSchema.parse(req.body)

    // Dono não pode ter permissões alteradas por aqui
    const { rows: [alvo] } = await platformPool.query(
      `SELECT nivel FROM usuarios WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!alvo) throw new AppError('Colaborador não encontrado', 404)

    const updates: string[] = []
    const values: any[] = [id, user.loja_id]

    const add = (field: string, val: any) => {
      values.push(val); updates.push(`${field} = $${values.length}`)
    }

    if (data.nome       !== undefined) add('nome', data.nome)
    if (data.ativo      !== undefined) add('ativo', data.ativo)
    if (data.dias_semana!== undefined) add('dias_semana', data.dias_semana ? JSON.stringify(data.dias_semana) : null)
    if (data.hora_inicio!== undefined) add('hora_inicio', data.hora_inicio ?? null)
    if (data.hora_fim   !== undefined) add('hora_fim',    data.hora_fim ?? null)

    // Permissões só se for vendedor
    if (data.permissoes !== undefined && alvo.nivel === 'vendedor') {
      add('permissoes', JSON.stringify(data.permissoes))
    }

    if (!updates.length) return reply.status(400).send({ error: 'Nada para atualizar' })

    const { rows: [c] } = await platformPool.query(
      `UPDATE usuarios SET ${updates.join(', ')}
       WHERE id = $1 AND loja_id = $2 RETURNING ${CAMPOS_LISTAGEM}`,
      values
    )
    return reply.send(c)
  })

  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }

    if (id === user.id) throw new AppError('Você não pode desativar sua própria conta.', 400)

    await platformPool.query(
      `UPDATE usuarios SET ativo = false
       WHERE id = $1 AND loja_id = $2 AND nivel = 'vendedor'`,
      [id, user.loja_id]
    )
    return reply.status(204).send()
  })

  app.put('/:id/senha', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { senha } = req.body as { senha: string }
    if (!senha || senha.length < 6) throw new AppError('Senha mínimo 6 caracteres', 400)

    const hash = await bcrypt.hash(senha, 10)
    await platformPool.query(
      `UPDATE usuarios SET senha_hash = $1 WHERE id = $2 AND loja_id = $3`,
      [hash, id, user.loja_id]
    )
    return reply.send({ ok: true })
  })
}
