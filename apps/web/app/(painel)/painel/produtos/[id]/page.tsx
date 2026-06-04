'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { produtosApi, type Produto } from '@/lib/api/produtos'

export default function ProdutoDetalhe() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const [produto, setProduto]   = useState<Produto | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    produtosApi.get(id)
      .then(setProduto)
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Remover este produto?')) return
    await produtosApi.remove(id)
    router.push('/painel/produtos')
  }

  if (loading) return (
    <>
      <TopBar title="Produto" />
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  )

  if (!produto) return (
    <>
      <TopBar title="Produto" />
      <p className="text-center text-steel py-16">Produto não encontrado.</p>
    </>
  )

  return (
    <>
      <TopBar title={produto.nome} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          {/* Info */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-sea-foam font-bold text-lg">{produto.nome}</h2>
                <p className="text-steel text-sm">{produto.categoria || 'Sem categoria'} {produto.marca ? `· ${produto.marca}` : ''}</p>
              </div>
              <p className="text-electric-cyan font-bold text-lg">R$ {Number(produto.preco_base).toFixed(2)}</p>
            </div>
            {produto.descricao && <p className="text-steel text-sm">{produto.descricao}</p>}
            <p className="text-steel text-xs mt-3">
              {produto.controle_estoque ? `Estoque total: ${produto.estoque_total} un.` : 'Sem controle de estoque'}
            </p>
          </section>

          {/* Variações */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <h3 className="text-sea-foam font-semibold text-sm uppercase tracking-wider mb-3">
              Variações ({produto.versoes?.length ?? 0})
            </h3>
            {produto.versoes?.length === 0 ? (
              <p className="text-steel text-sm">Nenhuma variação cadastrada.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {produto.versoes?.map(v => {
                  const label = Object.entries(v.atributos_json).map(([k, val]) => `${k}: ${val}`).join(' · ') || 'Versão única'
                  return (
                    <div key={v.id} className="flex items-center justify-between bg-midnight rounded-xl px-4 py-3">
                      <p className="text-sea-foam text-sm">{label}</p>
                      <div className="text-right">
                        {v.preco_especifico && (
                          <p className="text-electric-cyan text-xs">R$ {Number(v.preco_especifico).toFixed(2)}</p>
                        )}
                        <p className={`text-xs ${v.estoque_atual <= v.estoque_minimo ? 'text-red-400' : 'text-steel'}`}>
                          {produto.controle_estoque ? `${v.estoque_atual} un.` : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/painel/produtos/${id}/editar`)}
              className="flex-1 min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold"
            >
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="min-h-[52px] px-5 border border-red-500/30 text-red-400 rounded-2xl text-sm font-medium"
            >
              Remover
            </button>
          </div>

        </div>
      </main>
    </>
  )
}
