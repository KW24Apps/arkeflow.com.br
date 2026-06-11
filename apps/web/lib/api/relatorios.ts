import { api } from './client'

const p = (inicio: string, fim: string, extra?: Record<string, string>) =>
  ({ params: { inicio, fim, ...extra } })

export const relatoriosApi = {
  dashboard:   (i: string, f: string) => api.get('/relatorios/dashboard',   p(i, f)).then(r => r.data),
  vendas:      (i: string, f: string, page = 1) => api.get('/relatorios/vendas', { params: { inicio: i, fim: f, page } }).then(r => r.data),
  giroGrade:   (i: string, f: string) => api.get('/relatorios/giro-grade',  p(i, f)).then(r => r.data),
  agingEstoque:()                     => api.get('/relatorios/aging-estoque').then(r => r.data),
  cesta:       (i: string, f: string) => api.get('/relatorios/cesta',       p(i, f)).then(r => r.data),
  financeiro:  (i: string, f: string) => api.get('/relatorios/financeiro',  p(i, f)).then(r => r.data),
  clientesRfm: (i: string, f: string) => api.get('/relatorios/clientes-rfm', p(i, f)).then(r => r.data),
}
