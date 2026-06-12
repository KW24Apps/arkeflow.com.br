import { api } from './client'

export type SacolaStatus = 'aguardando' | 'em_atendimento' | 'finalizada' | 'cancelada'

export interface SacolaItem {
  id?: string
  versao_id: string
  produto_id: string
  nome: string
  atributos: Record<string, string>
  preco_unitario: number
  quantidade: number
  codigo_barras?: string | null
}

export interface Sacola {
  id: string
  cliente_id: string | null
  cliente_nome: string | null
  criado_por: string | null
  nome_vendedor: string | null
  criado_em: string
  atualizado_em: string
  status: SacolaStatus
  observacao: string | null
  itens: SacolaItem[]
}

export const sacolasApi = {
  list: (status: SacolaStatus = 'aguardando') =>
    api.get<Sacola[]>('/sacolas', { params: { status } }).then(r => r.data),

  listPendentes: () =>
    api.get<Sacola[]>('/sacolas', { params: { status: 'all' } }).then(r => r.data),

  get: (id: string) =>
    api.get<Sacola>(`/sacolas/${id}`).then(r => r.data),

  create: (data: {
    cliente_id?: string | null
    cliente_nome?: string | null
    vendedor_id?: string | null
    vendedor_nome?: string | null
    observacao?: string
    itens: SacolaItem[]
  }) => api.post<Sacola>('/sacolas', data).then(r => r.data),

  puxar: (id: string) =>
    api.put<Sacola>(`/sacolas/${id}/puxar`).then(r => r.data),

  cancelar: (id: string) =>
    api.put<Sacola>(`/sacolas/${id}/cancelar`).then(r => r.data),
}
