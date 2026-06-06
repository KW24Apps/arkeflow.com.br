import { api } from './client'

export interface Fornecedor {
  id:            string
  razao_social:  string
  nome_fantasia: string | null
  cnpj:          string | null
  email:         string | null
  telefones:     string[]
  cep:           string | null
  logradouro:    string | null
  numero:        string | null
  complemento:   string | null
  bairro:        string | null
  cidade:        string | null
  estado:        string | null
  ativo:         boolean
  arquivado:     boolean
  criado_em:     string
}

export const fornecedoresApi = {
  list:   (q?: string) =>
    api.get<Fornecedor[]>('/fornecedores', { params: q ? { q } : {} }).then(r => r.data),

  get:    (id: string) =>
    api.get<Fornecedor>(`/fornecedores/${id}`).then(r => r.data),

  create: (data: Partial<Fornecedor>) =>
    api.post<Fornecedor>('/fornecedores', data).then(r => r.data),

  update: (id: string, data: Partial<Fornecedor>) =>
    api.put<Fornecedor>(`/fornecedores/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/fornecedores/${id}`),
}
