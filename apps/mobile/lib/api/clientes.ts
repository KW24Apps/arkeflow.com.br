import { api } from './client'

export interface ClienteSimples {
  id: string
  nome: string
  telefone: string | null
  cpf: string | null
}

export const clientesApi = {
  buscar: (q: string) =>
    api.get<ClienteSimples[]>('/clientes', { params: { q } }).then(r => r.data),

  criar: (data: { nome: string; telefone?: string | null; cpf?: string | null; email?: string | null }) =>
    api.post<ClienteSimples>('/clientes', data).then(r => r.data),
}

export async function getCadastroCfg(): Promise<{
  exige_cpf: boolean
  exige_email: boolean
  exige_endereco: boolean
}> {
  const { data } = await api.get('/dados-loja/sistema')
  return {
    exige_cpf:      data.cadastro_exige_cpf      ?? false,
    exige_email:    data.cadastro_exige_email     ?? false,
    exige_endereco: data.cadastro_exige_endereco  ?? false,
  }
}
