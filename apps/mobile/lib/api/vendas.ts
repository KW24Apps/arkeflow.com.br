import { api } from './client'

export interface VendaMobile {
  id: string
  total: number
  subtotal: number
  status: string
  criado_em: string
  vendedor_id: string | null
  vendedor_nome: string | null
  cliente_nome: string | null
  cliente_telefone: string | null
  total_itens: number
}

export interface VendaItemMobile {
  versao_id:      string
  produto_nome:   string
  atributos_json: Record<string, string> | null
  quantidade:     number
  preco_unitario: number
  desconto_item:  number
  promocao_nome:  string | null
}

export interface VendaPagamentoMobile {
  id:             string
  forma_nome:     string
  tipo:           string
  valor:          number
  valor_recebido: number | null
  troco:          number | null
  parcelas:       number
  detalhe:        string | null
}

export interface VendaDetalhe extends VendaMobile {
  itens:              VendaItemMobile[]
  pagamentos:         VendaPagamentoMobile[]
  desconto_promocao:  number
  desconto_pagamento: number
  cashback_usado:     number
  cashback_gerado:    number
}

export const vendasApi = {
  minhasHoje: (vendedor_id: string) => {
    const hoje = new Date().toISOString().split('T')[0]
    return api.get<VendaMobile[]>('/vendas', {
      params: { de: hoje, ate: hoje, vendedor_id, limit: 100 }
    }).then(r => r.data)
  },

  getDetalhe: (id: string) =>
    api.get<VendaDetalhe>(`/vendas/${id}`).then(r => r.data),
}
