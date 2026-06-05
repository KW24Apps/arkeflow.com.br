'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { caixaApi, type TurnoCaixa, type VendaTurno } from '@/lib/api/caixa'

export default function VendasTurnoPage() {
  const [turno,      setTurno]      = useState<TurnoCaixa | null>(null)
  const [vendas,     setVendas]     = useState<VendaTurno[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    caixaApi.vendas()
      .then(r => { setTurno(r.turno); setVendas(r.vendas) })
      .finally(() => setCarregando(false))
  }, [])

  const fmt    = (v?: string | number) => `R$ ${Number(v ?? 0).toFixed(2)}`
  const fmtDt  = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const fmtDia = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  const totalGeral = vendas.reduce((s, v) => s + Number(v.total), 0)

  return (
    <>
      <TopBar title="Vendas do Turno" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-2xl flex flex-col gap-4">

          <Link href="/painel/caixa" className="text-electric-cyan text-sm hover:underline self-start">
            ← Voltar ao Caixa
          </Link>

          {/* Resumo do turno */}
          {turno && (
            <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-steel text-xs">Turno de {fmtDia(turno.aberto_em)}</p>
                <p className="text-sea-foam text-sm font-medium mt-0.5">
                  {vendas.length} venda{vendas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-mint-green font-bold text-xl">{fmt(totalGeral)}</p>
            </div>
          )}

          {carregando && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!carregando && vendas.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3">
              <span className="text-4xl opacity-30">📋</span>
              <p className="text-steel text-sm">Nenhuma venda neste turno.</p>
            </div>
          )}

          {vendas.map(v => (
            <div key={v.id} className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sea-foam text-sm font-medium truncate">
                  {v.cliente_nome ?? 'Sem cliente'}
                </p>
                <p className="text-steel text-xs mt-0.5">
                  {fmtDt(v.criado_em)} · {v.total_itens} item{v.total_itens !== 1 ? 'ns' : ''}
                </p>
              </div>
              <p className="text-mint-green font-semibold text-base shrink-0">{fmt(v.total)}</p>
            </div>
          ))}

        </div>
      </main>
    </>
  )
}
