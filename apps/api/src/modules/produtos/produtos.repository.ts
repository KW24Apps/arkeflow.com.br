import type { Pool } from 'pg'

export async function findAll(pool: Pool, q?: string, incluirInativos = false) {
  const params: any[] = []
  let where = incluirInativos ? 'WHERE p.arquivado = false' : 'WHERE p.ativo = true AND p.arquivado = false'
  if (q) {
    params.push(`%${q}%`)
    where += ` AND (p.nome ILIKE $${params.length} OR p.codigo ILIKE $${params.length})`
  }

  const { rows } = await pool.query(
    `SELECT p.*,
       tp.nome AS tipo_nome,
       COUNT(v.id) FILTER (WHERE v.ativo)::int          AS total_versoes,
       COALESCE(SUM(v.estoque_atual) FILTER (WHERE v.ativo), 0)::int AS estoque_total,
       COALESCE(
         json_agg(
           json_build_object(
             'id',           v.id,
             'atributos',    v.atributos_json,
             'preco',        COALESCE(v.preco_especifico, p.preco_base),
             'estoque_atual', v.estoque_atual,
             'ativo',        v.ativo
           ) ORDER BY v.atributos_json::text
         ) FILTER (WHERE v.id IS NOT NULL AND v.ativo = true AND v.arquivado = false),
         '[]'::json
       ) AS versoes
     FROM produtos_arkevest p
     LEFT JOIN tipos_produto tp ON tp.id = p.tipo_id
     LEFT JOIN versoes v ON v.produto_id = p.id
     ${where}
     GROUP BY p.id, tp.nome
     ORDER BY p.nome`,
    params
  )
  return rows
}

export async function findById(pool: Pool, id: string) {
  const { rows: [produto] } = await pool.query(
    `SELECT p.*, tp.nome AS tipo_nome FROM produtos_arkevest p LEFT JOIN tipos_produto tp ON tp.id = p.tipo_id WHERE p.id = $1 AND p.ativo = true AND p.arquivado = false`, [id]
  )
  if (!produto) return null

  const { rows: atributos } = await pool.query(
    `SELECT * FROM atributos_produto WHERE produto_id = $1 ORDER BY nome`, [id]
  )
  const { rows: versoes } = await pool.query(
    `SELECT * FROM versoes WHERE produto_id = $1 AND ativo = true AND arquivado = false ORDER BY atributos_json::text`, [id]
  )
  return { ...produto, atributos, versoes }
}

export async function create(pool: Pool, data: {
  nome: string; codigo?: string | null; tipo_id?: string | null; categoria?: string; marca?: string
  descricao?: string; composicao?: string; composicao_itens?: any[]; preco_base: number; controle_estoque: boolean; aceita_desconto: boolean
  codigo_barras?: string | null
}) {
  const { rows: [p] } = await pool.query(
    `INSERT INTO produtos_arkevest (nome, codigo, tipo_id, categoria, marca, descricao, composicao, composicao_itens, preco_base, controle_estoque, aceita_desconto, codigo_barras)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [data.nome, data.codigo ?? null, data.tipo_id ?? null, data.categoria ?? null, data.marca ?? null,
     data.descricao ?? null, data.composicao ?? null,
     JSON.stringify(data.composicao_itens ?? []),
     data.preco_base, data.controle_estoque, data.aceita_desconto,
     data.codigo_barras ?? null]
  )
  return p
}

export async function update(pool: Pool, id: string, data: Record<string, any>) {
  const processed = { ...data }
  if (processed.composicao_itens !== undefined) {
    processed.composicao_itens = JSON.stringify(processed.composicao_itens ?? [])
  }
  const keys   = Object.keys(processed)
  const values = Object.values(processed)
  const set    = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows: [p] } = await pool.query(
    `UPDATE produtos_arkevest SET ${set} WHERE id = $1 AND ativo = true AND arquivado = false RETURNING *`, [id, ...values]
  )
  return p
}

export async function softDelete(pool: Pool, id: string) {
  await pool.query(`UPDATE produtos_arkevest SET arquivado = true WHERE id = $1`, [id])
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
  estoque_atual: number; estoque_minimo: number; codigo_barras?: string | null
}) {
  const { rows: [v] } = await pool.query(
    `INSERT INTO versoes (produto_id, atributos_json, preco_especifico, estoque_atual, estoque_minimo, codigo_barras)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [produto_id, JSON.stringify(data.atributos_json),
     data.preco_especifico ?? null, data.estoque_atual, data.estoque_minimo,
     data.codigo_barras ?? null]
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
  await pool.query(`UPDATE versoes SET arquivado = true WHERE id = $1`, [id])
}
