'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { financeiroApi, type Lancamento, type ResumoFinanceiro } from '@/lib/api/financeiro'

export default function FluxoCaixaPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [resumo,      setResumo]      = useState<ResumoFinanceiro | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [formAberto,  setFormAberto]  = useState(false)
  const [salvando,    setSalvando]    = useState(false)

  const hoje = new Date().toISOString().split('T')[0]
  const [de, setDe] = useState(hoje.slice(0, 7) + '-01')
  const [ate, setAte] = useState(hoje)

  const [tipo,      setTipo]      = useState<'entrada' | 'saida'>('saida')
  const [descricao, setDescricao] = useState('')
  const [valor,     setValor]     = useState('')
  const [categoria, setCategoria] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [l, r] = await Promise.all([
        financeiroApi.lancamentos({ de, ate }),
        financeiroApi.resumo({ de, ate }),
      ])
      setLancamentos(l); setResumo(r)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleLancar() {
    if (!descricao || !valor) return
    setSalvando(true)
    try {
      await financeiroApi.criarLancamento({
        tipo, descricao, valor: parseFloat(valor.replace(',', '.')),
        categoria: categoria || undefined, data: hoje,
      } as any)
      setDescricao(''); setValor(''); setCategoria('')
      setFormAberto(false); load()
    } finally { setSalvando(false) }
  }

  const saldo = resumo ? Number(resumo.total_entradas) - Number(resumo.total_saidas) : 0

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          {/* Filtro de período */}
          <div className="flex gap-3 items-center">
            <input type="date" value={de} onChange={e => setDe(e.target.value)}
              className="flex-1 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none" />
            <span className="text-steel text-sm">até</span>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)}
              className="flex-1 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none" />
            <button onClick={load} className="min-h-[44px] px-4 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold">
              Filtrar
            </button>
          </div>

          {/* Resumo */}
          {resumo && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 text-center">
                <p className="text-steel text-xs mb-1">Entradas</p>
                <p className="text-mint-green font-bold text-sm">R$ {Number(resumo.total_entradas).toFixed(2)}</p>
              </div>
              <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 text-center">
                <p className="text-steel text-xs mb-1">Saídas</p>
                <p className="text-red-400 font-bold text-sm">R$ {Number(resumo.total_saidas).toFixed(2)}</p>
              </div>
              <div className={`bg-deep-ocean border rounded-2xl p-4 text-center ${saldo >= 0 ? 'border-mint-green/30' : 'border-red-400/30'}`}>
                <p className="text-steel text-xs mb-1">Saldo</p>
                <p className={`font-bold text-sm ${saldo >= 0 ? 'text-mint-green' : 'text-red-400'}`}>
                  R$ {saldo.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Novo lançamento */}
          {formAberto ? (
            <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
              <p className="text-sea-foam font-semibold text-sm">Novo lançamento</p>
              <div className="grid grid-cols-2 gap-2">
                {(['saida', 'entrada'] as const).map(t => (
                  <button key={t} onClick={() => setTipo(t)}
                    className={`min-h-[44px] rounded-xl text-sm font-medium border transition-colors ${
                      tipo === t ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel'
                    }`}>
                    {t === 'entrada' ? '+ Entrada' : '- Saída'}
                  </button>
                ))}
              </div>
              <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição *"
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor R$"
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                <input value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Categoria"
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setFormAberto(false)} className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">Cancelar</button>
                <button onClick={handleLancar} disabled={salvando || !descricao || !valor}
                  className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Lançar'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setFormAberto(true)}
              className="min-h-[48px] border border-ocean-depth text-steel rounded-2xl text-sm hover:text-sea-foam hover:border-teal-current transition-colors">
              + Lançamento manual
            </button>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="flex flex-col gap-2">
              {lancamentos.map(l => (
                <div key={l.id} className="bg-deep-ocean border border-ocean-depth rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sea-foam text-sm font-medium">{l.descricao}</p>
                    <p className="text-steel text-xs">{new Date(l.data).toLocaleDateString('pt-BR')} {l.categoria ? `· ${l.categoria}` : ''}</p>
                  </div>
                  <p className={`font-semibold text-sm ${l.tipo === 'entrada' ? 'text-mint-green' : 'text-red-400'}`}>
                    {l.tipo === 'entrada' ? '+' : '-'} R$ {Number(l.valor).toFixed(2)}
                  </p>
                </div>
              ))}
              {lancamentos.length === 0 && <p className="text-center text-steel text-sm py-6">Nenhum lançamento no período</p>}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
