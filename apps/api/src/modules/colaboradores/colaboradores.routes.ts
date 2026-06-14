import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const dono = [authMiddleware, authorize('dono_loja')]

const perfilSchema = z.object({
  // Pessoal
  cpf:             z.string().optional().nullable(),
  rg:              z.string().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  telefone:        z.string().optional().nullable(),
  cargo:           z.string().optional().nullable(),
  // Endereço
  cep:             z.string().optional().nullable(),
  logradouro:      z.string().optional().nullable(),
  numero:          z.string().optional().nullable(),
  complemento:     z.string().optional().nullable(),
  bairro:          z.string().optional().nullable(),
  cidade:          z.string().optional().nullable(),
  estado:          z.string().max(2).optional().nullable(),
  // Bancário
  banco:           z.string().optional().nullable(),
  agencia:         z.string().optional().nullable(),
  conta:           z.string().optional().nullable(),
  conta_digito:    z.string().optional().nullable(),
  tipo_conta:      z.enum(['corrente', 'poupanca']).optional().nullable(),
  pix:             z.string().optional().nullable(),
  // Emprego
  data_admissao:   z.string().optional().nullable(),
  salario:         z.coerce.number().positive().optional().nullable(),
  tipo_contrato:   z.enum(['clt','pj','mei','autonomo','estagio','outro']).optional().nullable(),
})

const createSchema = z.object({
  nome:        z.string().min(1),
  email:       z.string().email(),
  username:    z.string().min(3).regex(/^[a-z0-9._]+$/, 'Use apenas letras minúsculas, números, ponto e _').optional().nullable(),
  senha:       z.string().min(6),
  permissoes:  z.array(z.string()).default([]),
  dias_semana: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  hora_fim:    z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
}).merge(perfilSchema)

const updateAcessoSchema = z.object({
  nome:                z.string().min(1).optional(),
  email:               z.string().email().optional().nullable(),
  username:            z.string().min(3).regex(/^[a-z0-9._]+$/).optional().nullable(),
  permissoes:          z.array(z.string()).optional().nullable(),
  ativo:               z.boolean().optional(),
  modelo_permissao_id: z.string().uuid().optional().nullable(),
  dias_semana:         z.array(z.number().int().min(0).max(6)).optional().nullable(),
  hora_inicio:         z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  hora_fim:            z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
})

const CAMPOS_USER = `
  u.id, u.nome, u.email, u.username, u.nivel, u.permissoes,
  u.modelo_permissao_id, u.ativo, u.ultimo_acesso,
  u.dias_semana, u.hora_inicio, u.hora_fim, u.is_supervisor
`

async function upsertPerfil(usuario_id: string, data: z.infer<typeof perfilSchema>) {
  const campos = Object.keys(data) as (keyof typeof data)[]
  const valores = campos.map(k => data[k] ?? null)

  if (!campos.length) return

  const sets     = campos.map((k, i) => `${k} = $${i + 2}`).join(', ')
  const inserts  = campos.map(k => k).join(', ')
  const placeholders = campos.map((_, i) => `$${i + 2}`).join(', ')

  await platformPool.query(
    `INSERT INTO colaboradores_perfil (usuario_id, ${inserts})
     VALUES ($1, ${placeholders})
     ON CONFLICT (usuario_id) DO UPDATE SET ${sets}, atualizado_em = NOW()`,
    [usuario_id, ...valores]
  )
}

export async function colaboradoresRoutes(app: FastifyInstance) {

  app.get('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT ${CAMPOS_USER},
         cp.cargo, cp.telefone, cp.salario, cp.tipo_contrato
       FROM usuarios u
       LEFT JOIN colaboradores_perfil cp ON cp.usuario_id = u.id
       WHERE u.loja_id = $1 AND u.ativo = true
       ORDER BY u.nivel DESC, u.nome`,
      [user.loja_id]
    )
    return reply.send(rows)
  })

  app.get('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { rows: [c] } = await platformPool.query(
      `SELECT ${CAMPOS_USER},
         cp.cpf, cp.rg, cp.data_nascimento, cp.telefone, cp.cargo,
         cp.cep, cp.logradouro, cp.numero, cp.complemento, cp.bairro, cp.cidade, cp.estado,
         cp.banco, cp.agencia, cp.conta, cp.conta_digito, cp.tipo_conta, cp.pix,
         cp.data_admissao, cp.salario, cp.tipo_contrato
       FROM usuarios u
       LEFT JOIN colaboradores_perfil cp ON cp.usuario_id = u.id
       WHERE u.id = $1 AND u.loja_id = $2`,
      [id, user.loja_id]
    )
    if (!c) throw new AppError('Colaborador não encontrado', 404)
    return reply.send(c)
  })

  app.get('/:id/logs', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { rows } = await platformPool.query(
      `SELECT l.tipo, l.ip, l.criado_em, l.plataforma, l.motivo
       FROM logs_acesso l
       JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.usuario_id = $1 AND u.loja_id = $2
       ORDER BY l.criado_em DESC LIMIT 50`,
      [id, user.loja_id]
    )
    return reply.send(rows)
  })

  // Colaboradores ativos hoje (último acesso no dia atual)
  app.get('/online', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT id, nome, email, nivel, ultimo_acesso,
              EXTRACT(EPOCH FROM (NOW() - ultimo_acesso))::int AS segundos_atras
       FROM usuarios
       WHERE loja_id = $1
         AND ativo = true
         AND ultimo_acesso > NOW() - INTERVAL '10 minutes'
       ORDER BY ultimo_acesso DESC`,
      [user.loja_id]
    )
    return reply.send(rows)
  })

  // Logs recentes (para relatórios futuros — mantido para uso interno)
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
    if (data.username) {
      const { rows: [dupUser] } = await platformPool.query(
        `SELECT id FROM usuarios WHERE username = $1`, [data.username]
      )
      if (dupUser) throw new AppError('Este nome de usuário já está em uso.', 409)
    }

    const modeloId = (data as any).modelo_permissao_id ?? null

    const { rows: [u] } = await platformPool.query(
      `INSERT INTO usuarios (nome, email, username, senha_hash, nivel, loja_id, permissoes, modelo_permissao_id, dias_semana, hora_inicio, hora_fim, ativo)
       VALUES ($1,$2,$3,$4,'vendedor',$5,$6,$7,$8,$9,$10,true) RETURNING id, nome, email, username, nivel`,
      [data.nome, data.email, data.username ?? null, hash, user.loja_id,
       JSON.stringify(data.permissoes),
       modeloId,
       data.dias_semana ? JSON.stringify(data.dias_semana) : null,
       data.hora_inicio ?? null, data.hora_fim ?? null]
    )

    // Salva perfil complementar
    const { nome, email, senha, permissoes, dias_semana, hora_inicio, hora_fim, ...perfil } = data
    if (Object.values(perfil).some(v => v != null)) {
      await upsertPerfil(u.id, perfil)
    }

    return reply.status(201).send(u)
  })

  // Atualizar dados de acesso
  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const user  = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const data  = updateAcessoSchema.parse(req.body)

    const { rows: [alvo] } = await platformPool.query(
      `SELECT nivel FROM usuarios WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!alvo) throw new AppError('Colaborador não encontrado', 404)

    const upd: string[] = []; const val: any[] = [id, user.loja_id]
    const add = (f: string, v: any) => { val.push(v); upd.push(`${f} = $${val.length}`) }

    if (data.nome        !== undefined) add('nome', data.nome)
    if (data.email       !== undefined) add('email', data.email)
    if (data.username    !== undefined) add('username', data.username ?? null)
    if (data.modelo_permissao_id !== undefined) add('modelo_permissao_id', data.modelo_permissao_id ?? null)
    if (data.ativo               !== undefined) add('ativo', data.ativo)
    if (data.dias_semana !== undefined) add('dias_semana', data.dias_semana ? JSON.stringify(data.dias_semana) : null)
    if (data.hora_inicio !== undefined) add('hora_inicio', data.hora_inicio ?? null)
    if (data.hora_fim    !== undefined) add('hora_fim',    data.hora_fim    ?? null)
    if (data.permissoes  !== undefined && alvo.nivel === 'vendedor') add('permissoes', JSON.stringify(data.permissoes))

    if (upd.length) {
      await platformPool.query(
        `UPDATE usuarios SET ${upd.join(', ')} WHERE id = $1 AND loja_id = $2`, val
      )
    }

    return reply.send({ ok: true })
  })

  // Atualizar perfil complementar
  app.put('/:id/perfil', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }

    const { rows: [alvo] } = await platformPool.query(
      `SELECT id FROM usuarios WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!alvo) throw new AppError('Colaborador não encontrado', 404)

    const perfil = perfilSchema.parse(req.body)
    await upsertPerfil(id, perfil)

    const { rows: [c] } = await platformPool.query(
      `SELECT * FROM colaboradores_perfil WHERE usuario_id = $1`, [id]
    )
    return reply.send(c)
  })

  // Desativar (soft)
  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    if (id === user.id) throw new AppError('Você não pode desativar sua própria conta.', 400)
    await platformPool.query(
      `UPDATE usuarios SET ativo = false WHERE id = $1 AND loja_id = $2 AND nivel = 'vendedor'`,
      [id, user.loja_id]
    )
    return reply.status(204).send()
  })

  // Excluir permanentemente — só se não tiver nenhum histórico
  app.delete('/:id/permanente', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    if (id === user.id) throw new AppError('Você não pode excluir sua própria conta.', 400)

    const { rows: [u] } = await platformPool.query(
      `SELECT nivel FROM usuarios WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!u) throw new AppError('Colaborador não encontrado', 404)
    if (u.nivel === 'dono_loja') throw new AppError('O usuário principal não pode ser excluído.', 403)

    // Verifica se tem logs de acesso
    const { rows: [logs] } = await platformPool.query(
      `SELECT COUNT(*)::int AS total FROM logs_acesso WHERE usuario_id = $1`, [id]
    )
    if (logs.total > 0) {
      throw new AppError(
        'Este colaborador possui histórico de acessos. Use o bloqueio para desativar o acesso.',
        409, 'TEM_HISTORICO'
      )
    }

    // Exclui permanentemente
    await platformPool.query(`DELETE FROM usuarios WHERE id = $1`, [id])
    return reply.status(204).send()
  })

  app.put('/:id/supervisor', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const { is_supervisor } = z.object({ is_supervisor: z.boolean() }).parse(req.body)
    await platformPool.query(
      `UPDATE usuarios SET is_supervisor = $1 WHERE id = $2 AND loja_id = $3`,
      [is_supervisor, id, user.loja_id]
    )
    return reply.send({ ok: true })
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
