import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { XMLParser } from 'fast-xml-parser'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import type { JwtPayload } from '@arkeflow/shared'

const auth = [authMiddleware, authorize('dono_loja', 'vendedor')]
const dono = [authMiddleware, authorize('dono_loja')]

const ajusteSchema = z.object({
  versao_id:      z.string().uuid(),
  tipo:           z.enum(['entrada', 'saida', 'ajuste']),
  quantidade:     z.coerce.number().int().positive(),
  motivo:         z.string().optional(),
  custo_unitario: z.coerce.number().min(0).optional(),
  cfop:           z.string().max(10).optional(),
  fornecedor_id:  z.string().uuid().optional(),
})

const nfeXmlSchema = z.object({ xml: z.string().min(1) })

// ── NF-e XML parser ──────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  parseTagValue:       false,  // prevent chNFe/chave_acesso from being converted to float
  isArray:             (name: string) => name === 'det',
})

function num(v: unknown): number { return Number(v ?? 0) }
function str(v: unknown): string { return String(v ?? '') }

function extractIcms(icms: Record<string, any> | undefined) {
  if (!icms) return { cst: '0', base: 0, aliq: 0, valor: 0 }
  const inner = Object.values(icms)[0] as Record<string, any> | undefined
  if (!inner) return { cst: '0', base: 0, aliq: 0, valor: 0 }
  return {
    cst:   str(inner.CST ?? inner.CSOSN ?? '0'),
    base:  num(inner.vBC),
    aliq:  num(inner.pICMS),
    valor: num(inner.vICMS),
  }
}

function extractAliqValor(group: Record<string, any> | undefined, aliqKey: string, valorKey: string) {
  if (!group) return { aliq: 0, valor: 0 }
  const inner = Object.values(group)[0] as Record<string, any> | undefined
  if (!inner) return { aliq: 0, valor: 0 }
  return { aliq: num(inner[aliqKey]), valor: num(inner[valorKey]) }
}

function parseNFe(xmlStr: string) {
  const doc     = xmlParser.parse(xmlStr)
  const nfeProc = doc.nfeProc
  const infNFe  = nfeProc?.NFe?.infNFe ?? doc.NFe?.infNFe

  if (!infNFe) throw new Error('Estrutura NF-e não encontrada no XML')

  // chave_acesso — 44 chars
  let chaveAcesso: string
  if (nfeProc?.protNFe?.infProt?.chNFe) {
    chaveAcesso = str(nfeProc.protNFe.infProt.chNFe).trim()
  } else {
    chaveAcesso = str(infNFe['@_Id'] ?? '').trim().replace(/^NFe/, '')
  }

  const ide     = infNFe.ide    ?? {}
  const emit    = infNFe.emit   ?? {}
  const total   = infNFe.total  ?? {}
  const icmsTot = total.ICMSTot ?? {}
  const det     = Array.isArray(infNFe.det)
    ? infNFe.det
    : infNFe.det ? [infNFe.det] : []

  // data_emissao: ISO with timezone → take date part
  const dataEmissao = str(ide.dhEmi ?? ide.dEmi ?? '').slice(0, 10)

  const header = {
    chave_acesso:  chaveAcesso,
    numero:        str(ide.nNF),
    serie:         str(ide.serie).padStart(3, '0'),
    data_emissao:  dataEmissao,
    data_entrada:  dataEmissao,
    emitente_cnpj: str(emit.CNPJ ?? emit.CPF ?? ''),
    emitente_nome: str(emit.xNome ?? emit.xFant ?? ''),
    emitente_ie:   str(emit.IE ?? '') || null,
    emitente_uf:   str((emit.enderEmit as any)?.UF ?? ''),
    vl_produtos:   num(icmsTot.vProd),
    vl_frete:      num(icmsTot.vFrete),
    vl_seguro:     num(icmsTot.vSeg),
    vl_desconto:   num(icmsTot.vDesc),
    vl_outros:     num(icmsTot.vOutro),
    vl_ipi:        num(icmsTot.vIPI),
    vl_icms:       num(icmsTot.vICMS),
    vl_pis:        num(icmsTot.vPIS),
    vl_cofins:     num(icmsTot.vCOFINS),
    vl_total:      num(icmsTot.vNF),
  }

  const itens = det.map((d: any) => {
    const prod    = d.prod    ?? {}
    const imp     = d.imposto ?? {}
    const icms    = extractIcms(imp.ICMS)
    const pis     = extractAliqValor(imp.PIS,    'pPIS',    'vPIS')
    const cofins  = extractAliqValor(imp.COFINS, 'pCOFINS', 'vCOFINS')
    const ipiInner = imp.IPI?.IPITrib ?? imp.IPI?.IPINT
    const eanRaw  = str(prod.cEAN ?? '').trim()

    return {
      numero_item:  Number(d['@_nItem'] ?? 0),
      cprod:        str(prod.cProd),
      xprod:        str(prod.xProd),
      ean:          (eanRaw && eanRaw !== 'SEM GTIN') ? eanRaw : null,
      ncm:          str(prod.NCM ?? prod.NCMx ?? '') || null,
      cfop:         str(prod.CFOP),
      ucom:         str(prod.uCom),
      qcom:         num(prod.qCom),
      vuncom:       num(prod.vUnCom),
      vprod:        num(prod.vProd),
      icms_cst:     icms.cst,
      icms_base:    icms.base,
      icms_aliq:    icms.aliq,
      icms_valor:   icms.valor,
      ipi_valor:    ipiInner ? num(ipiInner.vIPI) : 0,
      pis_aliq:     pis.aliq,
      pis_valor:    pis.valor,
      cofins_aliq:  cofins.aliq,
      cofins_valor: cofins.valor,
    }
  })

  return { header, itens }
}

// ── Routes ───────────────────────────────────────────────────────────────────

export async function estoqueRoutes(app: FastifyInstance) {

  // GET /resumo — KPI cards
  app.get('/resumo', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows: [row] } = await pool.query(`
      SELECT
        COUNT(*)::int                                                         AS total_skus,
        COUNT(*) FILTER (WHERE v.estoque_atual <= 0)::int                    AS sem_estoque,
        COUNT(*) FILTER (WHERE v.estoque_atual > 0
                            AND v.estoque_atual <= v.estoque_minimo)::int    AS alertas,
        COALESCE(SUM(GREATEST(v.estoque_atual, 0) * v.custo_medio), 0)      AS valor_estoque
      FROM versoes v
      JOIN produtos_arkevest p ON p.id = v.produto_id
      WHERE p.ativo = true AND v.ativo = true AND p.controle_estoque = true
    `)
    return reply.send(row)
  })

  // GET / — list SKUs
  app.get('/', { preHandler: auth }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { alerta, sem_estoque } = req.query as { alerta?: string; sem_estoque?: string }

    let where = 'WHERE p.ativo = true AND v.ativo = true AND p.controle_estoque = true'
    if (alerta === 'true')      where += ' AND v.estoque_atual > 0 AND v.estoque_atual <= v.estoque_minimo'
    if (sem_estoque === 'true') where += ' AND v.estoque_atual <= 0'

    const { rows } = await pool.query(`
      SELECT
        v.id AS versao_id, v.atributos_json, v.estoque_atual, v.estoque_minimo, v.custo_medio,
        p.id AS produto_id, p.nome AS produto_nome, p.preco_base, p.unidade_medida,
        (v.estoque_atual <= 0)                                               AS sem_estoque,
        (v.estoque_atual > 0 AND v.estoque_atual <= v.estoque_minimo)        AS alerta
      FROM versoes v
      JOIN produtos_arkevest p ON p.id = v.produto_id
      ${where}
      ORDER BY
        (v.estoque_atual <= 0) DESC,
        (v.estoque_atual > 0 AND v.estoque_atual <= v.estoque_minimo) DESC,
        p.nome, v.atributos_json::text
    `)
    return reply.send(rows)
  })

  // POST /ajuste — manual adjustment with CMPM and transaction
  app.post('/ajuste', { preHandler: dono }, async (req, reply) => {
    const pool   = getTenantPoolFromRequest(req)
    const user   = req.user as JwtPayload
    const data   = ajusteSchema.parse(req.body)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [versao] } = await client.query(
        `SELECT estoque_atual, custo_medio FROM versoes WHERE id = $1 FOR UPDATE`,
        [data.versao_id]
      )
      if (!versao) {
        await client.query('ROLLBACK')
        return reply.status(404).send({ error: 'Variação não encontrada' })
      }

      const estoqueAtual = Number(versao.estoque_atual)
      const custoAtual   = Number(versao.custo_medio)
      const delta        = data.tipo === 'saida' ? -data.quantidade : data.quantidade
      const novoSaldo    = estoqueAtual + delta

      if (novoSaldo < 0) {
        await client.query('ROLLBACK')
        return reply.status(400).send({ error: 'Estoque insuficiente para esta saída.' })
      }

      // Custo Médio Ponderado Móvel — só em entradas com custo informado
      let novoCusto = custoAtual
      if (data.tipo === 'entrada' && data.custo_unitario && data.custo_unitario > 0) {
        novoCusto = estoqueAtual <= 0
          ? data.custo_unitario
          : (estoqueAtual * custoAtual + data.quantidade * data.custo_unitario)
            / (estoqueAtual + data.quantidade)
      }

      await client.query(
        `UPDATE versoes SET estoque_atual = $1, custo_medio = $2 WHERE id = $3`,
        [novoSaldo, novoCusto, data.versao_id]
      )

      const origem = data.tipo === 'entrada' ? 'compra_manual' : 'ajuste_manual'

      await client.query(`
        INSERT INTO ajustes_estoque
          (versao_id, tipo, quantidade, motivo, usuario_id, origem, custo_unitario, cfop, fornecedor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        data.versao_id, data.tipo, data.quantidade,
        data.motivo ?? null, user.id, origem,
        data.custo_unitario ?? null, data.cfop ?? null,
        data.fornecedor_id ?? null,
      ])

      await client.query('COMMIT')
      return reply.send({ versao_id: data.versao_id, estoque_atual: novoSaldo, custo_medio: novoCusto })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // GET /ajustes/:versao_id — history with NF-e join
  app.get('/ajustes/:versao_id', { preHandler: dono }, async (req, reply) => {
    const pool       = getTenantPoolFromRequest(req)
    const { versao_id } = req.params as { versao_id: string }
    const { rows }   = await pool.query(`
      SELECT
        a.*,
        n.numero        AS nota_numero,
        n.emitente_nome AS nota_emitente
      FROM ajustes_estoque a
      LEFT JOIN notas_fiscais_entrada n ON n.id = a.nota_fiscal_id
      WHERE a.versao_id = $1
      ORDER BY a.criado_em DESC
      LIMIT 100
    `, [versao_id])
    return reply.send(rows)
  })

  // ── NF-e routes ─────────────────────────────────────────────────────────────

  // POST /nfe/preview — parse XML, match by EAN, return preview
  app.post('/nfe/preview', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { xml } = nfeXmlSchema.parse(req.body)

    let parsed: ReturnType<typeof parseNFe>
    try { parsed = parseNFe(xml) }
    catch (e: any) {
      return reply.status(400).send({ error: `Erro ao processar XML: ${e.message}` })
    }

    const { header, itens } = parsed

    // Block re-import of confirmed notas
    const { rows: [existing] } = await pool.query(
      `SELECT id, status FROM notas_fiscais_entrada WHERE chave_acesso = $1`,
      [header.chave_acesso]
    )
    if (existing?.status === 'confirmada') {
      return reply.status(409).send({ error: 'NF-e já importada e confirmada.', nota_id: existing.id })
    }

    // Match items by EAN → versoes.codigo_barras
    const eans = itens.map((i: any) => i.ean as string | null).filter(Boolean) as string[]
    const matchMap: Record<string, any> = {}
    if (eans.length > 0) {
      const { rows: versoes } = await pool.query(`
        SELECT v.id, v.atributos_json, v.estoque_atual, v.codigo_barras,
               p.nome AS produto_nome, p.id AS produto_id
        FROM versoes v
        JOIN produtos_arkevest p ON p.id = v.produto_id
        WHERE v.codigo_barras = ANY($1) AND v.ativo = true AND p.ativo = true
      `, [eans])
      for (const v of versoes) {
        matchMap[v.codigo_barras] = {
          versao_id:     v.id,
          produto_nome:  v.produto_nome,
          produto_id:    v.produto_id,
          estoque_atual: v.estoque_atual,
          atributos_json: v.atributos_json,
        }
      }
    }

    const itensComMatch = itens.map((i: any) => ({
      ...i,
      matched: i.ean ? Boolean(matchMap[i.ean]) : false,
      versao:  i.ean ? (matchMap[i.ean] ?? null) : null,
    }))

    return reply.send({ header, itens: itensComMatch, nota_id_pendente: existing?.id ?? null })
  })

  // POST /nfe/salvar — upsert nota + items
  app.post('/nfe/salvar', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload

    const bodySchema = z.object({
      xml: z.string().min(1),
      header: z.object({
        chave_acesso:  z.string().length(44),
        numero:        z.string(),
        serie:         z.string(),
        data_emissao:  z.string(),
        data_entrada:  z.string(),
        emitente_cnpj: z.string(),
        emitente_nome: z.string(),
        emitente_ie:   z.string().nullable().optional(),
        emitente_uf:   z.string(),
        vl_produtos:   z.number(),
        vl_frete:      z.number(),
        vl_seguro:     z.number(),
        vl_desconto:   z.number(),
        vl_outros:     z.number(),
        vl_ipi:        z.number(),
        vl_icms:       z.number(),
        vl_pis:        z.number(),
        vl_cofins:     z.number(),
        vl_total:      z.number(),
      }),
      itens: z.array(z.object({
        numero_item:  z.number(),
        cprod:        z.string(),
        xprod:        z.string(),
        ean:          z.string().nullable().optional(),
        ncm:          z.string().nullable().optional(),
        cfop:         z.string(),
        ucom:         z.string(),
        qcom:         z.number(),
        vuncom:       z.number(),
        vprod:        z.number(),
        icms_cst:     z.string(),
        icms_base:    z.number(),
        icms_aliq:    z.number(),
        icms_valor:   z.number(),
        ipi_valor:    z.number(),
        pis_aliq:     z.number(),
        pis_valor:    z.number(),
        cofins_aliq:  z.number(),
        cofins_valor: z.number(),
        matched:      z.boolean().optional(),
        versao:       z.any().optional(),
      })),
    })

    const body   = bodySchema.parse(req.body)
    const h      = body.header
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [nota] } = await client.query(`
        INSERT INTO notas_fiscais_entrada
          (chave_acesso, numero, serie, data_emissao, data_entrada,
           emitente_cnpj, emitente_nome, emitente_ie, emitente_uf,
           vl_produtos, vl_frete, vl_seguro, vl_desconto, vl_outros,
           vl_ipi, vl_icms, vl_pis, vl_cofins, vl_total,
           xml_original, importado_por, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'pendente')
        ON CONFLICT (chave_acesso) DO UPDATE SET
          numero        = EXCLUDED.numero,
          status        = 'pendente',
          xml_original  = EXCLUDED.xml_original,
          importado_por = EXCLUDED.importado_por
        RETURNING id
      `, [
        h.chave_acesso, h.numero, h.serie, h.data_emissao, h.data_entrada,
        h.emitente_cnpj, h.emitente_nome, h.emitente_ie ?? null, h.emitente_uf,
        h.vl_produtos, h.vl_frete, h.vl_seguro, h.vl_desconto, h.vl_outros,
        h.vl_ipi, h.vl_icms, h.vl_pis, h.vl_cofins, h.vl_total,
        body.xml, user.id,
      ])

      const notaId = nota.id
      await client.query(`DELETE FROM notas_fiscais_entrada_itens WHERE nota_id = $1`, [notaId])

      for (const item of body.itens) {
        await client.query(`
          INSERT INTO notas_fiscais_entrada_itens
            (nota_id, numero_item, cprod, xprod, ean, ncm, cfop, ucom,
             qcom, vuncom, vprod,
             icms_cst, icms_base, icms_aliq, icms_valor, ipi_valor,
             pis_aliq, pis_valor, cofins_aliq, cofins_valor,
             versao_id, matched)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
        `, [
          notaId, item.numero_item, item.cprod, item.xprod,
          item.ean ?? null, item.ncm ?? null, item.cfop, item.ucom,
          item.qcom, item.vuncom, item.vprod,
          item.icms_cst, item.icms_base, item.icms_aliq, item.icms_valor, item.ipi_valor,
          item.pis_aliq, item.pis_valor, item.cofins_aliq, item.cofins_valor,
          (item.versao as any)?.versao_id ?? null, item.matched ?? false,
        ])
      }

      await client.query('COMMIT')
      return reply.send({ nota_id: notaId })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // GET /notas/:nota_id/itens — items for confirm step
  app.get('/notas/:nota_id/itens', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { nota_id } = req.params as { nota_id: string }
    const { rows } = await pool.query(`
      SELECT id, nota_id, numero_item, versao_id, matched, xprod, qcom, vuncom, cfop
      FROM notas_fiscais_entrada_itens
      WHERE nota_id = $1
      ORDER BY numero_item
    `, [nota_id])
    return reply.send(rows)
  })

  // POST /nfe/confirmar — apply stock + custo_medio in transaction
  app.post('/nfe/confirmar', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const user = req.user as JwtPayload

    const confirmarSchema = z.object({
      nota_id: z.string().uuid(),
      itens:   z.array(z.object({
        id:        z.string().uuid(),
        versao_id: z.string().uuid().nullable(),
        confirmar: z.boolean(),
      })),
    })

    const body   = confirmarSchema.parse(req.body)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows: [nota] } = await client.query(
        `SELECT id, status FROM notas_fiscais_entrada WHERE id = $1`,
        [body.nota_id]
      )
      if (!nota) {
        await client.query('ROLLBACK')
        return reply.status(404).send({ error: 'Nota não encontrada' })
      }
      if (nota.status === 'confirmada') {
        await client.query('ROLLBACK')
        return reply.status(409).send({ error: 'Nota já confirmada' })
      }

      for (const item of body.itens) {
        await client.query(`
          UPDATE notas_fiscais_entrada_itens
          SET versao_id = $1, matched = $2
          WHERE id = $3 AND nota_id = $4
        `, [item.versao_id, item.versao_id !== null, item.id, body.nota_id])

        if (!item.confirmar || !item.versao_id) continue

        const { rows: [nfeItem] } = await client.query(
          `SELECT qcom, vuncom, cfop FROM notas_fiscais_entrada_itens WHERE id = $1`,
          [item.id]
        )
        if (!nfeItem) continue

        const { rows: [versao] } = await client.query(
          `SELECT estoque_atual, custo_medio FROM versoes WHERE id = $1 FOR UPDATE`,
          [item.versao_id]
        )
        if (!versao) continue

        const qty          = Number(nfeItem.qcom)
        const unitCost     = Number(nfeItem.vuncom)
        const estoqueAtual = Number(versao.estoque_atual)
        const custoAtual   = Number(versao.custo_medio)

        const novoCusto = estoqueAtual <= 0
          ? unitCost
          : (estoqueAtual * custoAtual + qty * unitCost) / (estoqueAtual + qty)

        await client.query(
          `UPDATE versoes SET estoque_atual = $1, custo_medio = $2 WHERE id = $3`,
          [estoqueAtual + qty, novoCusto, item.versao_id]
        )

        await client.query(`
          INSERT INTO ajustes_estoque
            (versao_id, tipo, quantidade, usuario_id, origem, custo_unitario, nota_fiscal_id, cfop)
          VALUES ($1, 'entrada', $2, $3, 'compra_nfe', $4, $5, $6)
        `, [item.versao_id, qty, user.id, unitCost, body.nota_id, nfeItem.cfop ?? null])
      }

      await client.query(
        `UPDATE notas_fiscais_entrada SET status = 'confirmada', confirmado_em = NOW() WHERE id = $1`,
        [body.nota_id]
      )

      await client.query('COMMIT')
      return reply.send({ ok: true })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // GET /notas — list all notas_fiscais_entrada
  app.get('/notas', { preHandler: dono }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { rows } = await pool.query(`
      SELECT
        n.id, n.numero, n.serie, n.data_emissao, n.emitente_nome, n.emitente_cnpj,
        n.vl_total, n.status, n.criado_em,
        COUNT(i.id)::int                            AS total_itens,
        COUNT(i.id) FILTER (WHERE i.matched)::int   AS itens_matched
      FROM notas_fiscais_entrada n
      LEFT JOIN notas_fiscais_entrada_itens i ON i.nota_id = n.id
      GROUP BY n.id
      ORDER BY n.criado_em DESC
      LIMIT 100
    `)
    return reply.send(rows)
  })

}
