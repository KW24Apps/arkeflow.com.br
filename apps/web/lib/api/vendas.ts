import { api } from './client'

export interface ItemVenda {
  versao_id:     string
  quantidade:    number
  preco_unitario:number
  desconto_item: number
}

export interface PagamentoVenda {
  forma_pagamento_id: string
  valor:          number
  parcelas:       number
  detalhe?:       string | null
  valor_recebido?: number
  troco?:          number
}

export interface NovaVendaPayload {
  cliente_id?:          string | null
  sacola_id?:           string | null  // remote bag origin, for tracking
  itens:                ItemVenda[]
  pagamentos:           PagamentoVenda[]
  cashback_usado:       number
  desconto_promocao:    number
  desconto_pagamento?:  number         // discount from payment method rules
  vendedor_id?:         string | null
  vendedor_nome?:       string | null
}

export interface VendaHistoricoItem {
  id: string; total: string; subtotal: string
  desconto_promocao: string; cashback_usado: string; cashback_gerado: string
  status: string; criado_em: string
  cliente_nome: string | null; cliente_telefone: string | null; total_itens: number
}

export const vendasApi = {
  registrar: (data: NovaVendaPayload) =>
    api.post<{ venda_id: string; total: number; cashback_gerado: number }>('/vendas', data).then(r => r.data),
  historico: (params?: { de?: string; ate?: string }) =>
    api.get<VendaHistoricoItem[]>('/vendas', { params }).then(r => r.data),
  get: (id: string) =>
    api.get<any>(`/vendas/${id}`).then(r => r.data),
}
