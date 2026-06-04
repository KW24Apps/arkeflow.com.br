'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { produtosApi, type Produto } from '@/lib/api/produtos'

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [q, setQ]               = useState('')
  const [loading, setLoading]   = useState(true)

  async function load(busca?: string) {
    setLoading(true)
    try { setProdutos(await produtosApi.list(busca || undefined)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <>
      <TopBar title="Produtos" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-6">

        {/* Busca */}
        <div className="flex gap-3 mb-5">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(q)}
            placeholder="Buscar produto..."
            className="flex-1 min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
          />
          <button
            onClick={() => load(q)}
            className="min-h-[48px] px-5 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold"
          >
            Buscar
          </button>
        </div>

        {/* Lista */}
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
                className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center gap-4 active:bg-ocean-depth transition-colors"
              >
                {/* Ícone placeholder */}
                <div className="w-12 h-12 rounded-xl bg-ocean-depth flex items-center justify-center shrink-0">
                  <span className="text-xl">👕</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sea-foam font-medium text-sm truncate">{p.nome}</p>
                  <p className="text-steel text-xs mt-0.5">
                    {p.categoria || 'Sem categoria'} · R$ {Number(p.preco_base).toFixed(2)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-electric-cyan text-sm font-semibold">{p.total_versoes} var.</p>
                  <p className={`text-xs mt-0.5 ${p.estoque_total <= 0 ? 'text-red-400' : 'text-steel'}`}>
                    {p.controle_estoque ? `${p.estoque_total} un.` : 'Sem controle'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* FAB — botão flutuante para novo produto */}
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
