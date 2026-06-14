import { api } from './client'

export interface ColaboradorPerfil {
  // Pessoal
  cpf?:             string | null
  rg?:              string | null
  data_nascimento?: string | null
  telefone?:        string | null
  cargo?:           string | null
  // Endereço
  cep?:             string | null
  logradouro?:      string | null
  numero?:          string | null
  complemento?:     string | null
  bairro?:          string | null
  cidade?:          string | null
  estado?:          string | null
  // Bancário
  banco?:           string | null
  agencia?:         string | null
  conta?:           string | null
  conta_digito?:    string | null
  tipo_conta?:      'corrente' | 'poupanca' | null
  pix?:             string | null
  // Emprego
  data_admissao?:   string | null
  salario?:         number | null
  tipo_contrato?:   'clt' | 'pj' | 'mei' | 'autonomo' | 'estagio' | 'outro' | null
}

export interface Colaborador extends ColaboradorPerfil {
  id: string
  nome: string
  email: string
  nivel: 'dono_loja' | 'vendedor'
  permissoes: string[]
  ativo: boolean
  is_supervisor: boolean
  ultimo_acesso: string | null
  dias_semana:   number[] | null
  hora_inicio:   string | null
  hora_fim:      string | null
}

export interface LogAcesso {
  tipo: 'login' | 'logout'
  ip: string | null
  criado_em: string
  plataforma?: string | null
  motivo?: string | null
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
  onlineAgora: () =>
    api.get<(LogAcesso & { id: string; nome: string; nivel: string; ultimo_acesso: string; segundos_atras: number })[]>('/colaboradores/online').then(r => r.data),
  create: (data: any) =>
    api.post<Colaborador>('/colaboradores', data).then(r => r.data),
  updateAcesso: (id: string, data: any) =>
    api.put(`/colaboradores/${id}`, data).then(r => r.data),
  updatePerfil: (id: string, data: ColaboradorPerfil) =>
    api.put(`/colaboradores/${id}/perfil`, data).then(r => r.data),
  remove: (id: string) =>
    api.delete(`/colaboradores/${id}`),
  excluir: (id: string) =>
    api.delete(`/colaboradores/${id}/permanente`),
  redefinirSenha: (id: string, senha: string) =>
    api.put(`/colaboradores/${id}/senha`, { senha }).then(r => r.data),
  setSupervisor: (id: string, is_supervisor: boolean) =>
    api.put(`/colaboradores/${id}/supervisor`, { is_supervisor }).then(r => r.data),
}
