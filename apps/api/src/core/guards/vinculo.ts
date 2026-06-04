import type { Pool } from 'pg'
import { AppError } from '../errors/AppError'

// Verifica se uma versão tem vendas vinculadas
export async function verificarVinculoVersao(pool: Pool, versao_id: string) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM itens_venda WHERE versao_id = $1`, [versao_id]
  )
  if (rows[0].total > 0) {
    throw new AppError(
      'Esta variação possui vendas registradas e não pode ser removida. Você pode desativá-la.',
      409, 'TEM_VINCULOS'
    )
  }
}

// Verifica se um produto tem alguma versão com vendas
export async function verificarVinculoProduto(pool: Pool, produto_id: string) {
  const { rows } = await pool.query(
    `SELECT COUNT(iv.id)::int AS total
     FROM itens_venda iv
     JOIN versoes v ON v.id = iv.versao_id
     WHERE v.produto_id = $1`,
    [produto_id]
  )
  if (rows[0].total > 0) {
    throw new AppError(
      'Este produto possui vendas registradas e não pode ser removido. Você pode desativá-lo.',
      409, 'TEM_VINCULOS'
    )
  }
}

// Verifica se um item de catálogo (cor, tamanho, etc.) está em uso em versões com vendas
export async function verificarVinculoCatalogo(pool: Pool, tipo: string, nome: string) {
  const { rows } = await pool.query(
    `SELECT COUNT(iv.id)::int AS total
     FROM itens_venda iv
     JOIN versoes v ON v.id = iv.versao_id
     WHERE v.atributos_json @> $1::jsonb`,
    [JSON.stringify({ [tipo]: nome })]
  )
  if (rows[0].total > 0) {
    throw new AppError(
      `Este item está vinculado a vendas e não pode ser removido.`,
      409, 'TEM_VINCULOS'
    )
  }
}
