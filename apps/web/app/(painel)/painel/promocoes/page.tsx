'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { promocoesApi, type Promocao } from '@/lib/api/promocoes'

const TIPO_LABEL: Record<string, string> = {
  desconto_percentual: 'Desconto %',
  desconto_fixo:       'Desconto R$',
  segunda_peca:        '2ª Peça com Desconto',
  compre_ganhe:        'Compre X Leve Y',
  primeira_compra:     'Primeira Compra',
}

const TIPO_ICON: Record<string, string> = {
  desconto_percentual: '🏷️',
  desconto_fixo:       '💰',
  segunda_peca:        '2️⃣',
  compre_ganhe:        '🎁',
  primeira_compra:     '🌟',
}

export default function PromocoesPage() {
  const [promos,  setPromos]  = useState<Promocao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState<'ativas' | 'todas'>('ativas')

  async function load() {
    setLoading(true)
    try { setPromos(await promocoesApi.list(filtro === 'todas')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filtro])

  async function handleToggle(p: Promocao) {
    await promocoesApi.update(p.id, { ativo: !p.ativo })
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x))
  }

  async function handleRemover(id: string) {
    if (!confirm('Remover esta promoção?')) return
    await promocoesApi.remove(id)
    setPromos(prev => prev.filter(x => x.id !== id))
  }

  function descricao(p: Promocao): string {
    switch (p.tipo) {
      case 'desconto_percentual': return `${p.valor_desconto}% de desconto`
      case 'desconto_fixo':       return `R$ ${Number(p.valor_desconto).toFixed(2)} de desconto`
      case 'segunda_peca':        return `2ª peça com ${p.percentual_brinde}% off`
      case 'compre_ganhe':        return `Compre ${p.quantidade_compre} leve ${(p.quantidade_compre ?? 0) + (p.quantidade_brinde ?? 0)}`
      case 'primeira_compra':     return `${p.valor_desconto}% na primeira compra`
      default: return ''
    }
  }

  function periodo(p: Promocao): string {
    if (!p.inicio && !p.fim) return 'Sem vencimento'
    const ini = p.inicio ? new Date(p.inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
    const fim = p.fim    ? new Date(p.fim + 'T12:00:00').toLocaleDateString('pt-BR')    : 'indeterminado'
    return `${ini} → ${fim}`
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-6">

        <div className="flex gap-2 mb-5">
          {(['ativas','todas'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`min-h-[40px] px-4 rounded-xl text-sm font-medium border capitalize transition-colors ${
                filtro === f ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel hover:text-sea-foam'
              }`}>
              {f === 'ativas' ? 'Ativas' : 'Todas'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
        ) : promos.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">🏷️</span>
            <p className="text-sea-foam font-medium">Nenhuma promoção cadastrada</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl">
            {promos.map(p => (
              <div key={p.id} className={`bg-deep-ocean border rounded-2xl p-4 transition-opacity ${
                p.ativo ? 'border-ocean-depth' : 'border-ocean-depth/50 opacity-60'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{TIPO_ICON[p.tipo]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sea-foam font-semibold text-sm">{p.nome}</p>
                      <span className="bg-ocean-depth text-teal-current text-[10px] px-2 py-0.5 rounded-full">
                        {TIPO_LABEL[p.tipo]}
                      </span>
                      {!p.ativo && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full">Inativa</span>}
                    </div>
                    <p className="text-steel text-xs mt-1">{descricao(p)}</p>
                    <p className="text-steel text-xs">{periodo(p)}</p>
                    {(p as any).produtos_ids?.length > 0 && (
                      <p className="text-steel text-xs">{(p as any).produtos_ids.length} produto(s) vinculado(s)</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggle(p)}
                      title={p.ativo ? 'Desativar' : 'Ativar'}
                      className={`w-10 h-6 rounded-full transition-colors relative ${p.ativo ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${p.ativo ? 'left-5' : 'left-1'}`} />
                    </button>
                    <Link href={`/painel/promocoes/${p.id}`}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan rounded-lg hover:bg-ocean-depth flex items-center justify-center transition-colors">✏️</Link>
                    <button onClick={() => handleRemover(p.id)}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth flex items-center justify-center transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/painel/promocoes/nova"
          className="fixed bottom-6 right-6 w-14 h-14 bg-electric-cyan text-midnight rounded-full text-2xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          +
        </Link>
      </main>
    </>
  )
}
