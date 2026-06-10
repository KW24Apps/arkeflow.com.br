import { api } from './client'

export interface TurnoCaixa {
  id:                 string
  usuario_id:         string
  saldo_inicial:      string
  saldo_final:        string | null
  observacao:         string | null
  status:             'aberto' | 'fechado'
  aberto_em:          string
  fechado_em:         string | null
  // Aggregates returned by /caixa/status
  total_vendas?:       string
  qtd_vendas?:         number
  total_sangrias?:     string
  total_suprimentos?:  string
  dinheiro_em_caixa?:  number
}

export interface MovimentoCaixa {
  id:        string
  turno_id:  string
  tipo:      'sangria' | 'suprimento'
  valor:     string
  motivo:    string | null
  criado_em: string
}

export interface CaixaStatusResponse {
  status: 'aberto' | 'fechado'
  turno:  TurnoCaixa | null
}

export interface PagamentoResumo {
  forma_nome: string
  tipo:       string
  valor:      string
}

export interface VendaTurno {
  id:                string
  total:             string
  status:            string
  criado_em:         string
  cliente_nome:      string | null
  cliente_telefone:  string | null
  total_itens:       number
  pagamentos:        PagamentoResumo[]
  vendedor_id?:      string | null
  vendedor_nome?:    string | null
}

export interface ItemVendaDetalhe {
  id:             string
  versao_id:      string
  produto_nome:   string
  atributos_json: Record<string, string>
  quantidade:     number
  preco_unitario: string
  desconto_item:  string
}

export interface VendaDetalhe extends VendaTurno {
  itens: ItemVendaDetalhe[]
}

export const caixaApi = {
  status: () =>
    api.get<CaixaStatusResponse>('/caixa/status').then(r => r.data),

  abrir: (data: { saldo_inicial?: number; observacao?: string }) =>
    api.post<TurnoCaixa>('/caixa/abrir', data).then(r => r.data),

  fechar: (data: { saldo_final?: number; observacao?: string; justificativa?: string | null; autorizacao_id?: string | null }) =>
    api.post<TurnoCaixa>('/caixa/fechar', data).then(r => r.data),

  movimento: (data: { tipo: 'sangria' | 'suprimento'; valor: number; motivo?: string }) =>
    api.post<MovimentoCaixa>('/caixa/movimento', data).then(r => r.data),

  vendas: () =>
    api.get<{ turno: TurnoCaixa | null; vendas: VendaTurno[] }>('/caixa/vendas').then(r => r.data),

  historico: () =>
    api.get<TurnoCaixa[]>('/caixa/historico').then(r => r.data),

  // Full sale detail with items — lazy loaded per accordion row
  vendaDetalhe: (vendaId: string) =>
    api.get<VendaDetalhe>(`/vendas/${vendaId}`).then(r => r.data),
}
