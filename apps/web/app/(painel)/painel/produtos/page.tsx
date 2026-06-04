'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { produtosApi, type Produto } from '@/lib/api/produtos'

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [q,        setQ]        = useState('')
  const [loading,  setLoading]  = useState(true)

  async function load(busca?: string) {
    setLoading(true)
    try { setProdutos(await produtosApi.list(busca || undefined)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleToggleAtivo(p: Produto, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const novoStatus = !p.ativo
    await produtosApi.update(p.id, { ativo: novoStatus } as any)
    setProdutos(prev => prev.map(x => x.id === p.id ? { ...x, ativo: novoStatus } : x))
  }

  return (
    <>
      <TopBar title="Produtos" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-6">

        <div className="flex gap-3 mb-5">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(q)}
            placeholder="Buscar produto..."
            className="flex-1 min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
          />
          <button onClick={() => load(q)}
            className="min-h-[48px] px-5 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold">
            Buscar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">📦</span>
            <p className="text-sea-foam font-medium">Nenhum produto cadastrado</p>
            <p className="text-steel text-sm">Toque no botão + para adicionar</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {produtos.map(p => (
              <Link
                key={p.id}
                href={`/painel/produtos/${p.id}`}
                className={`border rounded-2xl p-4 flex items-center gap-3 transition-colors ${
                  p.ativo
                    ? 'bg-deep-ocean border-ocean-depth active:bg-ocean-depth'
                    : 'bg-midnight border-ocean-depth/50 opacity-60'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-ocean-depth flex items-center justify-center shrink-0">
                  <span className="text-lg">👕</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sea-foam font-medium text-sm truncate">{p.nome}</p>
                  <p className="text-steel text-xs mt-0.5">
                    {p.categoria || 'Sem categoria'} · R$ {Number(p.preco_base).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-electric-cyan text-sm font-semibold">{p.total_versoes} var.</p>
                    <p className={`text-xs mt-0.5 ${p.estoque_total <= 0 && p.controle_estoque ? 'text-red-400' : 'text-steel'}`}>
                      {p.controle_estoque ? `${p.estoque_total} un.` : 'Sem controle'}
                    </p>
                  </div>

                  {/* Toggle ativo/inativo */}
                  <button
                    onClick={e => handleToggleAtivo(p, e)}
                    title={p.ativo ? 'Desativar produto' : 'Ativar produto'}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${p.ativo ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${p.ativo ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/painel/produtos/novo"
          className="fixed bottom-6 right-6 w-14 h-14 bg-electric-cyan text-midnight rounded-full text-2xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          +
        </Link>
      </main>
    </>
  )
}
