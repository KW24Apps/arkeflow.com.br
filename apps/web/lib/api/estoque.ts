import { api } from './client'

export interface ItemEstoque {
  versao_id: string
  produto_id: string
  produto_nome: string
  atributos_json: Record<string, string>
  estoque_atual: number
  estoque_minimo: number
  preco_base: string
  alerta: boolean
}

export interface AjusteEstoque {
  versao_id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo?: string
}

export const estoqueApi = {
  list: (alerta?: boolean) =>
    api.get<ItemEstoque[]>('/estoque', { params: alerta ? { alerta: 'true' } : {} }).then(r => r.data),
  ajustar: (data: AjusteEstoque) =>
    api.post('/estoque/ajuste', data).then(r => r.data),
  historicoAjustes: (versao_id: string) =>
    api.get<any[]>(`/estoque/ajustes/${versao_id}`).then(r => r.data),
}
