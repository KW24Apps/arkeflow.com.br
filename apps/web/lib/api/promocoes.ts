import { api } from './client'
import type { Promocao } from '@/lib/calcularDesconto'

export type { Promocao }

export const promocoesApi = {
  list: (_todas?: boolean) =>
    api.get<Promocao[]>('/promocoes').then(r => r.data),
  listAtivas: () =>
    api.get<Promocao[]>('/promocoes/ativas').then(r => r.data),
  get: (id: string) =>
    api.get<Promocao>(`/promocoes/${id}`).then(r => r.data),
  create: (data: any) =>
    api.post<Promocao>('/promocoes', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put<Promocao>(`/promocoes/${id}`, data).then(r => r.data),
  encerrar: (id: string) =>
    api.put(`/promocoes/${id}/encerrar`).then(r => r.data),
  duplicar: (id: string) =>
    api.post<Promocao>(`/promocoes/${id}/duplicar`).then(r => r.data),
  remove: (id: string) =>
    api.delete(`/promocoes/${id}`),

  conflitos: (ids: string[], promocaoId?: string) =>
    api.get<{ conflitos: { produto_id: string; promocao_nome: string }[] }>(
      '/promocoes/conflitos',
      { params: { ids: ids.join(','), ...(promocaoId ? { promocao_id: promocaoId } : {}) } },
    ).then(r => r.data),
}
