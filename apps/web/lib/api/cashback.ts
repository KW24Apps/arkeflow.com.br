import { api } from './client'

export interface RegraCashback {
  id: string
  nome: string
  percentual: string
  validade_meses: number | null
  padrao: boolean
  ativo: boolean
}

export const cashbackApi = {
  list: () => api.get<RegraCashback[]>('/cashback-regras').then(r => r.data),
  create: (data: Partial<RegraCashback>) => api.post<RegraCashback>('/cashback-regras', data).then(r => r.data),
  update: (id: string, data: Partial<RegraCashback>) => api.put<RegraCashback>(`/cashback-regras/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/cashback-regras/${id}`),
}
