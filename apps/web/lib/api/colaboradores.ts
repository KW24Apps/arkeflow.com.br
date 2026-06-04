import { api } from './client'

export interface Colaborador {
  id: string
  nome: string
  email: string
  nivel: string
  permissoes: string[]
  ativo: boolean
  ultimo_acesso: string | null
}

export const colaboradoresApi = {
  list: () =>
    api.get<Colaborador[]>('/colaboradores').then(r => r.data),
  get: (id: string) =>
    api.get<Colaborador>(`/colaboradores/${id}`).then(r => r.data),
  create: (data: { nome: string; email: string; senha: string; permissoes: string[] }) =>
    api.post<Colaborador>('/colaboradores', data).then(r => r.data),
  update: (id: string, data: { nome?: string; permissoes?: string[]; ativo?: boolean }) =>
    api.put<Colaborador>(`/colaboradores/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    api.delete(`/colaboradores/${id}`),
  redefinirSenha: (id: string, senha: string) =>
    api.put(`/colaboradores/${id}/senha`, { senha }).then(r => r.data),
}
