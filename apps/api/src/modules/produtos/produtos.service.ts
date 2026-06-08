import type { Pool } from 'pg'
import * as repo from './produtos.repository'
import { AppError } from '../../core/errors/AppError'
import { verificarVinculoProduto, verificarVinculoVersao } from '../../core/guards/vinculo'
import type { CreateProdutoInput, UpdateProdutoInput, CreateVersaoInput } from './produtos.schema'

async function checkBarcodeUniqueness(
  pool: Pool,
  codigo: string,
  excludeProdutoId?: string | null,
  excludeVersaoId?: string | null,
) {
  const pParams: any[] = [codigo]
  let pWhere = 'codigo_barras = $1 AND arquivado = false'
  if (excludeProdutoId) pWhere += ` AND id != $${pParams.push(excludeProdutoId)}`
  const { rows: [pHit] } = await pool.query(`SELECT id FROM produtos WHERE ${pWhere}`, pParams)
  if (pHit) throw new AppError('Código de barras já usado em outro produto.', 400)

  const vParams: any[] = [codigo]
  let vWhere = 'codigo_barras = $1 AND arquivado = false'
  if (excludeVersaoId) vWhere += ` AND id != $${vParams.push(excludeVersaoId)}`
  const { rows: [vHit] } = await pool.query(`SELECT id FROM versoes WHERE ${vWhere}`, vParams)
  if (vHit) throw new AppError('Código de barras já usado em outra variação.', 400)
}

export async function listProdutos(pool: Pool, q?: string, incluirInativos = false) {
  return repo.findAll(pool, q, incluirInativos)
}

export async function getProduto(pool: Pool, id: string) {
  const produto = await repo.findById(pool, id)
  if (!produto) throw new AppError('Produto não encontrado', 404)
  return produto
}

export async function createProduto(pool: Pool, data: CreateProdutoInput) {
  const { atributos, ...produtoData } = data
  if (produtoData.codigo_barras) {
    await checkBarcodeUniqueness(pool, produtoData.codigo_barras)
  }
  const produto = await repo.create(pool, produtoData)

  if (atributos?.length) {
    for (const nome of atributos) {
      await repo.addAtributo(pool, produto.id, nome)
    }
  }

  return repo.findById(pool, produto.id)
}

export async function updateProduto(pool: Pool, id: string, data: UpdateProdutoInput) {
  await getProduto(pool, id)
  const { atributos, ...produtoData } = data
  if (produtoData.codigo_barras) {
    await checkBarcodeUniqueness(pool, produtoData.codigo_barras, id)
  }
  if (Object.keys(produtoData).length) {
    await repo.update(pool, id, produtoData)
  }
  return repo.findById(pool, id)
}

export async function deleteProduto(pool: Pool, id: string) {
  await getProduto(pool, id)
  await verificarVinculoProduto(pool, id)
  await repo.softDelete(pool, id)
}

// Atributos
export async function addAtributo(pool: Pool, produto_id: string, nome: string) {
  await getProduto(pool, produto_id)
  return repo.addAtributo(pool, produto_id, nome)
}

export async function removeAtributo(pool: Pool, id: string) {
  return repo.removeAtributo(pool, id)
}

// Versões
export async function createVersao(pool: Pool, produto_id: string, data: CreateVersaoInput) {
  await getProduto(pool, produto_id)
  if (data.codigo_barras) {
    await checkBarcodeUniqueness(pool, data.codigo_barras)
  }
  return repo.createVersao(pool, produto_id, data)
}

export async function updateVersao(pool: Pool, id: string, data: Partial<CreateVersaoInput>) {
  if (data.codigo_barras) {
    await checkBarcodeUniqueness(pool, data.codigo_barras, null, id)
  }
  return repo.updateVersao(pool, id, data)
}

export async function deleteVersao(pool: Pool, id: string) {
  await verificarVinculoVersao(pool, id)
  return repo.deleteVersao(pool, id)
}
