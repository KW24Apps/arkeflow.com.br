import type { Pool } from 'pg'

export async function findAll(pool: Pool, q?: string) {
  const params: any[] = []
  let where = 'WHERE p.ativo = true'
  if (q) { params.push(`%${q}%`); where += ` AND p.nome ILIKE $${params.length}` }

  const { rows } = await pool.query(
    `SELECT p.*,
       COUNT(v.id) FILTER (WHERE v.ativo)::int          AS total_versoes,
       COALESCE(SUM(v.estoque_atual) FILTER (WHERE v.ativo), 0)::int AS estoque_total
     FROM produtos p
     LEFT JOIN versoes v ON v.produto_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY p.nome`,
    params
  )
  return rows
}

export async function findById(pool: Pool, id: string) {
  const { rows: [produto] } = await pool.query(
    `SELECT * FROM produtos WHERE id = $1 AND ativo = true`, [id]
  )
  if (!produto) return null

  const { rows: atributos } = await pool.query(
    `SELECT * FROM atributos_produto WHERE produto_id = $1 ORDER BY nome`, [id]
  )
  const { rows: versoes } = await pool.query(
    `SELECT * FROM versoes WHERE produto_id = $1 AND ativo = true ORDER BY atributos_json::text`, [id]
  )
  return { ...produto, atributos, versoes }
}

export async function create(pool: Pool, data: {
  nome: string; tipo_id?: string | null; categoria?: string; marca?: string
  descricao?: string; composicao?: string; preco_base: number; controle_estoque: boolean
}) {
  const { rows: [p] } = await pool.query(
    `INSERT INTO produtos (nome, tipo_id, categoria, marca, descricao, composicao, preco_base, controle_estoque)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.nome, data.tipo_id ?? null, data.categoria ?? null, data.marca ?? null,
     data.descricao ?? null, data.composicao ?? null, data.preco_base, data.controle_estoque]
  )
  return p
}

export async function update(pool: Pool, id: string, data: Record<string, any>) {
  const keys   = Object.keys(data)
  const values = Object.values(data)
  const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows: [p] } = await pool.query(
    `UPDATE produtos SET ${set} WHERE id = $1 AND ativo = true RETURNING *`, [id, ...values]
  )
  return p
}

export async function softDelete(pool: Pool, id: string) {
  await pool.query(`UPDATE produtos SET ativo = false WHERE id = $1`, [id])
}

// Atributos
export async function addAtributo(pool: Pool, produto_id: string, nome: string) {
  const { rows: [r] } = await pool.query(
    `INSERT INTO atributos_produto (produto_id, nome) VALUES ($1,$2)
     ON CONFLICT DO NOTHING RETURNING *`, [produto_id, nome]
  )
  return r
}

export async function removeAtributo(pool: Pool, id: string) {
  await pool.query(`DELETE FROM atributos_produto WHERE id = $1`, [id])
}

// Versões
export async function createVersao(pool: Pool, produto_id: string, data: {
  atributos_json: Record<string, string>; preco_especifico?: number | null
  estoque_atual: number; estoque_minimo: number
}) {
  const { rows: [v] } = await pool.query(
    `INSERT INTO versoes (produto_id, atributos_json, preco_especifico, estoque_atual, estoque_minimo)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [produto_id, JSON.stringify(data.atributos_json),
     data.preco_especifico ?? null, data.estoque_atual, data.estoque_minimo]
  )
  return v
}

export async function updateVersao(pool: Pool, id: string, data: Record<string, any>) {
  const mapped = Object.fromEntries(
    Object.entries(data).map(([k, v]) =>
      [k, k === 'atributos_json' ? JSON.stringify(v) : v]
    )
  )
  const keys   = Object.keys(mapped)
  const values = Object.values(mapped)
  const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows: [v] } = await pool.query(
    `UPDATE versoes SET ${set} WHERE id = $1 RETURNING *`, [id, ...values]
  )
  return v
}

export async function deleteVersao(pool: Pool, id: string) {
  await pool.query(`UPDATE versoes SET ativo = false WHERE id = $1`, [id])
}
