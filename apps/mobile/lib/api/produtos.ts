import { api } from './client'

export interface VersaoProduto {
  id: string
  atributos: Record<string, string>
  preco: number
  estoque_atual: number
  ativo: boolean
}

export interface ProdutoSimples {
  id: string
  nome: string
  codigo_barras: string | null
  versoes: VersaoProduto[]
}

export const produtosApi = {
  buscar: (q: string) =>
    api.get<ProdutoSimples[]>('/produtos', { params: { q } }).then(r => r.data),

  getByBarcode: (codigo: string) =>
    api.get<ProdutoSimples>(`/produtos/barcode/${codigo}`).then(r => r.data),
}
