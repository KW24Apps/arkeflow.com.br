import { api } from './client'
import type { Promocao } from '@/lib/calcularDesconto'

export type { Promocao }

export const promocoesApi = {
  list: (todas?: boolean) =>
    api.get<Promocao[]>('/promocoes', { params: todas ? { todas: 'true' } : {} }).then(r => r.data),
  get: (id: string) =>
    api.get<Promocao>(`/promocoes/${id}`).then(r => r.data),
  create: (data: any) =>
    api.post<Promocao>('/promocoes', data).then(r => r.data),
  update: (id: string, data: any) =>
    api.put<Promocao>(`/promocoes/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    api.delete(`/promocoes/${id}`),
}
