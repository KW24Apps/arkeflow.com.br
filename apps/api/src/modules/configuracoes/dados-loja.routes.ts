import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { platformPool } from '../../config/database'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import type { JwtPayload } from '@arkeflow/shared'

const UPLOAD_DIR      = '/var/www/arkeflow.com.br/uploads/logos'
const CERT_UPLOAD_DIR = '/var/www/arkeflow.com.br/uploads/certificados'

const dono = [authMiddleware, authorize('dono_loja')]
const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]

const enderecoSchema = z.object({
  cep:                       z.string().optional().nullable(),
  logradouro:                z.string().optional().nullable(),
  numero:                    z.string().optional().nullable(),
  complemento:               z.string().optional().nullable(),
  bairro:                    z.string().optional().nullable(),
  cidade:                    z.string().optional().nullable(),
  estado:                    z.string().max(2).optional().nullable(),
  link_loja:                 z.string().optional().nullable(),
  regime_tributario:         z.string().max(30).optional().nullable(),
  certificado_digital_senha: z.string().optional().nullable(),
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
              cep, logradouro, numero, complemento, bairro, cidade, estado,
              regime_tributario, certificado_digital_path, certificado_digital_senha
       FROM clientes WHERE id = $1`,
      [user.cliente_id]
    )
    const { rows: contatos } = await platformPool.query(
      `SELECT * FROM clientes_contatos WHERE cliente_id = $1 ORDER BY tipo, nome`,
      [user.cliente_id]
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
      `UPDATE clientes SET ${set} WHERE id = $1`, [user.cliente_id, ...values]
    )
    return reply.send({ ok: true })
  })

  // Listar contatos da loja
  app.get('/contatos', { preHandler: auth }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { rows } = await platformPool.query(
      `SELECT * FROM clientes_contatos WHERE cliente_id = $1 ORDER BY tipo, nome`,
      [user.cliente_id]
    )
    return reply.send(rows)
  })

  // Adicionar contato
  app.post('/contatos', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = contatoSchema.parse(req.body)
    const { rows: [c] } = await platformPool.query(
      `INSERT INTO clientes_contatos (cliente_id, tipo, nome, telefone, email)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user.cliente_id, data.tipo, data.nome, data.telefone ?? null, data.email ?? null]
    )
    return reply.status(201).send(c)
  })

  // Remover contato
  app.delete('/contatos/:id', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const { id } = req.params as { id: string }
    await platformPool.query(
      `DELETE FROM clientes_contatos WHERE id = $1 AND cliente_id = $2`, [id, user.cliente_id]
    )
    return reply.status(204).send()
  })

  // Upload do certificado digital (.pfx / .p12)
  app.post('/certificado', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

    mkdirSync(CERT_UPLOAD_DIR, { recursive: true })
    const ext      = data.filename.split('.').pop() ?? 'pfx'
    const filename = `${user.cliente_id}.${ext}`
    const caminho  = join(CERT_UPLOAD_DIR, filename)

    await pipeline(data.file, createWriteStream(caminho))
    await platformPool.query(
      `UPDATE clientes SET certificado_digital_path = $1 WHERE id = $2`,
      [data.filename, user.cliente_id]
    )
    return reply.send({ certificado_digital_path: data.filename })
  })

  // Upload de logo (arquivo redimensionado pelo browser)
  app.post('/logo', { preHandler: dono }, async (req, reply) => {
    const user = req.user as JwtPayload
    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

    mkdirSync(UPLOAD_DIR, { recursive: true })
    const filename = `${user.cliente_id}.webp`
    const caminho  = join(UPLOAD_DIR, filename)
    const logoUrl  = `/uploads/logos/${filename}`

    await pipeline(data.file, createWriteStream(caminho))
    await platformPool.query(`UPDATE clientes SET logo_url = $1 WHERE id = $2`, [logoUrl, user.cliente_id])

    return reply.send({ logo_url: logoUrl })
  })

  // Configurações do sistema (logo, estoque, link)
  app.get('/sistema', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows: [cfg] } = await pool.query(`SELECT * FROM configuracoes_loja LIMIT 1`)

    const user = req.user as JwtPayload
    const { rows: [loja] } = await platformPool.query(
      `SELECT logo_url FROM clientes WHERE id = $1`, [user.cliente_id]
    )

    // Never leak the hash — expose only whether one is set
    const senhaMestraDefinida = !!(cfg?.senha_mestra_hash)
    const { senha_mestra_hash: _omit, ...cfgSafe } = cfg ?? {}

    return reply.send({ ...cfgSafe, logo_url_loja: loja?.logo_url ?? null, senha_mestra_definida: senhaMestraDefinida })
  })

  app.put('/sistema', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload
    const {
      logo_url, link_loja, controle_estoque,
      desconto_max_percentual, desconto_max_valor, promocao_aceita_desconto, desconto_restringe_formas,
      supervisao_habilitada, senha_mestra_habilitada,
      exige_auth_fechar_falta, exige_auth_fechar_sobra, exige_auth_cancelar_item,
      sangria_limite_habilitado, sangria_limite_valor, sangria_fundo_troco, sangria_limite_modo,
      atalhos_caixa,
      cashback_habilitado, cashback_aceita_promocao, cashback_aceita_desconto, cashback_aceita_crediario,
      cashback_limite_modo, cashback_limite_percentual, cashback_carencia_dias, cashback_validade_meses,
      inatividade_minutos,
      senha_mestra,
      cadastro_exige_cpf, cadastro_exige_email, cadastro_exige_endereco,
      crediario_exige_email, crediario_exige_endereco,
      prova_exige_cpf, prova_exige_email, prova_exige_endereco,
      prova_habilitada, prova_prazo_obrigatorio, prova_alerta_dias,
    } = req.body as any

    console.log('PUT sistema body:', JSON.stringify(req.body))

    if (cashback_limite_modo !== undefined && !['livre', 'percentual'].includes(cashback_limite_modo)) {
      return reply.status(400).send({ error: 'cashback_limite_modo inválido.' })
    }
    if (cashback_limite_percentual !== undefined && Number(cashback_limite_percentual) < 0) {
      return reply.status(400).send({ error: 'cashback_limite_percentual deve ser ≥ 0.' })
    }
    if (cashback_carencia_dias !== undefined && Number(cashback_carencia_dias) < 0) {
      return reply.status(400).send({ error: 'cashback_carencia_dias deve ser ≥ 0.' })
    }
    if (cashback_validade_meses !== undefined && Number(cashback_validade_meses) < 0) {
      return reply.status(400).send({ error: 'cashback_validade_meses deve ser ≥ 0.' })
    }
    if (sangria_limite_modo !== undefined && !['avisar', 'obrigar'].includes(sangria_limite_modo)) {
      return reply.status(400).send({ error: 'sangria_limite_modo inválido.' })
    }
    if (sangria_limite_valor !== undefined && Number(sangria_limite_valor) < 0) {
      return reply.status(400).send({ error: 'sangria_limite_valor deve ser ≥ 0.' })
    }
    let inatividadeMinutosVal: number | undefined
    if (inatividade_minutos !== undefined) {
      inatividadeMinutosVal = Math.min(1440, Math.max(60, Math.round(Number(inatividade_minutos))))
    }
    if (sangria_fundo_troco !== undefined && Number(sangria_fundo_troco) < 0) {
      return reply.status(400).send({ error: 'sangria_fundo_troco deve ser ≥ 0.' })
    }
    if (atalhos_caixa !== undefined) {
      if (typeof atalhos_caixa !== 'object' || atalhos_caixa === null || Array.isArray(atalhos_caixa)) {
        return reply.status(400).send({ error: 'atalhos_caixa deve ser um objeto.' })
      }
      for (const [k, v] of Object.entries(atalhos_caixa as Record<string, unknown>)) {
        if (typeof v !== 'string') return reply.status(400).send({ error: `atalhos_caixa.${k}: valor deve ser string.` })
        if (v !== '' && !/^[A-Z0-9]$/.test((v as string).toUpperCase())) {
          return reply.status(400).send({ error: `atalhos_caixa.${k}: use letra A–Z ou dígito 0–9.` })
        }
      }
    }

    // Atualiza configuracoes_loja no banco da loja
    const upd: string[] = []; const val: any[] = []
    if (controle_estoque !== undefined)            { val.push(controle_estoque);             upd.push(`controle_estoque = $${val.length}`) }
    if (link_loja !== undefined)                   { val.push(link_loja ?? null);            upd.push(`link_loja = $${val.length}`) }
    if (desconto_max_percentual !== undefined)     { val.push(desconto_max_percentual);      upd.push(`desconto_max_percentual = $${val.length}`) }
    if (desconto_max_valor !== undefined)          { val.push(desconto_max_valor);           upd.push(`desconto_max_valor = $${val.length}`) }
    if (promocao_aceita_desconto !== undefined)    { val.push(promocao_aceita_desconto);     upd.push(`promocao_aceita_desconto = $${val.length}`) }
    if (desconto_restringe_formas !== undefined)   { val.push(desconto_restringe_formas);    upd.push(`desconto_restringe_formas = $${val.length}`) }
    if (supervisao_habilitada !== undefined)       { val.push(supervisao_habilitada);        upd.push(`supervisao_habilitada = $${val.length}`) }
    if (senha_mestra_habilitada !== undefined)     { val.push(senha_mestra_habilitada);      upd.push(`senha_mestra_habilitada = $${val.length}`) }
    if (exige_auth_fechar_falta !== undefined)     { val.push(exige_auth_fechar_falta);      upd.push(`exige_auth_fechar_falta = $${val.length}`) }
    if (exige_auth_fechar_sobra !== undefined)     { val.push(exige_auth_fechar_sobra);      upd.push(`exige_auth_fechar_sobra = $${val.length}`) }
    if (exige_auth_cancelar_item !== undefined)    { val.push(exige_auth_cancelar_item);     upd.push(`exige_auth_cancelar_item = $${val.length}`) }
    if (sangria_limite_habilitado !== undefined)   { val.push(sangria_limite_habilitado);    upd.push(`sangria_limite_habilitado = $${val.length}`) }
    if (sangria_limite_valor !== undefined)        { val.push(sangria_limite_valor);         upd.push(`sangria_limite_valor = $${val.length}`) }
    if (sangria_fundo_troco !== undefined)         { val.push(sangria_fundo_troco);          upd.push(`sangria_fundo_troco = $${val.length}`) }
    if (sangria_limite_modo !== undefined)         { val.push(sangria_limite_modo);          upd.push(`sangria_limite_modo = $${val.length}`) }
    if (atalhos_caixa !== undefined)               { val.push(atalhos_caixa);                upd.push(`atalhos_caixa = $${val.length}`) }
    if (cashback_habilitado !== undefined)        { val.push(cashback_habilitado);          upd.push(`cashback_habilitado = $${val.length}`) }
    if (cashback_aceita_promocao !== undefined)   { val.push(cashback_aceita_promocao);     upd.push(`cashback_aceita_promocao = $${val.length}`) }
    if (cashback_aceita_desconto !== undefined)   { val.push(cashback_aceita_desconto);     upd.push(`cashback_aceita_desconto = $${val.length}`) }
    if (cashback_aceita_crediario !== undefined)  { val.push(cashback_aceita_crediario);    upd.push(`cashback_aceita_crediario = $${val.length}`) }
    if (cashback_limite_modo !== undefined)       { val.push(cashback_limite_modo);         upd.push(`cashback_limite_modo = $${val.length}`) }
    if (cashback_limite_percentual !== undefined) { val.push(cashback_limite_percentual);   upd.push(`cashback_limite_percentual = $${val.length}`) }
    if (cashback_carencia_dias !== undefined)     { val.push(cashback_carencia_dias);       upd.push(`cashback_carencia_dias = $${val.length}`) }
    if (cashback_validade_meses !== undefined)    { val.push(cashback_validade_meses);      upd.push(`cashback_validade_meses = $${val.length}`) }
    if (inatividadeMinutosVal !== undefined)          { val.push(inatividadeMinutosVal);          upd.push(`inatividade_minutos = $${val.length}`) }
    if (cadastro_exige_cpf !== undefined)             { val.push(cadastro_exige_cpf);             upd.push(`cadastro_exige_cpf = $${val.length}`) }
    if (cadastro_exige_email !== undefined)           { val.push(cadastro_exige_email);           upd.push(`cadastro_exige_email = $${val.length}`) }
    if (cadastro_exige_endereco !== undefined)        { val.push(cadastro_exige_endereco);        upd.push(`cadastro_exige_endereco = $${val.length}`) }
    if (crediario_exige_email !== undefined)          { val.push(crediario_exige_email);          upd.push(`crediario_exige_email = $${val.length}`) }
    if (crediario_exige_endereco !== undefined)       { val.push(crediario_exige_endereco);       upd.push(`crediario_exige_endereco = $${val.length}`) }
    if (prova_exige_cpf !== undefined)                { val.push(prova_exige_cpf);                upd.push(`prova_exige_cpf = $${val.length}`) }
    if (prova_exige_email !== undefined)              { val.push(prova_exige_email);              upd.push(`prova_exige_email = $${val.length}`) }
    if (prova_exige_endereco !== undefined)           { val.push(prova_exige_endereco);           upd.push(`prova_exige_endereco = $${val.length}`) }
    if (prova_habilitada !== undefined)               { val.push(prova_habilitada);               upd.push(`prova_habilitada = $${val.length}`) }
    if (prova_prazo_obrigatorio !== undefined)        { val.push(prova_prazo_obrigatorio);        upd.push(`prova_prazo_obrigatorio = $${val.length}`) }
    if (prova_alerta_dias !== undefined)              { val.push(Math.max(1, Number(prova_alerta_dias))); upd.push(`prova_alerta_dias = $${val.length}`) }
    if (senha_mestra && typeof senha_mestra === 'string' && senha_mestra.trim()) {
      const hash = await bcrypt.hash(senha_mestra.trim(), 10)
      val.push(hash); upd.push(`senha_mestra_hash = $${val.length}`)
    }
    if (upd.length) await pool.query(`UPDATE configuracoes_loja SET ${upd.join(', ')}`, val)

    // Atualiza logo_url na tabela lojas (plataforma)
    if (logo_url !== undefined) {
      await platformPool.query(`UPDATE clientes SET logo_url = $1 WHERE id = $2`, [logo_url ?? null, user.cliente_id])
    }

    return reply.send({ ok: true })
  })
}
