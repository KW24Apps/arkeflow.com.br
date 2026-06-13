import { api } from './client'

export interface Cliente {
  id: string
  nome: string
  telefone: string | null
  cpf: string | null
  email: string | null
  saldo_cashback: string
  regra_cashback_id: string | null
  regra_cashback_nome?: string
  regra_cashback_percentual?: string
  criado_em: string
  ativo: boolean
  // Address
  cep?:         string | null
  logradouro?:  string | null
  numero?:      string | null
  complemento?: string | null
  bairro?:      string | null
  cidade?:      string | null
  estado?:      string | null
}

export interface VendaHistorico {
  id: string
  total: string
  cashback_gerado: string
  cashback_usado: string
  total_itens: number
  criado_em: string
}

export const clientesApi = {
  list: (q?: string) =>
    api.get<Cliente[]>('/clientes', { params: q ? { q } : {} }).then(r => r.data),

  get: (id: string) =>
    api.get<Cliente>(`/clientes/${id}`).then(r => r.data),

  historico: (id: string) =>
    api.get<VendaHistorico[]>(`/clientes/${id}/historico`).then(r => r.data),

  getCredito: (id: string) =>
    api.get<{ credito_liberado: boolean; limite: number; ocupado: number; disponivel: number }>(`/clientes/${id}/credito`).then(r => r.data),

  create: (data: Partial<Cliente>) =>
    api.post<Cliente>('/clientes', data).then(r => r.data),

  update: (id: string, data: Partial<Cliente>) =>
    api.put<Cliente>(`/clientes/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/clientes/${id}`),
}

export async function getCadastroCfg(): Promise<{
  exige_cpf: boolean
  exige_email: boolean
  exige_endereco: boolean
  crediario_exige_email: boolean
  crediario_exige_endereco: boolean
}> {
  const { data } = await api.get('/dados-loja/sistema')
  return {
    exige_cpf:                data.cadastro_exige_cpf       ?? false,
    exige_email:              data.cadastro_exige_email      ?? false,
    exige_endereco:           data.cadastro_exige_endereco   ?? false,
    crediario_exige_email:    data.crediario_exige_email     ?? true,
    crediario_exige_endereco: data.crediario_exige_endereco  ?? true,
  }
}
