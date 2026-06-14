import { api } from './client'

export interface VendaMobile {
  id: string
  total: number
  subtotal: number
  status: string
  criado_em: string
  vendedor_id: string | null
  vendedor_nome: string | null
  cliente_nome: string | null
  cliente_telefone: string | null
  total_itens: number
}

export const vendasApi = {
  minhasHoje: (vendedor_id: string) => {
    const hoje = new Date().toISOString().split('T')[0]
    return api.get<VendaMobile[]>('/vendas', {
      params: { de: hoje, ate: hoje, vendedor_id, limit: 100 }
    }).then(r => r.data)
  }
}
