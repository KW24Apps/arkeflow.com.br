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

export type BarcodeHit =
  | { match: 'versao'; versao: VersaoFlat }
  | { match: 'produto'; produto_id: string; nome: string }

/**
 * Builds a Map<barcode, BarcodeHit> from the full products list.
 * Variation barcodes take precedence over product-level barcodes.
 * Used by the PDV scanner for O(1) barcode lookups.
 */
export function buildBarcodeIndex(produtos: Produto[]): Map<string, BarcodeHit> {
  const index = new Map<string, BarcodeHit>()

  // Product-level barcodes first (lower priority — will be overwritten by variation barcodes)
  for (const produto of produtos) {
    if (!produto.ativo || !(produto as any).codigo_barras) continue
    index.set((produto as any).codigo_barras, {
      match:      'produto',
      produto_id: produto.id,
      nome:       produto.nome,
    })
  }

  // Variation barcodes overwrite product-level barcodes
  for (const produto of produtos) {
    if (!produto.ativo) continue
    for (const versao of produto.versoes ?? []) {
      if (!versao.ativo || !versao.codigo_barras) continue
      index.set(versao.codigo_barras, {
        match: 'versao',
        versao: {
          versao_id:      versao.id,
          produto_id:     produto.id,
          nome:           produto.nome,
          atributos:      versao.atributos_json,
          preco_unitario: parseFloat(versao.preco_especifico ?? produto.preco_base),
          codigo_barras:  versao.codigo_barras,
          estoque_atual:  versao.estoque_atual,
        },
      })
    }
  }

  return index
}
