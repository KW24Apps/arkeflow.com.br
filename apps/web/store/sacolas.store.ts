import { create } from 'zustand'
import { sacolasApi } from '@/lib/api/sacolas'
import type { SacolaRemota, SacolaStatus } from '@/lib/api/sacolas'

interface SacolasStore {
  lista:      SacolaRemota[]
  carregando: boolean
  erro:       string | null

  carregar:        (status?: SacolaStatus) => Promise<void>
  encerrar:        (id: string) => Promise<void>
  marcarAtendendo: (id: string) => Promise<void>
}

export const useSacolasStore = create<SacolasStore>((set, get) => ({
  lista:      [],
  carregando: false,
  erro:       null,

  carregar: async (status = 'aguardando') => {
    set({ carregando: true, erro: null })
    try {
      const lista = await sacolasApi.list(status)
      set({ lista, carregando: false })
    } catch {
      set({ carregando: false, erro: 'Erro ao carregar sacolas.' })
    }
  },

  marcarAtendendo: async (id) => {
    await sacolasApi.updateStatus(id, 'em_atendimento')
    set(state => ({
      lista: state.lista.map(s => s.id === id ? { ...s, status: 'em_atendimento' as SacolaStatus } : s)
    }))
  },

  encerrar: async (id) => {
    await sacolasApi.updateStatus(id, 'finalizada')
    set(state => ({ lista: state.lista.filter(s => s.id !== id) }))
  },
}))
