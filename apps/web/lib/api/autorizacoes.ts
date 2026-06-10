import { api } from '@/lib/api/client'

export type Supervisor = { id: string; nome: string }
export type SupervisoresResp = { supervisores: Supervisor[]; senha_mestra_disponivel: boolean }
export type ValidarPayload = {
  acao: string
  metodo: 'senha_mestra' | 'supervisor'
  supervisor_id?: string | null
  senha: string
  justificativa?: string | null
  turno_id?: string | null
  detalhe?: Record<string, any>
}
export type ValidarResp = {
  ok: true
  autorizacao_id: string
  autorizado_por: string | null
  autorizado_nome: string | null
  criado_em: string
}

export const autorizacoesApi = {
  supervisores: () => api.get<SupervisoresResp>('/autorizacoes/supervisores').then(r => r.data),
  validar:      (p: ValidarPayload) => api.post<ValidarResp>('/autorizacoes/validar', p).then(r => r.data),
}
