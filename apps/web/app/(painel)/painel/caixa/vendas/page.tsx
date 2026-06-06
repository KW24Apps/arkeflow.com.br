'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { caixaApi, type TurnoCaixa, type VendaTurno, type PagamentoResumo, type VendaDetalhe } from '@/lib/api/caixa'

// ─────────────────────────────────────────────────────────────────────────────
// Data transformation
// ─────────────────────────────────────────────────────────────────────────────

interface FormaResumo {
  nome:  string
  tipo:  string
  total: number
  count: number
}

function buildSummary(vendas: VendaTurno[]) {
  const totalGeral     = vendas.reduce((s, v) => s + Number(v.total), 0)
  const totalTransacoes = vendas.length

  const porFormaMap: Record<string, FormaResumo> = {}
  for (const v of vendas) {
    for (const p of v.pagamentos ?? []) {
      if (!porFormaMap[p.forma_nome]) {
        porFormaMap[p.forma_nome] = { nome: p.forma_nome, tipo: p.tipo, total: 0, count: 0 }
      }
      porFormaMap[p.forma_nome].total += Number(p.valor)
      porFormaMap[p.forma_nome].count++
    }
  }
  const porForma = Object.values(porFormaMap).sort((a, b) => b.total - a.total)

  return { totalGeral, totalTransacoes, porForma }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt    = (v?: string | number | null) => `R$ ${Number(v ?? 0).toFixed(2)}`
const fmtHr  = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fmtDia = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function formaColor(tipo: string): string {
  switch (tipo) {
    case 'dinheiro':       return 'text-mint-green border-mint-green/30 bg-mint-green/10'
    case 'pix':            return 'text-electric-cyan border-electric-cyan/30 bg-electric-cyan/10'
    case 'cartao_credito': return 'text-purple-400 border-purple-400/30 bg-purple-400/10'
    case 'cartao_debito':  return 'text-teal-400 border-teal-400/30 bg-teal-400/10'
    case 'crediario':      return 'text-orange-400 border-orange-400/30 bg-orange-400/10'
    default:               return 'text-steel border-ocean-depth bg-ocean-depth/50'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Accordion row (lazy loads detail on first expand)
// ─────────────────────────────────────────────────────────────────────────────

function VendaRow({ venda }: { venda: VendaTurno }) {
  const [aberto,  setAberto]  = useState(false)
  const [detalhe, setDetalhe] = useState<VendaDetalhe | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)

  async function toggle() {
    if (!aberto && !detalhe) {
      setLoadingDetalhe(true)
      try {
        const d = await caixaApi.vendaDetalhe(venda.id)
        setDetalhe(d)
      } finally { setLoadingDetalhe(false) }
    }
    setAberto(v => !v)
  }

  return (
    <div className="border border-ocean-depth rounded-2xl overflow-hidden bg-midnight">
      {/* Row summary */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-deep-ocean/60 active:bg-deep-ocean transition-colors"
      >
        {/* Time */}
        <span className="text-steel text-xs w-12 shrink-0">{fmtHr(venda.criado_em)}</span>

        {/* Customer */}
        <div className="flex-1 min-w-0">
          <p className="text-sea-foam text-sm font-medium truncate">
            {venda.cliente_nome ?? 'Cliente não identificado'}
          </p>
          {venda.cliente_telefone && (
            <p className="text-steel text-xs truncate">{venda.cliente_telefone}</p>
          )}
          {venda.vendedor_nome && (
            <p className="text-steel text-xs truncate">
              <span className="opacity-60">Vendedor: </span>{venda.vendedor_nome}
            </p>
          )}
        </div>

        {/* Payment chips */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {(venda.pagamentos ?? []).slice(0, 3).map((p, i) => (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-lg border ${formaColor(p.tipo)}`}>
              {p.forma_nome}
            </span>
          ))}
        </div>

        {/* Items count */}
        <span className="text-steel text-xs w-16 text-right shrink-0 hidden md:block">
          {venda.total_itens} item{venda.total_itens !== 1 ? 'ns' : ''}
        </span>

        {/* Total */}
        <span className="text-mint-green font-semibold text-sm w-24 text-right shrink-0">
          {fmt(venda.total)}
        </span>

        {/* Expand icon */}
        <span className={`text-steel text-xs ml-1 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Expanded detail */}
      {aberto && (
        <div className="border-t border-ocean-depth px-5 py-4 flex flex-col gap-4 bg-deep-ocean/40">
          {loadingDetalhe && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {detalhe && (
            <>
              {/* Items */}
              <div>
                <p className="text-steel text-[10px] uppercase tracking-wider mb-2">Itens</p>
                <div className="flex flex-col gap-1.5">
                  {detalhe.itens?.map((item, i) => {
                    const attrs = Object.values(item.atributos_json ?? {}).join(' / ')
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-sea-foam truncate">{item.produto_nome}</span>
                          {attrs && <span className="text-steel ml-2 text-xs">{attrs}</span>}
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-3">
                          <span className="text-steel text-xs">{item.quantidade}×</span>
                          {Number(item.desconto_item) > 0 && (
                            <span className="text-mint-green text-xs">−{fmt(item.desconto_item)}</span>
                          )}
                          <span className="text-sea-foam text-xs w-20 text-right">
                            {fmt(Number(item.preco_unitario) * item.quantidade - Number(item.desconto_item))}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Vendedor */}
              {detalhe.vendedor_nome && (
                <div>
                  <p className="text-steel text-[10px] uppercase tracking-wider mb-1">Vendedor</p>
                  <p className="text-sea-foam text-sm">{detalhe.vendedor_nome}</p>
                </div>
              )}

              {/* Payments */}
              <div>
                <p className="text-steel text-[10px] uppercase tracking-wider mb-2">Pagamento</p>
                <div className="flex flex-wrap gap-2">
                  {detalhe.pagamentos?.map((p: any, i: number) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${formaColor(p.tipo)}`}>
                      <span className="font-medium">{p.forma_nome}</span>
                      <span>{fmt(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function VendasTurnoPage() {
  const [turno,      setTurno]      = useState<TurnoCaixa | null>(null)
  const [vendas,     setVendas]     = useState<VendaTurno[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    caixaApi.vendas()
      .then(r => { setTurno(r.turno); setVendas(r.vendas) })
      .finally(() => setCarregando(false))
  }, [])

  const { totalGeral, totalTransacoes, porForma } = buildSummary(vendas)

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-5">
          <Link href="/painel/caixa" className="text-electric-cyan text-sm hover:underline">
            ← Voltar ao Caixa
          </Link>
          {turno && (
            <p className="text-steel text-xs">
              Turno de {fmtDia(turno.aberto_em)}
              {turno.fechado_em ? ` até ${fmtDia(turno.fechado_em)}` : ' (em andamento)'}
            </p>
          )}
        </div>

        {carregando && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!carregando && (
          <div className="flex flex-col gap-6">

            {/* ── Summary Header ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Total Revenue */}
              <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                <p className="text-steel text-xs uppercase tracking-wider mb-2">Receita Total</p>
                <p className="text-mint-green font-black text-3xl">{fmt(totalGeral)}</p>
                <p className="text-steel text-xs mt-1">{totalTransacoes} transação{totalTransacoes !== 1 ? 'ões' : ''}</p>
              </div>

              {/* Payment method breakdown */}
              <div className="sm:col-span-2 bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                <p className="text-steel text-xs uppercase tracking-wider mb-3">Por Forma de Pagamento</p>
                {porForma.length === 0 ? (
                  <p className="text-steel text-sm">Sem dados de pagamento.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {porForma.map(f => (
                      <div key={f.nome} className={`flex flex-col px-4 py-2 rounded-xl border ${formaColor(f.tipo)}`}>
                        <span className="text-xs font-medium">{f.nome}</span>
                        <span className="text-base font-bold mt-0.5">{fmt(f.total)}</span>
                        <span className="text-[10px] opacity-70">{f.count} transação{f.count !== 1 ? 'ões' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Sales List ────────────────────────────────────────────── */}
            {vendas.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-3 opacity-40">
                <span className="text-5xl">📋</span>
                <p className="text-steel text-sm">Nenhuma venda neste turno.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Table header */}
                <div className="hidden sm:flex items-center gap-3 px-5 pb-1 text-[10px] text-steel uppercase tracking-wider">
                  <span className="w-12">Hora</span>
                  <span className="flex-1">Cliente</span>
                  <span className="hidden sm:block w-36">Forma</span>
                  <span className="hidden md:block w-16 text-right">Itens</span>
                  <span className="w-24 text-right">Total</span>
                  <span className="w-5" />
                </div>

                {vendas.map(v => <VendaRow key={v.id} venda={v} />)}
              </div>
            )}

          </div>
        )}

      </main>
    </>
  )
}
