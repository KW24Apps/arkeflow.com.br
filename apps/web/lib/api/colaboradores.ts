import { api } from './client'

export interface Colaborador {
  id: string
  nome: string
  email: string
  nivel: 'dono_loja' | 'vendedor'
  permissoes: string[]
  ativo: boolean
  ultimo_acesso: string | null
  dias_semana:   number[] | null
  hora_inicio:   string | null
  hora_fim:      string | null
}

export interface LogAcesso {
  tipo: 'login' | 'logout'
  ip: string | null
  criado_em: string
  nome?: string
  email?: string
  nivel?: string
}

export const colaboradoresApi = {
  list: () =>
    api.get<Colaborador[]>('/colaboradores').then(r => r.data),
  get: (id: string) =>
    api.get<Colaborador>(`/colaboradores/${id}`).then(r => r.data),
  logs: (id: string) =>
    api.get<LogAcesso[]>(`/colaboradores/${id}/logs`).then(r => r.data),
  logsRecentes: () =>
    api.get<LogAcesso[]>('/colaboradores/logs/recentes').then(r => r.data),
  create: (data: { nome: string; email: string; senha: string; permissoes: string[]; dias_semana?: number[] | null; hora_inicio?: string | null; hora_fim?: string | null }) =>
    api.post<Colaborador>('/colaboradores', data).then(r => r.data),
  update: (id: string, data: Partial<Colaborador> & { senha?: string }) =>
    api.put<Colaborador>(`/colaboradores/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    api.delete(`/colaboradores/${id}`),
  redefinirSenha: (id: string, senha: string) =>
    api.put(`/colaboradores/${id}/senha`, { senha }).then(r => r.data),
}
