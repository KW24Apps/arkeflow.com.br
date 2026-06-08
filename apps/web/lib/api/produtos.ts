import { api } from './client'

export interface Produto {
  id: string
  nome: string
  categoria: string | null
  marca: string | null
  descricao: string | null
  preco_base: string
  controle_estoque: boolean
  ativo: boolean
  total_versoes: number
  estoque_total: number
  codigo_barras?: string | null
  atributos?: { id: string; nome: string }[]
  versoes?: Versao[]
}

export interface Versao {
  id: string
  produto_id: string
  atributos_json: Record<string, string>
  preco_especifico: string | null
  estoque_atual: number
  estoque_minimo: number
  ativo: boolean
  codigo_barras?: string | null
}

export interface CreateProdutoPayload {
  nome: string
  tipo_id?: string | null
  categoria?: string
  marca?: string
  descricao?: string
  composicao?: string
  preco_base: number
  controle_estoque: boolean
  atributos?: string[]
}

export const produtosApi = {
  list:   (q?: string, todos = true) =>
    api.get<Produto[]>('/produtos', { params: { ...(q ? { q } : {}), todos: todos ? 'true' : undefined } }).then(r => r.data),

  get:    (id: string) =>
    api.get<Produto>(`/produtos/${id}`).then(r => r.data),

  create: (data: CreateProdutoPayload) =>
    api.post<Produto>('/produtos', data).then(r => r.data),

  update: (id: string, data: Partial<Produto> & { tipo_id?: string | null; composicao?: string; composicao_itens?: any[]; preco_base?: number }) =>
    api.put<Produto>(`/produtos/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/produtos/${id}`),

  addAtributo: (id: string, nome: string) =>
    api.post(`/produtos/${id}/atributos`, { nome }).then(r => r.data),

  removeAtributo: (id: string, atributo_id: string) =>
    api.delete(`/produtos/${id}/atributos/${atributo_id}`),

  createVersao: (id: string, data: Partial<Versao>) =>
    api.post<Versao>(`/produtos/${id}/versoes`, data).then(r => r.data),

  updateVersao: (id: string, versao_id: string, data: Partial<Versao>) =>
    api.put<Versao>(`/produtos/${id}/versoes/${versao_id}`, data).then(r => r.data),

  deleteVersao: (id: string, versao_id: string) =>
    api.delete(`/produtos/${id}/versoes/${versao_id}`),
}
