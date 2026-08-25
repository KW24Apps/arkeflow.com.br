import type { Pool } from 'pg'
import { AppError } from '../../core/errors/AppError'

export async function findAll(pool: Pool, q?: string) {
  const params: any[] = []
  let where = 'WHERE ativo = true AND arquivado = false'
  if (q) {
    params.push(`%${q}%`)
    where += ` AND (nome ILIKE $1 OR telefone ILIKE $1 OR cpf ILIKE $1)`
  }
  const { rows } = await pool.query(
    `SELECT id, nome, telefone, cpf, email, saldo_cashback, criado_em
     FROM clientes_arkevest ${where} ORDER BY nome LIMIT 100`,
    params
  )
  return rows
}

export async function findById(pool: Pool, id: string) {
  const { rows: [c] } = await pool.query(
    `SELECT c.*, rc.nome AS regra_cashback_nome, rc.percentual AS regra_cashback_percentual,
            COALESCE(cc.credito_liberado, false) AS credito_liberado,
            COALESCE(cc.limite, 0)               AS limite_credito
     FROM clientes_arkevest c
     LEFT JOIN regras_cashback rc ON rc.id = c.regra_cashback_id
     LEFT JOIN clientes_credito cc ON cc.cliente_id = c.id
     WHERE c.id = $1 AND c.ativo = true AND c.arquivado = false`,
    [id]
  )
  return c ?? null
}

export async function create(pool: Pool, data: {
  nome: string; telefone?: string | null; cpf?: string | null; email?: string | null
}) {
  // Vincula automaticamente à regra de cashback padrão se existir
  const { rows: [regra] } = await pool.query(
    `SELECT id FROM regras_cashback WHERE padrao = true AND ativo = true LIMIT 1`
  )
  const { rows: [c] } = await pool.query(
    `INSERT INTO clientes_arkevest (nome, telefone, cpf, email, regra_cashback_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.nome, data.telefone ?? null, data.cpf ?? null,
     data.email ?? null, regra?.id ?? null]
  )
  return c
}

export async function update(pool: Pool, id: string, data: Record<string, any>) {
  const processed: Record<string, any> = { ...data }

  // Credit lives in clientes_credito — pull these OUT before touching clientes_arkevest
  const creditoLiberado = processed.credito_liberado
  const limiteCredito   = processed.limite_credito
  delete processed.credito_liberado
  delete processed.limite_credito

  // medidas_json needs JSONB serialization
  if (processed.medidas_json !== undefined) {
    processed.medidas_json = JSON.stringify(processed.medidas_json)
  }
  // No clientes_arkevest column accepts an array — drop any array values silently
  Object.keys(processed).forEach(k => { if (Array.isArray(processed[k])) delete processed[k] })

  let row: any
  const keys = Object.keys(processed)
  if (keys.length > 0) {
    const values = Object.values(processed)
    const set = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    try {
      const { rows: [r] } = await pool.query(
        `UPDATE clientes_arkevest SET ${set} WHERE id = $1 AND ativo = true AND arquivado = false RETURNING *`,
        [id, ...values]
      )
      row = r
    } catch (e: any) {
      if (e.code === '23505' && e.constraint === 'clientes_cpf_key') {
        throw new AppError('Este CPF já está cadastrado em outro cliente.', 409)
      }
      throw e
    }
  } else {
    const { rows: [r] } = await pool.query(`SELECT * FROM clientes_arkevest WHERE id = $1`, [id])
    row = r
  }

  // Upsert credit account when either credit field was sent
  if (creditoLiberado !== undefined || limiteCredito !== undefined) {
    await upsertCredito(pool, id, creditoLiberado ?? false, Number(limiteCredito ?? 0))
  }

  // Return the client merged with current credit so the UI reflects it
  const saldo = await getCreditoSaldo(pool, id)
  return { ...row, credito_liberado: saldo.credito_liberado, limite_credito: saldo.limite }
}

export async function softDelete(pool: Pool, id: string) {
  await pool.query(`UPDATE clientes_arkevest SET arquivado = true WHERE id = $1`, [id])
}

export async function upsertCredito(pool: Pool, cliente_id: string, liberado: boolean, limite: number) {
  await pool.query(
    `INSERT INTO clientes_credito (cliente_id, credito_liberado, limite, atualizado_em)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (cliente_id) DO UPDATE
       SET credito_liberado = EXCLUDED.credito_liberado,
           limite = EXCLUDED.limite,
           atualizado_em = now()`,
    [cliente_id, liberado, limite]
  )
}

export async function getCreditoSaldo(pool: Pool, cliente_id: string) {
  const { rows: [cc] } = await pool.query(
    `SELECT COALESCE(credito_liberado, false) AS credito_liberado, COALESCE(limite, 0) AS limite
     FROM clientes_credito WHERE cliente_id = $1`, [cliente_id])
  const { rows: [oc] } = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS ocupado FROM parcelas_crediario
     WHERE cliente_id = $1 AND status IN ('pendente','vencido')`, [cliente_id])
  const limite  = Number(cc?.limite ?? 0)
  const ocupado = Number(oc?.ocupado ?? 0)
  return {
    credito_liberado: cc?.credito_liberado ?? false,
    limite,
    ocupado,
    disponivel: Math.max(0, Math.round((limite - ocupado) * 100) / 100),
  }
}

export async function findHistorico(pool: Pool, cliente_id: string) {
  const { rows } = await pool.query(
    `SELECT v.id, v.total, v.cashback_gerado, v.cashback_usado, v.criado_em,
       COUNT(iv.id)::int AS total_itens
     FROM vendas v
     LEFT JOIN itens_venda iv ON iv.venda_id = v.id
     WHERE v.cliente_id = $1 AND v.status != 'cancelada'
     GROUP BY v.id ORDER BY v.criado_em DESC LIMIT 50`,
    [cliente_id]
  )
  return rows
}
