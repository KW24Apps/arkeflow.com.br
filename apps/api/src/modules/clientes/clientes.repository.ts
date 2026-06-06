import type { Pool } from 'pg'

export async function findAll(pool: Pool, q?: string) {
  const params: any[] = []
  let where = 'WHERE ativo = true AND arquivado = false'
  if (q) {
    params.push(`%${q}%`)
    where += ` AND (nome ILIKE $1 OR telefone ILIKE $1 OR cpf ILIKE $1)`
  }
  const { rows } = await pool.query(
    `SELECT id, nome, telefone, cpf, email, saldo_cashback, criado_em
     FROM clientes ${where} ORDER BY nome LIMIT 100`,
    params
  )
  return rows
}

export async function findById(pool: Pool, id: string) {
  const { rows: [c] } = await pool.query(
    `SELECT c.*, rc.nome AS regra_cashback_nome, rc.percentual AS regra_cashback_percentual
     FROM clientes c
     LEFT JOIN regras_cashback rc ON rc.id = c.regra_cashback_id
     WHERE c.id = $1 AND c.ativo = true AND c.arquivado = false`,
    [id]
  )
  return c ?? null
}

export async function create(pool: Pool, data: {
  nome: string; telefone?: string; cpf?: string; email?: string
}) {
  // Vincula automaticamente à regra de cashback padrão se existir
  const { rows: [regra] } = await pool.query(
    `SELECT id FROM regras_cashback WHERE padrao = true AND ativo = true LIMIT 1`
  )
  const { rows: [c] } = await pool.query(
    `INSERT INTO clientes (nome, telefone, cpf, email, regra_cashback_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.nome, data.telefone ?? null, data.cpf ?? null,
     data.email ?? null, regra?.id ?? null]
  )
  return c
}

export async function update(pool: Pool, id: string, data: Record<string, any>) {
  // medidas_json precisa de serialização JSONB
  const processed = { ...data }
  if (processed.medidas_json !== undefined) {
    processed.medidas_json = JSON.stringify(processed.medidas_json)
  }
  const keys   = Object.keys(processed)
  const values = Object.values(processed)
  const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows: [c] } = await pool.query(
    `UPDATE clientes SET ${set} WHERE id = $1 AND ativo = true AND arquivado = false RETURNING *`,
    [id, ...values]
  )
  return c
}

export async function softDelete(pool: Pool, id: string) {
  await pool.query(`UPDATE clientes SET arquivado = true WHERE id = $1`, [id])
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
