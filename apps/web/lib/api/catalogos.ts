import { api } from './client'

export type TipoCatalogo = 'tamanhos' | 'cores' | 'tipos_produto' | 'composicoes' | 'medidas'

export interface ItemCatalogo {
  id: string
  nome: string
  hex_cor?: string   // apenas cores
  ordem?: number     // apenas tamanhos
  ativo: boolean
}

export const catalogosApi = {
  list: (tipo: TipoCatalogo) =>
    api.get<ItemCatalogo[]>(`/catalogos/${tipo}`).then(r => r.data),

  create: (tipo: TipoCatalogo, data: Partial<ItemCatalogo>) =>
    api.post<ItemCatalogo>(`/catalogos/${tipo}`, data).then(r => r.data),

  update: (tipo: TipoCatalogo, id: string, data: Partial<ItemCatalogo>) =>
    api.put<ItemCatalogo>(`/catalogos/${tipo}/${id}`, data).then(r => r.data),

  remove: (tipo: TipoCatalogo, id: string) =>
    api.delete(`/catalogos/${tipo}/${id}`),
}
