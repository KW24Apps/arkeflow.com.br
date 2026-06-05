import type { Produto } from './api/produtos'

// Flat representation of a scannable product version
export interface VersaoFlat {
  versao_id:      string
  produto_id:     string
  nome:           string
  atributos:      Record<string, string>
  preco_unitario: number
  codigo_barras:  string
  estoque_atual:  number
}

/**
 * Builds a Map<barcode, VersaoFlat> from the full products list.
 * Used by the PDV scanner to do O(1) barcode lookups.
 */
export function buildBarcodeIndex(produtos: Produto[]): Map<string, VersaoFlat> {
  const index = new Map<string, VersaoFlat>()
  for (const produto of produtos) {
    if (!produto.ativo) continue
    for (const versao of produto.versoes ?? []) {
      if (!versao.ativo || !versao.codigo_barras) continue
      index.set(versao.codigo_barras, {
        versao_id:      versao.id,
        produto_id:     produto.id,
        nome:           produto.nome,
        atributos:      versao.atributos_json,
        preco_unitario: parseFloat(versao.preco_especifico ?? produto.preco_base),
        codigo_barras:  versao.codigo_barras,
        estoque_atual:  versao.estoque_atual,
      })
    }
  }
  return index
}
