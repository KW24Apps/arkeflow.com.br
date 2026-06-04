import type { FastifyInstance } from 'fastify'
import { createWriteStream, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

const dono = [authMiddleware, authorize('dono_loja')]
const UPLOAD_DIR = '/var/www/arkeflow.com.br/uploads/colaboradores'

export async function documentosRoutes(app: FastifyInstance) {

  // Listar documentos de um colaborador
  app.get('/:id/documentos', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }

    // Verifica se pertence à loja
    const { rows: [u] } = await platformPool.query(
      `SELECT id FROM usuarios WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!u) throw new AppError('Colaborador não encontrado', 404)

    const { rows } = await platformPool.query(
      `SELECT id, nome, tipo_mime, tamanho, criado_em
       FROM colaboradores_documentos WHERE usuario_id = $1 ORDER BY criado_em DESC`,
      [id]
    )
    return reply.send(rows)
  })

  // Upload de documento
  app.post('/:id/documentos', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }

    const { rows: [u] } = await platformPool.query(
      `SELECT id FROM usuarios WHERE id = $1 AND loja_id = $2`, [id, user.loja_id]
    )
    if (!u) throw new AppError('Colaborador não encontrado', 404)

    const data = await req.file()
    if (!data) throw new AppError('Nenhum arquivo enviado', 400)

    // Cria pasta se não existir
    const pasta = join(UPLOAD_DIR, id)
    mkdirSync(pasta, { recursive: true })

    const ext      = data.filename.split('.').pop() ?? 'bin'
    const nomeArq  = `${randomUUID()}.${ext}`
    const caminho  = join(pasta, nomeArq)
    const relativo = `${id}/${nomeArq}`

    await pipeline(data.file, createWriteStream(caminho))

    const { rows: [doc] } = await platformPool.query(
      `INSERT INTO colaboradores_documentos (usuario_id, nome, arquivo, tipo_mime, tamanho)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, tipo_mime, tamanho, criado_em`,
      [id, data.filename, relativo, data.mimetype, null]
    )

    return reply.status(201).send(doc)
  })

  // Download de documento
  app.get('/documentos/:doc_id/download', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { doc_id } = req.params as { doc_id: string }

    const { rows: [doc] } = await platformPool.query(
      `SELECT d.*, u.loja_id
       FROM colaboradores_documentos d
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE d.id = $1 AND u.loja_id = $2`,
      [doc_id, user.loja_id]
    )
    if (!doc) throw new AppError('Documento não encontrado', 404)

    const caminho = join(UPLOAD_DIR, doc.arquivo)
    return reply.sendFile(doc.nome, join(UPLOAD_DIR, doc.usuario_id))
      .catch(() => reply.sendFile(doc.arquivo, UPLOAD_DIR))
  })

  // Remover documento
  app.delete('/documentos/:doc_id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { doc_id } = req.params as { doc_id: string }

    const { rows: [doc] } = await platformPool.query(
      `SELECT d.*, u.loja_id
       FROM colaboradores_documentos d
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE d.id = $1 AND u.loja_id = $2`,
      [doc_id, user.loja_id]
    )
    if (!doc) throw new AppError('Documento não encontrado', 404)

    try { unlinkSync(join(UPLOAD_DIR, doc.arquivo)) } catch {}
    await platformPool.query(`DELETE FROM colaboradores_documentos WHERE id = $1`, [doc_id])
    return reply.status(204).send()
  })
}
