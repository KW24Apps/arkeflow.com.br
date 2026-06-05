'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api/client'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'
import type { SacolaItem } from '@/store/pdv.store'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Versao {
  id: string
  atributos_json: Record<string, string>
  preco_especifico: string | null
  estoque_atual: number
  ativo: boolean
  codigo_barras: string | null
}

interface Produto {
  id: string
  nome: string
  categoria: string | null
  preco_base: string
  controle_estoque: boolean
  ativo: boolean
  total_versoes: number
  versoes?: Versao[]
}

interface Props {
  open:      boolean
  onClose:   () => void
  onAddItem: (item: Omit<SacolaItem, 'quantidade'>) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdvancedSearchModal({ open, onClose, onAddItem }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [produtos,   setProdutos]   = useState<Produto[]>([])
  const [tamanhos,   setTamanhos]   = useState<ItemCatalogo[]>([])
  const [cores,      setCores]      = useState<ItemCatalogo[]>([])
  const [carregando, setCarregando] = useState(false)

  // Variant expansion per product
  const [expandido,  setExpandido]  = useState<Record<string, Versao[]>>({})
  const [loadingVar, setLoadingVar] = useState<Record<string, boolean>>({})

  // Filters
  const [texto,   setTexto]   = useState('')
  const [filtCat, setFiltCat] = useState('')
  const [filtTam, setFiltTam] = useState('')
  const [filtCor, setFiltCor] = useState('')

  // ── Load data on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setCarregando(true)
    setTexto(''); setFiltCat(''); setFiltTam(''); setFiltCor('')
    setExpandido({}); setLoadingVar({})

    Promise.all([
      api.get<Produto[]>('/produtos', { params: { todos: 'false' } }).then(r => r.data),
      catalogosApi.list('tamanhos'),
      catalogosApi.list('cores'),
    ]).then(([ps, tams, cors]) => {
      setProdutos(ps)
      setTamanhos(tams.filter(t => t.ativo))
      setCores(cors.filter(c => c.ativo))
      setCarregando(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }).catch(() => setCarregando(false))
  }, [open])

  if (!open) return null

  // ── Derived filters ────────────────────────────────────────────────────────
  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))] as string[]

  const produtosFiltrados = produtos.filter(p => {
    if (filtCat && p.categoria !== filtCat) return false
    if (!texto.trim()) return true
    const q = texto.toLowerCase()
    return p.nome.toLowerCase().includes(q)
  })

  // ── Load variants for a product ────────────────────────────────────────────
  async function loadVariants(produto: Produto) {
    if (expandido[produto.id]) {
      setExpandido(prev => { const n = { ...prev }; delete n[produto.id]; return n })
      return
    }
    if (produto.versoes?.length) {
      setExpandido(prev => ({ ...prev, [produto.id]: produto.versoes! }))
      return
    }
    setLoadingVar(prev => ({ ...prev, [produto.id]: true }))
    try {
      const { data } = await api.get<Produto>(`/produtos/${produto.id}`)
      setExpandido(prev => ({ ...prev, [produto.id]: data.versoes ?? [] }))
    } finally {
      setLoadingVar(prev => ({ ...prev, [produto.id]: false }))
    }
  }

  // ── Filter variants ────────────────────────────────────────────────────────
  function filtrarVersoes(versoes: Versao[]): Versao[] {
    return versoes.filter(v => {
      if (!v.ativo) return false
      const attrs = v.atributos_json ?? {}
      if (filtTam) {
        const hasTam = Object.values(attrs).includes(filtTam)
        if (!hasTam) return false
      }
      if (filtCor) {
        const hasCor = Object.values(attrs).includes(filtCor)
        if (!hasCor) return false
      }
      return true
    })
  }

  // ── Add item and close ─────────────────────────────────────────────────────
  function addVariant(produto: Produto, versao: Versao) {
    const attrLabel = Object.values(versao.atributos_json ?? {}).join(' / ') || 'Versão única'
    onAddItem({
      versao_id:      versao.id,
      produto_id:     produto.id,
      nome:           produto.nome,
      atributos:      versao.atributos_json ?? {},
      preco_unitario: parseFloat(versao.preco_especifico ?? produto.preco_base),
      codigo_barras:  versao.codigo_barras ?? null,
    })
    onClose()
  }

  const temFiltroAtivo = texto || filtCat || filtTam || filtCor

  return (
    <div
      className="fixed inset-0 bg-midnight/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-ocean-depth flex items-center justify-between">
          <h3 className="text-sea-foam font-semibold">Busca Avançada de Produtos</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-steel hover:text-sea-foam text-xl">×</button>
        </div>

        {/* Filtros */}
        <div className="shrink-0 px-5 py-4 border-b border-ocean-depth flex flex-col gap-3">
          {/* Linha 1: input texto */}
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Nome do produto ou código de barras..."
            className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel/60 outline-none focus:border-electric-cyan"
          />

          {/* Linha 2: dropdowns de filtro */}
          <div className="flex gap-3">
            <select
              value={filtCat}
              onChange={e => setFiltCat(e.target.value)}
              className="flex-1 min-h-[40px] bg-midnight border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none focus:border-electric-cyan"
            >
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={filtTam}
              onChange={e => setFiltTam(e.target.value)}
              className="w-32 min-h-[40px] bg-midnight border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none focus:border-electric-cyan"
            >
              <option value="">Tamanho</option>
              {tamanhos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
            </select>

            <select
              value={filtCor}
              onChange={e => setFiltCor(e.target.value)}
              className="w-36 min-h-[40px] bg-midnight border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none focus:border-electric-cyan"
            >
              <option value="">Cor</option>
              {cores.map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>

            {temFiltroAtivo && (
              <button
                onClick={() => { setTexto(''); setFiltCat(''); setFiltTam(''); setFiltCor('') }}
                className="px-3 text-steel hover:text-red-400 text-xs whitespace-nowrap"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2">
          {carregando && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!carregando && produtosFiltrados.length === 0 && (
            <div className="text-center py-12 text-steel text-sm">
              Nenhum produto encontrado.
            </div>
          )}

          {!carregando && produtosFiltrados.map(produto => {
            const versoes   = expandido[produto.id]
            const isOpen    = !!versoes
            const isLoading = loadingVar[produto.id]
            const versoesFilt = versoes ? filtrarVersoes(versoes) : []

            return (
              <div key={produto.id} className="bg-midnight rounded-2xl overflow-hidden">
                {/* Product row */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-ocean-depth/50 transition-colors"
                  onClick={() => loadVariants(produto)}
                >
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sea-foam text-sm font-medium truncate">{produto.nome}</p>
                    <p className="text-steel text-xs">
                      {produto.categoria && <span>{produto.categoria} · </span>}
                      {produto.total_versoes} variação{produto.total_versoes !== 1 ? 'ões' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <p className="text-electric-cyan text-sm font-semibold">
                      R$ {Number(produto.preco_base).toFixed(2)}
                    </p>
                    <span className={`text-steel text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>

                {/* Variants */}
                {isOpen && (
                  <div className="px-4 pb-3 border-t border-ocean-depth/50">
                    {isLoading && (
                      <div className="flex justify-center py-3">
                        <div className="w-5 h-5 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {!isLoading && versoesFilt.length === 0 && (
                      <p className="text-steel text-xs py-2">
                        {filtTam || filtCor ? 'Nenhuma variação com esses filtros.' : 'Sem variações disponíveis.'}
                      </p>
                    )}

                    {!isLoading && versoesFilt.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {versoesFilt.map(v => {
                          const label  = Object.values(v.atributos_json ?? {}).join(' / ') || 'Versão única'
                          const preco  = parseFloat(v.preco_especifico ?? produto.preco_base)
                          const semEst = produto.controle_estoque && v.estoque_atual <= 0

                          return (
                            <button
                              key={v.id}
                              onClick={() => !semEst && addVariant(produto, v)}
                              disabled={semEst}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-colors ${
                                semEst
                                  ? 'border-ocean-depth text-steel/40 cursor-not-allowed'
                                  : 'border-ocean-depth text-sea-foam hover:border-electric-cyan hover:text-electric-cyan active:scale-95'
                              }`}
                            >
                              {/* Color swatch if cor filter is active */}
                              {v.atributos_json?.['Cor'] && (
                                <span className="font-medium">{v.atributos_json['Cor']}</span>
                              )}
                              <span>{label}</span>
                              {v.preco_especifico && (
                                <span className="text-electric-cyan font-semibold">R$ {preco.toFixed(2)}</span>
                              )}
                              {produto.controle_estoque && (
                                <span className={semEst ? 'text-red-400' : 'text-steel'}>
                                  ({v.estoque_atual})
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-ocean-depth flex items-center justify-between">
          <p className="text-steel text-xs">
            {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
            {temFiltroAtivo ? ' encontrado' + (produtosFiltrados.length !== 1 ? 's' : '') : ' no catálogo'}
          </p>
          <p className="text-steel text-xs">Clique no produto para ver variações · Clique na variação para adicionar</p>
        </div>
      </div>
    </div>
  )
}
