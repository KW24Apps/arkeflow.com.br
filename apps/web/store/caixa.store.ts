import { create } from 'zustand'
import { caixaApi } from '@/lib/api/caixa'
import type { TurnoCaixa } from '@/lib/api/caixa'

type CaixaStatus = 'desconhecido' | 'aberto' | 'fechado'

interface CaixaStore {
  status:     CaixaStatus
  turno:      TurnoCaixa | null
  carregando: boolean
  erro:       string | null

  carregar:           () => Promise<void>
  abrir:              (saldo_inicial: number, obs?: string) => Promise<void>
  fechar:             (saldo_final: number, obs?: string, justificativa?: string | null, autorizacao_id?: string | null) => Promise<void>
  registrarMovimento: (tipo: 'sangria' | 'suprimento', valor: number, motivo?: string) => Promise<void>
  limparErro:         () => void
}

export const useCaixaStore = create<CaixaStore>((set) => ({
  status:     'desconhecido',
  turno:      null,
  carregando: false,
  erro:       null,

  carregar: async () => {
    set({ carregando: true, erro: null })
    try {
      const r = await caixaApi.status()
      set({ status: r.status, turno: r.turno, carregando: false })
    } catch {
      set({ carregando: false, erro: 'Erro ao carregar status do caixa.' })
    }
  },

  abrir: async (saldo_inicial, obs) => {
    set({ carregando: true, erro: null })
    try {
      const turno = await caixaApi.abrir({ saldo_inicial, observacao: obs })
      set({ status: 'aberto', turno, carregando: false })
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Erro ao abrir caixa.'
      set({ carregando: false, erro: msg })
      throw new Error(msg)
    }
  },

  fechar: async (saldo_final, obs, justificativa, autorizacao_id) => {
    set({ carregando: true, erro: null })
    try {
      const turno = await caixaApi.fechar({ saldo_final, observacao: obs, justificativa, autorizacao_id })
      set({ status: 'fechado', turno, carregando: false })
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Erro ao fechar caixa.'
      set({ carregando: false, erro: msg })
      throw new Error(msg)
    }
  },

  registrarMovimento: async (tipo, valor, motivo) => {
    set({ erro: null })
    try {
      await caixaApi.movimento({ tipo, valor, motivo })
      // Reload to get updated aggregates
      const r = await caixaApi.status()
      set({ status: r.status, turno: r.turno })
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Erro ao registrar movimento.'
      set({ erro: msg })
      throw new Error(msg)
    }
  },

  limparErro: () => set({ erro: null }),
}))
