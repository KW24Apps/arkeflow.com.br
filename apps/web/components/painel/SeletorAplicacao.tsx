'use client'

import { useEffect, useState } from 'react'
import { produtosApi, type Produto } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'

export interface AplicacaoData {
  aplica_todos:    boolean
  categorias_alvo: string[]    // nomes de tipos de produto
  produtos_ids:    string[]    // UUIDs de produtos
}

interface Props {
  value:    AplicacaoData
  onChange: (v: AplicacaoData) => void
}

type Tab = 'categorias' | 'produtos'

export function SeletorAplicacao({ value, onChange }: Props) {
  const [aberto,    setAberto]    = useState(false)
  const [aba,       setAba]       = useState<Tab>('categorias')
  const [busca,     setBusca]     = useState('')
  const [tipos,     setTipos]     = useState<ItemCatalogo[]>([])
  const [produtos,  setProdutos]  = useState<Produto[]>([])
  const [loadingP,  setLoadingP]  = useState(false)
  const [nomeMap,   setNomeMap]   = useState<Record<string,string>>({})

  useEffect(() => {
    catalogosApi.list('tipos_produto').then(setTipos)
  }, [])

  // Busca produtos quando abre a aba de produtos
  useEffect(() => {
    if (aba !== 'produtos') return
    setLoadingP(true)
    produtosApi.list(busca || undefined, false)
      .then(ps => {
        setProdutos(ps)
        const m: Record<string,string> = {}
        ps.forEach(p => { m[p.id] = p.nome })
        setNomeMap(prev => ({ ...prev, ...m }))
      })
      .finally(() => setLoadingP(false))
  }, [aba, busca])

  // Carrega nomes dos produtos já selecionados
  useEffect(() => {
    const faltam = value.produtos_ids.filter(id => !nomeMap[id])
    if (!faltam.length) return
    Promise.all(faltam.map(id => produtosApi.get(id).catch(() => null))).then(ps => {
      const m: Record<string,string> = {}
      ps.forEach(p => { if (p) m[p.id] = p.nome })
      setNomeMap(prev => ({ ...prev, ...m }))
    })
  }, [value.produtos_ids])

  function toggleTodos() {
    if (value.aplica_todos) {
      onChange({ ...value, aplica_todos: false })
    } else {
      onChange({ aplica_todos: true, categorias_alvo: [], produtos_ids: [] })
    }
  }

  function toggleCategoria(nome: string) {
    const novas = value.categorias_alvo.includes(nome)
      ? value.categorias_alvo.filter(c => c !== nome)
      : [...value.categorias_alvo, nome]
    onChange({ ...value, aplica_todos: false, categorias_alvo: novas })
  }

  function toggleProduto(id: string) {
    const novos = value.produtos_ids.includes(id)
      ? value.produtos_ids.filter(p => p !== id)
      : [...value.produtos_ids, id]
    onChange({ ...value, aplica_todos: false, produtos_ids: novos })
  }

  function removerCategoria(nome: string) {
    onChange({ ...value, categorias_alvo: value.categorias_alvo.filter(c => c !== nome) })
  }

  function removerProduto(id: string) {
    onChange({ ...value, produtos_ids: value.produtos_ids.filter(p => p !== id) })
  }

  const totalSelecionados = value.aplica_todos
    ? 1
    : value.categorias_alvo.length + value.produtos_ids.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-steel uppercase tracking-wider">Aplicar em</label>
        {totalSelecionados > 0 && (
          <span className="text-electric-cyan text-xs">{
            value.aplica_todos ? 'Todos os produtos' : `${totalSelecionados} selecionado(s)`
          }</span>
        )}
      </div>

      {/* Tags dos itens selecionados */}
      <div className="flex flex-wrap gap-2">
        {value.aplica_todos && (
          <span className="flex items-center gap-1.5 bg-electric-cyan/20 border border-electric-cyan/40 text-electric-cyan text-xs px-3 py-1.5 rounded-full">
            Todos os produtos
            <button onClick={toggleTodos} className="hover:text-midnight">×</button>
          </span>
        )}
        {value.categorias_alvo.map(cat => (
          <span key={cat} className="flex items-center gap-1.5 bg-teal-current/20 border border-teal-current/40 text-teal-current text-xs px-3 py-1.5 rounded-full">
            📂 {cat}
            <button onClick={() => removerCategoria(cat)} className="hover:text-sea-foam">×</button>
          </span>
        ))}
        {value.produtos_ids.map(id => (
          <span key={id} className="flex items-center gap-1.5 bg-ocean-depth border border-teal-current/30 text-sea-foam text-xs px-3 py-1.5 rounded-full">
            📦 {nomeMap[id] ?? '...'}
            <button onClick={() => removerProduto(id)} className="hover:text-red-400">×</button>
          </span>
        ))}

        {/* Botão adicionar */}
        {!value.aplica_todos && (
          <button type="button" onClick={() => setAberto(v => !v)}
            className="flex items-center gap-1 text-xs text-electric-cyan/70 hover:text-electric-cyan border border-ocean-depth hover:border-electric-cyan/50 px-3 py-1.5 rounded-full transition-colors">
            {aberto ? '▲ Fechar' : '+ Adicionar'}
          </button>
        )}
      </div>

      {/* Painel de seleção */}
      {aberto && !value.aplica_todos && (
        <div className="bg-midnight border border-ocean-depth rounded-2xl overflow-hidden">

          {/* Opção "Todos" */}
          <button type="button" onClick={() => { toggleTodos(); setAberto(false) }}
            className="w-full flex items-center gap-3 min-h-[48px] px-4 hover:bg-ocean-depth text-left transition-colors border-b border-ocean-depth">
            <span className="w-4 h-4 rounded border-2 border-steel flex items-center justify-center">
              {value.aplica_todos && <span className="text-midnight text-[9px] font-bold">✓</span>}
            </span>
            <div>
              <p className="text-sea-foam text-sm font-medium">Todos os produtos</p>
              <p className="text-steel text-xs">Aplica em qualquer produto da loja</p>
            </div>
          </button>

          {/* Abas */}
          <div className="flex border-b border-ocean-depth">
            {(['categorias','produtos'] as Tab[]).map(t => (
              <button key={t} type="button" onClick={() => { setAba(t); setBusca('') }}
                className={`flex-1 min-h-[40px] text-sm font-medium capitalize border-b-2 transition-colors ${
                  aba === t ? 'text-electric-cyan border-electric-cyan' : 'text-steel border-transparent'
                }`}>
                {t === 'categorias' ? 'Categorias' : 'Produtos'}
              </button>
            ))}
          </div>

          {/* Aba categorias */}
          {aba === 'categorias' && (
            <div className="max-h-48 overflow-y-auto">
              {tipos.map(t => {
                const sel = value.categorias_alvo.includes(t.nome)
                return (
                  <button key={t.id} type="button" onClick={() => toggleCategoria(t.nome)}
                    className={`w-full flex items-center gap-3 min-h-[44px] px-4 text-left hover:bg-ocean-depth transition-colors ${sel ? 'bg-teal-current/10' : ''}`}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'}`}>
                      {sel && <span className="text-midnight text-[9px] font-bold">✓</span>}
                    </span>
                    <span className={`text-sm ${sel ? 'text-sea-foam' : 'text-steel'}`}>{t.nome}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Aba produtos com busca */}
          {aba === 'produtos' && (
            <>
              <div className="p-2 border-b border-ocean-depth">
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar produto pelo nome..."
                  className="w-full min-h-[40px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {loadingP ? (
                  <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
                ) : produtos.length === 0 ? (
                  <p className="text-center text-steel text-xs py-4">Nenhum produto encontrado</p>
                ) : produtos.map(p => {
                  const sel = value.produtos_ids.includes(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProduto(p.id)}
                      className={`w-full flex items-center gap-3 min-h-[44px] px-4 text-left hover:bg-ocean-depth transition-colors ${sel ? 'bg-electric-cyan/5' : ''}`}>
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'}`}>
                        {sel && <span className="text-midnight text-[9px] font-bold">✓</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${sel ? 'text-sea-foam' : 'text-steel'}`}>{p.nome}</p>
                        <p className="text-steel text-xs">R$ {Number(p.preco_base).toFixed(2)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="p-2 border-t border-ocean-depth">
            <button type="button" onClick={() => setAberto(false)}
              className="w-full min-h-[36px] bg-electric-cyan text-midnight rounded-xl text-xs font-semibold">
              Confirmar seleção
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
