import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const dono = [authMiddleware, authorize('dono_loja')]

const schema = z.object({
  nome:       z.string().min(1),
  permissoes: z.array(z.string()),
})

export async function modelosPermissaoRoutes(app: FastifyInstance) {

  app.get('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT * FROM modelos_permissao WHERE loja_id = $1 ORDER BY nome`,
      [user.loja_id]
    )
    return reply.send(rows)
  })

  app.post('/', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = schema.parse(req.body)
    const { rows: [r] } = await platformPool.query(
      `INSERT INTO modelos_permissao (loja_id, nome, permissoes)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.loja_id, data.nome, JSON.stringify(data.permissoes)]
    )
    return reply.status(201).send(r)
  })

  app.put('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    const data = schema.partial().parse(req.body)

    const { rows: [modelo] } = await platformPool.query(
      `SELECT sistema FROM modelos_permissao WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!modelo) throw new AppError('Modelo não encontrado', 404)
    if (modelo.sistema) throw new AppError('O modelo Administrador não pode ser editado.', 403)

    const upd: string[] = []; const val: any[] = [id, user.loja_id]
    if (data.nome)       { val.push(data.nome);                      upd.push(`nome = $${val.length}`) }
    if (data.permissoes) { val.push(JSON.stringify(data.permissoes)); upd.push(`permissoes = $${val.length}`) }

    if (!upd.length) return reply.status(400).send({ error: 'Nada para atualizar' })

    const { rows: [r] } = await platformPool.query(
      `UPDATE modelos_permissao SET ${upd.join(', ')} WHERE id = $1 AND loja_id = $2 RETURNING *`,
      val
    )
    return reply.send(r)
  })

  app.delete('/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }

    const { rows: [modelo] } = await platformPool.query(
      `SELECT sistema FROM modelos_permissao WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!modelo) throw new AppError('Modelo não encontrado', 404)
    if (modelo.sistema) throw new AppError('O modelo Administrador não pode ser removido.', 403)

    await platformPool.query(
      `UPDATE usuarios SET modelo_permissao_id = NULL WHERE modelo_permissao_id = $1`, [id]
    )
    await platformPool.query(
      `DELETE FROM modelos_permissao WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    return reply.status(204).send()
  })
}
