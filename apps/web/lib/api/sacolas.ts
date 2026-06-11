import { api } from './client'

export type SacolaStatus = 'aguardando' | 'em_atendimento' | 'finalizada' | 'cancelada'

export interface SacolaItemRemoto {
  id?:            string
  versao_id:      string
  produto_id:     string
  nome:           string
  atributos:      Record<string, string>
  preco_unitario: number
  quantidade:     number
  codigo_barras?: string | null
}

export interface SacolaRemota {
  id:            string
  cliente_id:    string | null
  cliente_nome:  string | null
  criado_por:    string | null
  nome_vendedor: string | null
  criado_em:     string
  atualizado_em: string
  status:        SacolaStatus
  observacao:    string | null
  itens:         SacolaItemRemoto[]
}

export const sacolasApi = {
  list: (status: SacolaStatus = 'aguardando') =>
    api.get<SacolaRemota[]>('/sacolas', { params: { status } }).then(r => r.data),

  get: (id: string) =>
    api.get<SacolaRemota>(`/sacolas/${id}`).then(r => r.data),

  create: (data: {
    cliente_id?:   string | null
    cliente_nome?: string | null
    observacao?:   string
    itens:         SacolaItemRemoto[]
  }) => api.post<SacolaRemota>('/sacolas', data).then(r => r.data),

  updateStatus: (id: string, status: SacolaStatus) =>
    api.patch<SacolaRemota>(`/sacolas/${id}/status`, { status }).then(r => r.data),

  cancelar: (id: string) =>
    api.put<SacolaRemota>(`/sacolas/${id}/cancelar`).then(r => r.data),

  updateItens: (
    id: string,
    itens: SacolaItemRemoto[],
    cliente_id?: string | null,
    cliente_nome?: string | null,
  ) => api.put<SacolaRemota>(`/sacolas/${id}/itens`, { itens, cliente_id, cliente_nome }).then(r => r.data),

  puxar: (id: string) =>
    api.put<SacolaRemota>(`/sacolas/${id}/puxar`).then(r => r.data),
}
