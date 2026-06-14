import { api } from './client'

export type ProvaStatus = 'em_prova' | 'aguardando_caixa' | 'finalizada' | 'cancelada'

export interface ProvaItemRemoto {
  id:            string
  versao_id:     string
  produto_id:    string
  nome:          string
  atributos:     Record<string, string>
  preco_unitario: number
  quantidade:    number
  codigo_barras?: string | null
  devolvido:     boolean
}

export interface ProvaRemota {
  id:            string
  cliente_id:    string | null
  cliente_nome:  string | null
  criado_por:    string | null
  nome_vendedor: string | null
  criado_em:     string
  atualizado_em: string
  prazo:         string | null
  observacao:    string | null
  status:        ProvaStatus
  itens:         ProvaItemRemoto[]
}

export const provasApi = {
  list: (status: 'ativas' | 'concluidas' | ProvaStatus = 'ativas') =>
    api.get<ProvaRemota[]>('/provas-em-casa', { params: { status } }).then(r => r.data),

  get: (id: string) =>
    api.get<ProvaRemota>(`/provas-em-casa/${id}`).then(r => r.data),

  create: (data: {
    cliente_id?:    string | null
    cliente_nome?:  string | null
    vendedor_id?:   string | null
    vendedor_nome?: string | null
    prazo?:         string | null
    observacao?:    string | null
    itens:          Omit<ProvaItemRemoto, 'id' | 'devolvido'>[]
  }) => api.post<ProvaRemota>('/provas-em-casa', data).then(r => r.data),

  devolver: (id: string, itens_devolvidos: string[]) =>
    api.put<ProvaRemota>(`/provas-em-casa/${id}/devolver`, { itens_devolvidos }).then(r => r.data),

  liberarCaixa: (id: string) =>
    api.put<ProvaRemota>(`/provas-em-casa/${id}/liberar-caixa`).then(r => r.data),

  puxar: (id: string) =>
    api.put<ProvaRemota>(`/provas-em-casa/${id}/puxar`).then(r => r.data),

  finalizar: (id: string) =>
    api.put<ProvaRemota>(`/provas-em-casa/${id}/finalizar`).then(r => r.data),

  cancelar: (id: string) =>
    api.put<ProvaRemota>(`/provas-em-casa/${id}/cancelar`).then(r => r.data),
}
