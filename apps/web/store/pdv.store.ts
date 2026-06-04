import { create } from 'zustand'

export interface SacolaItem {
  versao_id:     string
  produto_id:    string
  nome:          string
  atributos:     Record<string, string>
  preco_unitario:number
  quantidade:    number
  codigo_barras?: string | null
}

interface PDVStore {
  itens:     SacolaItem[]
  cliente_id:string | null
  cliente_nome:string | null

  addItem:      (item: Omit<SacolaItem, 'quantidade'>) => void
  removeItem:   (versao_id: string) => void
  setQtd:       (versao_id: string, qtd: number) => void
  setCliente:   (id: string | null, nome: string | null) => void
  limpar:       () => void
}

export const usePDVStore = create<PDVStore>((set, get) => ({
  itens:       [],
  cliente_id:  null,
  cliente_nome:null,

  addItem: (item) => set(state => {
    const existente = state.itens.find(i => i.versao_id === item.versao_id)
    if (existente) {
      return { itens: state.itens.map(i =>
        i.versao_id === item.versao_id ? { ...i, quantidade: i.quantidade + 1 } : i
      )}
    }
    return { itens: [...state.itens, { ...item, quantidade: 1 }] }
  }),

  removeItem: (versao_id) => set(state => ({
    itens: state.itens.filter(i => i.versao_id !== versao_id)
  })),

  setQtd: (versao_id, qtd) => set(state => ({
    itens: qtd <= 0
      ? state.itens.filter(i => i.versao_id !== versao_id)
      : state.itens.map(i => i.versao_id === versao_id ? { ...i, quantidade: qtd } : i)
  })),

  setCliente: (id, nome) => set({ cliente_id: id, cliente_nome: nome }),

  limpar: () => set({ itens: [], cliente_id: null, cliente_nome: null }),
}))
