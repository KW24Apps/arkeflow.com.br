import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const validarSchema = z.object({
  acao:           z.string().min(1),
  metodo:         z.enum(['senha_mestra', 'supervisor']),
  supervisor_id:  z.string().uuid().nullable().optional(),
  senha:          z.string().min(1),
  justificativa:  z.string().nullable().optional(),
  turno_id:       z.string().uuid().nullable().optional(),
  detalhe:        z.record(z.any()).optional(),
})

export async function autorizacoesRoutes(app: FastifyInstance) {

  // GET /autorizacoes/supervisores
  // Returns list of active supervisors for this loja + whether master password is configured
  app.get('/supervisores', { preHandler: auth }, async (req, reply) => {
    const user     = req.user as JwtPayload
    const tenantPool = getTenantPoolFromRequest(req)

    const [supervisoresRes, configRes] = await Promise.all([
      platformPool.query<{ id: string; nome: string }>(
        `SELECT id, nome FROM usuarios
         WHERE cliente_id = $1 AND is_supervisor = true AND ativo = true
         ORDER BY nome`,
        [user.cliente_id]
      ),
      tenantPool.query<{ senha_mestra_habilitada: boolean; senha_mestra_hash: string | null }>(
        `SELECT senha_mestra_habilitada, senha_mestra_hash FROM configuracoes_loja LIMIT 1`
      ),
    ])

    const cfg = configRes.rows[0]
    const senha_mestra_disponivel = !!(cfg?.senha_mestra_habilitada && cfg?.senha_mestra_hash)

    return reply.send({
      supervisores: supervisoresRes.rows,
      senha_mestra_disponivel,
    })
  })

  // POST /autorizacoes/validar
  // Validates supervisor or master-password authorization and logs the event
  app.post('/validar', { preHandler: auth }, async (req, reply) => {
    const user       = req.user as JwtPayload
    const tenantPool = getTenantPoolFromRequest(req)

    const body = validarSchema.safeParse(req.body)
    if (!body.success) throw new AppError('Dados inválidos', 400, 'VALIDATION_ERROR')

    const { acao, metodo, supervisor_id, senha, justificativa, turno_id, detalhe } = body.data

    let autorizado_por:  string | null = null
    let autorizado_nome: string | null = null

    if (metodo === 'senha_mestra') {
      const { rows: [cfg] } = await tenantPool.query<{ senha_mestra_habilitada: boolean; senha_mestra_hash: string | null }>(
        `SELECT senha_mestra_habilitada, senha_mestra_hash FROM configuracoes_loja LIMIT 1`
      )
      if (!cfg?.senha_mestra_habilitada || !cfg?.senha_mestra_hash) {
        throw new AppError('Senha mestra não configurada', 400, 'SENHA_MESTRA_INDISPONIVEL')
      }
      const ok = await bcrypt.compare(senha, cfg.senha_mestra_hash)
      if (!ok) throw new AppError('Senha incorreta.', 401, 'SENHA_INCORRETA')
      autorizado_por  = null
      autorizado_nome = 'Senha mestra'

    } else {
      // metodo === 'supervisor'
      if (!supervisor_id) throw new AppError('supervisor_id é obrigatório', 400, 'VALIDATION_ERROR')

      const { rows: [supervisor] } = await platformPool.query<{ id: string; nome: string; email: string; senha_hash: string; is_supervisor: boolean; ativo: boolean; cliente_id: string }>(
        `SELECT id, nome, email, senha_hash, is_supervisor, ativo, cliente_id
         FROM usuarios WHERE id = $1`,
        [supervisor_id]
      )

      if (!supervisor || !supervisor.ativo) {
        throw new AppError('Supervisor não encontrado', 404, 'SUPERVISOR_NAO_ENCONTRADO')
      }
      if (supervisor.cliente_id !== user.cliente_id) {
        throw new AppError('Supervisor não pertence a este cliente', 403, 'FORBIDDEN')
      }
      if (!supervisor.is_supervisor) {
        throw new AppError('Usuário não é supervisor', 403, 'NAO_SUPERVISOR')
      }

      const ok = await bcrypt.compare(senha, supervisor.senha_hash)
      if (!ok) throw new AppError('Senha incorreta.', 401, 'SENHA_INCORRETA')

      autorizado_por  = supervisor.email
      autorizado_nome = supervisor.nome
    }

    const { rows: [log] } = await tenantPool.query(
      `INSERT INTO autorizacoes_log
         (usuario_operador_id, acao, metodo, supervisor_id, autorizado_por, autorizado_nome, justificativa, turno_id, detalhe)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, criado_em`,
      [
        user.id,
        acao,
        metodo,
        supervisor_id ?? null,
        autorizado_por,
        autorizado_nome,
        justificativa ?? null,
        turno_id ?? null,
        JSON.stringify(detalhe ?? {}),
      ]
    )

    return reply.status(201).send({
      ok:              true,
      autorizacao_id:  log.id,
      autorizado_por,
      autorizado_nome,
      criado_em:       log.criado_em,
    })
  })
}
