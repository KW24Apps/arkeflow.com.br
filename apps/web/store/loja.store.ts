import { create } from 'zustand'

interface LojaStore {
  logo_url:  string | null
  nome_loja: string | null
  setLoja:   (data: { logo_url: string | null; nome_loja: string | null }) => void
}

export const useLojaStore = create<LojaStore>((set) => ({
  logo_url:  null,
  nome_loja: null,
  setLoja:   (data) => set(data),
}))
