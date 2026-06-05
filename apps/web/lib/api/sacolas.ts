import { api } from './client'

export type SacolaStatus = 'aguardando' | 'em_atendimento' | 'finalizada' | 'cancelada'

export interface SacolaItemRemoto {
  versao_id:      string
  produto_id:     string
  nome:           string
  atributos:      Record<string, string>
  preco_unitario: number
  quantidade:     number
  codigo_barras?: string | null
}

export interface SacolaRemota {
  id:               string
  cliente_id:       string | null
  cliente_nome:     string | null
  cliente_telefone: string | null
  criado_por:       string | null  // nome do vendedor que montou a sacola
  criado_em:        string
  status:           SacolaStatus
  observacao:       string | null
  itens:            SacolaItemRemoto[]
}

// ─── API ───────────────────────────────────────────────────────────────────────
// NOTE: backend routes /sacolas do not exist yet — migration 024_sacolas.sql
// and sacolas.routes.ts need to be created. Stub API calls ready for wiring.

export const sacolasApi = {
  list: (status: SacolaStatus = 'aguardando') =>
    api.get<SacolaRemota[]>('/sacolas', { params: { status } }).then(r => r.data),

  get: (id: string) =>
    api.get<SacolaRemota>(`/sacolas/${id}`).then(r => r.data),

  create: (data: { cliente_id?: string | null; observacao?: string; itens: Omit<SacolaItemRemoto, 'nome' | 'atributos'>[] }) =>
    api.post<SacolaRemota>('/sacolas', data).then(r => r.data),

  updateStatus: (id: string, status: SacolaStatus) =>
    api.patch<SacolaRemota>(`/sacolas/${id}/status`, { status }).then(r => r.data),
}
