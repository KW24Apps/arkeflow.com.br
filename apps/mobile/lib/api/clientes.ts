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

  criar: (data: { nome: string; telefone?: string | null }) =>
    api.post<ClienteSimples>('/clientes', data).then(r => r.data),
}
