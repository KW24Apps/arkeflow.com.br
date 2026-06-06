'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { financeiroApi, type Lancamento, type ParcelaCriediario } from '@/lib/api/financeiro'
import { colaboradoresApi } from '@/lib/api/colaboradores'
import { promocoesApi, type Promocao } from '@/lib/api/promocoes'
import { useLojaStore } from '@/store/loja.store'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
}

const fmtR = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
function dayLabel(iso: string) {
  return DAY_LABELS[new Date(iso + 'T12:00:00').getDay()]
}

function promoStatus(p: Promocao): 'ativa' | 'expirada' {
  if (!p.fim) return 'ativa'
  return new Date(p.fim + 'T23:59:59') >= new Date() ? 'ativa' : 'expirada'
}

function promoDesc(p: Promocao) {
  const scope = p.aplicacao === 'todos' ? 'toda loja'
    : p.aplicacao === 'categoria' ? 'categoria' : 'produtos sel.'
  const venc = p.fim
    ? `até ${new Date(p.fim + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : 'sem vencimento'
  return `${p.tipo.replace(/_/g, ' ')} · ${scope} · ${venc}`
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, accentColor,
}: {
  label: string; value: string; sub: string; accentColor: string
}) {
  return (
    <div style={{ ...CARD, borderLeft: `2px solid ${accentColor}` }} className="p-3">
      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </p>
      <p className="font-bold mt-1" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{sub}</p>
    </div>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function PainelDashboard() {
  const hoje     = new Date().toISOString().split('T')[0]
  const nomeLoja = useLojaStore(s => s.nome_loja) ?? 'Loja'

  const [resumo,      setResumo]      = useState<any>(null)
  const [onlineAgora, setOnlineAgora] = useState<any[]>([])
  const [promoAtivas, setPromoAtivas] = useState<Promocao[]>([])
  const [contasRec,   setContasRec]   = useState<ParcelaCriediario[] | null>(null)
  const [semanaLanc,  setSemanaLanc]  = useState<Lancamento[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const sevenDaysAgo = last7Days()[0]
    Promise.allSettled([
      financeiroApi.resumo({ de: hoje, ate: hoje }),
      colaboradoresApi.onlineAgora(),
      promocoesApi.list(false),
      financeiroApi.contasReceber(),
      financeiroApi.lancamentos({ de: sevenDaysAgo, ate: hoje }),
    ]).then(([r, o, pr, cr, sl]) => {
      if (r.status  === 'fulfilled') setResumo(r.value)
      if (o.status  === 'fulfilled') setOnlineAgora(o.value)
      if (pr.status === 'fulfilled') setPromoAtivas(pr.value)
      if (cr.status === 'fulfilled') setContasRec(cr.value)
      if (sl.status === 'fulfilled') setSemanaLanc(sl.value)
    }).finally(() => setLoading(false))
  }, [])

  // KPI derivations
  const totalVendas  = resumo ? Number(resumo.total_entradas) : 0
  const qtdVendas    = resumo ? Number(resumo.qtd_entradas)   : 0
  const ticketMedio  = qtdVendas > 0 ? totalVendas / qtdVendas : 0

  const contasPend       = (contasRec ?? []).filter(c => !c.pago_em)
  const totalAReceber    = contasPend.reduce((s, c) => s + Number(c.valor), 0)
  const contasRecFailed  = contasRec === null && !loading

  // Weekly chart
  const days = last7Days()
  const weekData = days.map(day => ({
    day,
    label:   dayLabel(day),
    value:   semanaLanc
               .filter(l => l.tipo === 'entrada' && l.data?.slice(0, 10) === day)
               .reduce((s, l) => s + Number(l.valor), 0),
    isToday: day === hoje,
  }))
  const maxWeekVal = Math.max(...weekData.map(d => d.value), 1)

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-2.5">

        {/* ── A) Loja filter ───────────────────────────────────────────── */}
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max">
            <button
              className="px-3 h-7 text-[11px] font-medium rounded-full border"
              style={{ background: 'rgba(0,239,255,0.15)', borderColor: 'rgba(0,212,212,0.8)', color: 'rgb(0,212,212)' }}
            >
              Todas as lojas
            </button>
          </div>
        </div>

        {/* ── B) KPI row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KPICard
            label="Faturamento hoje"
            value={loading ? '—' : fmtR(totalVendas)}
            sub={loading ? '' : `${qtdVendas} venda${qtdVendas !== 1 ? 's' : ''}`}
            accentColor="rgb(0,212,212)"
          />
          <KPICard
            label="Ticket médio"
            value={loading ? '—' : ticketMedio > 0 ? fmtR(ticketMedio) : '—'}
            sub="geral do dia"
            accentColor="#4ade80"
          />
          <KPICard
            label="A receber"
            value={loading ? '—' : contasRecFailed ? '—' : fmtR(totalAReceber)}
            sub={loading || contasRecFailed ? '' : `${contasPend.length} parcela${contasPend.length !== 1 ? 's' : ''}`}
            accentColor="#facc15"
          />
          <div style={{ ...CARD, borderLeft: '2px solid rgba(255,255,255,0.2)' }} className="p-3">
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Online agora
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-bold" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>
                {loading ? '—' : onlineAgora.length}
              </p>
              {onlineAgora.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              )}
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>1 loja(s) ativa(s)</p>
          </div>
        </div>

        {/* ── C) Middle row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

          {/* Bar chart — vendas na semana */}
          <div style={CARD} className="lg:col-span-2 p-4">
            <p className="mb-3" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Vendas na semana
            </p>
            {!loading && semanaLanc.length === 0 ? (
              <p className="text-center py-6" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>dados em breve</p>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: '88px' }}>
                {weekData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${Math.max(4, (d.value / maxWeekVal) * 78)}px`,
                        background: d.isToday ? 'rgba(0,239,255,0.55)' : 'rgba(0,239,255,0.22)',
                      }}
                    />
                    <span style={{ fontSize: '8px', color: d.isToday ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.25)' }}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column: pagamento + por loja */}
          <div className="flex flex-col gap-2">
            <div style={CARD} className="p-4 flex-1">
              <p className="mb-3" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Pagamento
              </p>
              <p className="text-center py-4" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>dados em breve</p>
            </div>

            <div style={CARD} className="p-4">
              <p className="mb-2" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Por loja
              </p>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }} className="truncate mr-2">{nomeLoja}</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }} className="shrink-0">
                  {loading ? '—' : `${qtdVendas}v`}
                </span>
              </div>
              <p className="mt-1" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>multi-loja em breve</p>
            </div>
          </div>
        </div>

        {/* ── D) Bottom row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

          {/* Promoções ativas */}
          <div style={CARD} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Promoções ativas
              </p>
              <Link href="/painel/promocoes" className="text-electric-cyan hover:underline" style={{ fontSize: '10px' }}>
                Ver todas
              </Link>
            </div>
            {promoAtivas.length === 0 ? (
              <p className="text-center py-4" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Nenhuma promoção ativa</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {promoAtivas.slice(0, 4).map(p => {
                  const st = promoStatus(p)
                  return (
                    <div key={p.id} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }} className="truncate">{p.nome}</p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }} className="truncate">{promoDesc(p)}</p>
                      </div>
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={st === 'ativa'
                          ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
                          : { background: 'rgba(248,113,113,0.1)', color: 'rgba(248,113,113,0.5)' }
                        }
                      >
                        {st}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Online agora — list */}
          <div style={CARD} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              {onlineAgora.length > 0 && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />}
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Online agora
              </p>
            </div>
            {onlineAgora.length === 0 ? (
              <p className="text-center py-4" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Ninguém conectado</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {onlineAgora.map((u, i) => {
                  const min   = Math.floor(u.segundos_atras / 60)
                  const ativo = u.segundos_atras < 600
                  const tempo = min < 1 ? 'agora' : `${min}m`
                  return (
                    <div key={i} className="flex items-center justify-between" style={{ opacity: ativo ? 1 : 0.45 }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(0,212,212,0.15)', border: '0.5px solid rgba(0,212,212,0.3)' }}
                        >
                          <span className="text-electric-cyan font-semibold" style={{ fontSize: '10px' }}>
                            {u.nome?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }} className="truncate">{u.nome}</p>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                            {nomeLoja} · {u.nivel === 'dono_loja' ? 'Dono' : 'Vendedor'}
                          </p>
                        </div>
                      </div>
                      <span
                        className="shrink-0 ml-2"
                        style={{ fontSize: '10px', color: ativo ? 'rgba(74,222,128,0.8)' : 'rgba(255,255,255,0.25)' }}
                      >
                        {tempo}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </main>
    </>
  )
}
