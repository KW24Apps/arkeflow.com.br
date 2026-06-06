import { api } from './client'

export interface Lancamento {
  id: string; tipo: 'entrada' | 'saida'; descricao: string
  valor: string; data: string; categoria: string | null; status: string
  venda_id: string | null
}

export interface ResumoFinanceiro {
  total_entradas: string; total_saidas: string
  qtd_entradas: number;   qtd_saidas: number
}

export interface ParcelaCriediario {
  id: string; numero_parcela: number; valor: string
  vencimento: string; pago_em: string | null; status: string
  cliente_nome: string | null; cliente_telefone: string | null
  venda_total: string; venda_data: string
}

export interface FormaPagamento {
  id: string; nome: string; tipo: string
  padrao_sistema: boolean; desconto_percentual: string
  desconto_maximo: string; ativo: boolean
  aceita_desconto?: boolean
}

export const financeiroApi = {
  lancamentos:   (params?: { de?: string; ate?: string; tipo?: string }) =>
    api.get<Lancamento[]>('/financeiro/lancamentos', { params }).then(r => r.data),
  resumo:        (params?: { de?: string; ate?: string }) =>
    api.get<ResumoFinanceiro>('/financeiro/lancamentos/resumo', { params }).then(r => r.data),
  criarLancamento: (data: Partial<Lancamento>) =>
    api.post<Lancamento>('/financeiro/lancamentos', data).then(r => r.data),
  contasReceber: (status?: string) =>
    api.get<ParcelaCriediario[]>('/financeiro/contas-receber', { params: status ? { status } : {} }).then(r => r.data),
  pagarParcela:  (id: string) =>
    api.put(`/financeiro/contas-receber/${id}/pagar`).then(r => r.data),
  formasPagamento: (incluirInativos?: boolean) =>
    api.get<FormaPagamento[]>('/formas-pagamento', incluirInativos ? { params: { incluir_inativos: 'true' } } : {}).then(r => r.data),
  criarFormaPagamento: (data: Partial<FormaPagamento>) =>
    api.post<FormaPagamento>('/formas-pagamento', data).then(r => r.data),
  atualizarFormaPagamento: (id: string, data: Partial<FormaPagamento>) =>
    api.put<FormaPagamento>(`/formas-pagamento/${id}`, data).then(r => r.data),
  removerFormaPagamento: (id: string) =>
    api.delete(`/formas-pagamento/${id}`),
}
