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
  total_vendas?:      string
  qtd_vendas?:        number
  total_sangrias?:    string
  total_suprimentos?: string
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

export interface VendaTurno {
  id:           string
  total:        string
  status:       string
  criado_em:    string
  cliente_nome: string | null
  total_itens:  number
}

export const caixaApi = {
  status: () =>
    api.get<CaixaStatusResponse>('/caixa/status').then(r => r.data),

  abrir: (data: { saldo_inicial?: number; observacao?: string }) =>
    api.post<TurnoCaixa>('/caixa/abrir', data).then(r => r.data),

  fechar: (data: { saldo_final?: number; observacao?: string }) =>
    api.post<TurnoCaixa>('/caixa/fechar', data).then(r => r.data),

  movimento: (data: { tipo: 'sangria' | 'suprimento'; valor: number; motivo?: string }) =>
    api.post<MovimentoCaixa>('/caixa/movimento', data).then(r => r.data),

  vendas: () =>
    api.get<{ turno: TurnoCaixa | null; vendas: VendaTurno[] }>('/caixa/vendas').then(r => r.data),

  historico: () =>
    api.get<TurnoCaixa[]>('/caixa/historico').then(r => r.data),
}
