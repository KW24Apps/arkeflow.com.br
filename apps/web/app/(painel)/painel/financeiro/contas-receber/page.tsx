'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { financeiroApi, type ParcelaCriediario } from '@/lib/api/financeiro'

export default function ContasReceberPage() {
  const [parcelas, setParcelas] = useState<ParcelaCriediario[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState<'pendente' | 'vencido' | 'pago'>('pendente')
  const [baixando, setBaixando] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setParcelas(await financeiroApi.contasReceber(filtro)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filtro])

  async function handlePagar(id: string) {
    if (!confirm('Registrar pagamento desta parcela?')) return
    setBaixando(id)
    try {
      await financeiroApi.pagarParcela(id)
      setParcelas(p => p.filter(x => x.id !== id))
    } finally { setBaixando(null) }
  }

  const total = parcelas.reduce((s, p) => s + Number(p.valor), 0)

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">
        <div className="max-w-lg flex flex-col gap-4">

          {/* Filtro de status */}
          <div className="flex gap-2">
            {(['pendente', 'vencido', 'pago'] as const).map(s => (
              <button key={s} onClick={() => setFiltro(s)}
                className={`flex-1 min-h-[44px] rounded-xl text-sm font-medium border capitalize transition-colors ${
                  filtro === s ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel hover:text-sea-foam'
                }`}>
                {s === 'pendente' ? 'Em Aberto' : s === 'vencido' ? 'Vencidas' : 'Pagas'}
              </button>
            ))}
          </div>

          {parcelas.length > 0 && (
            <div className="bg-deep-ocean border border-ocean-depth rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-steel text-sm">{parcelas.length} parcela(s)</span>
              <span className="text-sea-foam font-semibold">R$ {total.toFixed(2)}</span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
          ) : parcelas.length === 0 ? (
            <p className="text-center text-steel text-sm py-8">Nenhuma parcela {filtro === 'pendente' ? 'em aberto' : filtro}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {parcelas.map(p => (
                <div key={p.id} className={`bg-deep-ocean border rounded-2xl p-4 ${p.status === 'vencido' ? 'border-red-500/40' : 'border-ocean-depth'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sea-foam font-medium text-sm">{p.cliente_nome || 'Cliente não identificado'}</p>
                      <p className="text-steel text-xs">{p.cliente_telefone || ''}</p>
                      <p className="text-steel text-xs mt-1">
                        Parcela {p.numero_parcela} · Vence {new Date(p.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-base ${p.status === 'vencido' ? 'text-red-400' : 'text-sea-foam'}`}>
                        R$ {Number(p.valor).toFixed(2)}
                      </p>
                      {filtro !== 'pago' && (
                        <button onClick={() => handlePagar(p.id)} disabled={baixando === p.id}
                          className="mt-2 min-h-[36px] px-3 bg-mint-green text-midnight rounded-lg text-xs font-semibold disabled:opacity-40">
                          {baixando === p.id ? '...' : 'Recebido'}
                        </button>
                      )}
                      {filtro === 'pago' && p.pago_em && (
                        <p className="text-mint-green text-xs mt-1">
                          Pago em {new Date(p.pago_em + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
