import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SacolaItemRemoto } from '@/lib/api/sacolas'

export interface SacolaItem {
  versao_id:      string
  produto_id:     string
  nome:           string
  atributos:      Record<string, string>
  preco_unitario: number
  quantidade:     number
  codigo_barras?:   string | null
  aceita_desconto?: boolean
  tipo_nome?:       string | null
}

interface PDVStore {
  itens:              SacolaItem[]
  cliente_id:         string | null
  cliente_nome:       string | null
  sacola_id:          string | null  // remote bag this cart was loaded from
  vendedor_id:        string | null
  vendedor_nome:      string | null
  clientePerguntado:  boolean        // persisted: modal asked once per sale
  vendedorDaSacola:   boolean        // true when vendedor came from carregarSacola

  addItem:               (item: Omit<SacolaItem, 'quantidade'>) => void
  addItemQtd:            (item: Omit<SacolaItem, 'quantidade'>, qtd: number) => void
  removeItem:            (versao_id: string) => void
  setQtd:                (versao_id: string, qtd: number) => void
  setCliente:            (id: string | null, nome: string | null) => void
  setVendedor:           (id: string | null, nome: string | null) => void
  setClientePerguntado:  (v: boolean) => void
  // Loads a remote bag into the cart (replaces current cart)
  carregarSacola:(sacola_id: string, itens: SacolaItemRemoto[], cliente_id: string | null, cliente_nome: string | null, vendedor_id?: string | null, vendedor_nome?: string | null) => void
  limpar:        () => void
}

export const usePDVStore = create<PDVStore>()(
  persist(
    (set) => ({
      itens:             [],
      cliente_id:        null,
      cliente_nome:      null,
      sacola_id:         null,
      vendedor_id:       null,
      vendedor_nome:     null,
      clientePerguntado: false,
      vendedorDaSacola:  false,

      addItem: (item) => set(state => {
        const existente = state.itens.find(i => i.versao_id === item.versao_id)
        if (existente) {
          return { itens: state.itens.map(i =>
            i.versao_id === item.versao_id ? { ...i, quantidade: i.quantidade + 1 } : i
          )}
        }
        return { itens: [...state.itens, { ...item, quantidade: 1 }] }
      }),

      addItemQtd: (item, qtd) => set(state => {
        const existente = state.itens.find(i => i.versao_id === item.versao_id)
        if (existente) {
          return { itens: state.itens.map(i =>
            i.versao_id === item.versao_id ? { ...i, quantidade: i.quantidade + qtd } : i
          )}
        }
        return { itens: [...state.itens, { ...item, quantidade: qtd }] }
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

      setVendedor: (id, nome) => set({ vendedor_id: id, vendedor_nome: nome, vendedorDaSacola: false }),

      setClientePerguntado: (v) => set({ clientePerguntado: v }),

      carregarSacola: (sacola_id, itens, cliente_id, cliente_nome, vendedor_id = null, vendedor_nome = null) => set({
        sacola_id,
        cliente_id,
        cliente_nome,
        vendedor_id,
        vendedor_nome,
        vendedorDaSacola: vendedor_id != null,
        itens: itens.map(i => ({
          versao_id:      i.versao_id,
          produto_id:     i.produto_id,
          nome:           i.nome,
          atributos:      i.atributos,
          preco_unitario: i.preco_unitario,
          quantidade:     i.quantidade,
          codigo_barras:  i.codigo_barras ?? null,
        })),
      }),

      limpar: () => set({ itens: [], cliente_id: null, cliente_nome: null, sacola_id: null, vendedor_id: null, vendedor_nome: null, clientePerguntado: false, vendedorDaSacola: false }),
    }),
    {
      name: 'pdv-store',
      partialize: (state) => ({
        itens:             state.itens,
        cliente_id:        state.cliente_id,
        cliente_nome:      state.cliente_nome,
        clientePerguntado: state.clientePerguntado,
        sacola_id:         state.sacola_id,
      }),
    }
  )
)
