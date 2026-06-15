'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtR = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${Math.round(v)}`

function agoMin(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff === 1) return 'há 1 min'
  return `há ${diff} min`
}
function fmtHora(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const TIPO_LABEL: Record<string, string> = {
  desconto_percentual: 'Desconto %',
  desconto_fixo:       'Desconto fixo',
  compre_ganhe:        'Compre & Ganhe',
  segunda_peca:        '2ª Peça',
  primeira_compra:     'Primeira compra',
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px',
}
const ZONE: React.CSSProperties = {
  background: 'rgba(8,18,30,0.32)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '12px',
}
const ZONE_HDR: React.CSSProperties = {
  padding: '9px 14px',
  borderBottom: '0.5px solid rgba(255,255,255,0.07)',
  display: 'flex', alignItems: 'center',
  fontSize: '9px', color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
}
const LBL9: React.CSSProperties = {
  fontSize: '9px', color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
}
const DIVIDER: React.CSSProperties = { borderTop: '0.5px solid rgba(255,255,255,0.05)' }
const MOCK_BADGE = (
  <span style={{
    fontSize: '9px', background: 'rgba(234,179,8,0.12)', color: 'rgba(234,179,8,0.85)',
    border: '0.5px solid rgba(234,179,8,0.3)', borderRadius: '6px', padding: '2px 8px',
  }}>Dados de exemplo</span>
)

const LIVE_H = 178   // fixed height for live blocks + top-list inner scroll areas
const MOCK_MARGEM = { margem_bruta: 48.2, lucro_liq: 18.7, gmroi: 2.4 }

// ── Sub-components ─────────────────────────────────────────────────────────────
function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ ...CARD, borderLeft: `2px solid ${accent}`, padding: '12px 14px' }}>
      <p style={LBL9}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.1, margin: '4px 0 2px' }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
    </div>
  )
}

const MIN_BAR_W = 44

function BarChart({ data, height = 96 }: { data: { label: string; value: number; highlight?: boolean }[]; height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const minContentW = data.length * (MIN_BAR_W + 4)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${height + 30}px`, minWidth: `${minContentW}px` }}>
        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / max) * height)
          const active = d.highlight ?? false
          return (
            <div key={i} style={{ flex: 1, minWidth: `${MIN_BAR_W}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <span style={{ fontSize: '8px', color: active ? '#0ef' : 'rgba(255,255,255,0.35)', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                {d.value > 0 ? fmtK(d.value) : ' '}
              </span>
              <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: `${barH}px`, background: active ? 'rgba(0,239,255,0.65)' : 'rgba(0,239,255,0.22)' }} />
              <span style={{ fontSize: '8px', color: active ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.22)', marginTop: '3px', whiteSpace: 'nowrap' }}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type Periodo = 'hoje' | 'semana' | 'mes'

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router  = useRouter()
  const usuario = useAuthStore(s => s.usuario)

  useEffect(() => {
    if (usuario && usuario.nivel === 'vendedor') router.push('/painel/caixa')
  }, [usuario])

  const [periodo, setPeriodo]       = useState<Periodo>('hoje')
  const [data, setData]             = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [erro, setErro]             = useState('')
  const [filtroOnline, setFiltroOnline] = useState<'web' | 'mobile' | 'todos'>('web')

  const load = useCallback(async (p: Periodo) => {
    setLoading(true); setErro('')
    try { setData(await relatoriosApi.dashboard(p)) }
    catch { setErro('Não foi possível carregar os dados.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('hoje') }, [])
  function handlePeriodo(p: Periodo) { setPeriodo(p); load(p) }

  // Chart data
  const hoje      = new Date().toISOString().split('T')[0]
  const horaAtual = new Date().getHours()
  const chartData = (() => {
    if (!data) return []
    if (data.granularity === 'hour') {
      const porHora = new Map<number, number>(
        (data.faturamento_por_dia ?? []).map((d: any) => [Number(d.hora), Number(d.faturamento)])
      )
      const horaStart = Math.min(
        data.hora_inicio !== null && data.hora_inicio !== undefined ? Number(data.hora_inicio) : horaAtual,
        horaAtual,
      )
      return Array.from({ length: horaAtual - horaStart + 1 }, (_, i) => {
        const h = horaStart + i
        return { label: `${String(h).padStart(2, '0')}h`, value: porHora.get(h) ?? 0, highlight: h === horaAtual }
      })
    }
    return (data.faturamento_por_dia ?? []).map((d: any) => {
      const [, m, day] = (d.dia as string).split('-')
      return { label: `${day}/${m}`, value: Number(d.faturamento), highlight: d.dia === hoje }
    })
  })()

  const periodoLabel = periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta semana' : 'Este mês'

  return (
    <>
      <TopBar />
      <main className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 pb-10 flex flex-col gap-3">

        {erro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.8)' }}>{erro}</p>}

        {/* ═══ ZONE 1 — Hoje ao vivo ══════════════════════════════════════════ */}
        <div style={ZONE}>
          <div style={ZONE_HDR}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 5px #4ade80', flexShrink: 0, marginRight: '6px' }} />
            Hoje ao vivo
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', padding: '12px 12px 8px' }}>
            <KPI
              label="Faturamento"
              value={data?.kpis_hoje ? fmtR(data.kpis_hoje.faturamento) : '—'}
              sub={`${data?.kpis_hoje?.qtd_vendas ?? 0} vendas`}
              accent="rgb(0,212,212)"
            />
            <KPI
              label="Ticket médio"
              value={data?.kpis_hoje ? fmtR(data.kpis_hoje.ticket_medio) : '—'}
              sub="por venda"
              accent="#4ade80"
            />
            <KPI
              label="Vendas"
              value={data?.kpis_hoje ? String(data.kpis_hoje.qtd_vendas) : '—'}
              sub="hoje"
              accent="#a78bfa"
            />
            <KPI
              label="A receber"
              value={data?.a_receber ? fmtR(data.a_receber.total) : '—'}
              sub={`${data?.a_receber?.vencidas ?? 0} vencida(s)`}
              accent="rgba(248,113,113,0.8)"
            />
          </div>

          {/* Live blocks — fixed height, scroll inside */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '4px 12px 12px' }}>

            {/* Online agora */}
            <div style={{ ...CARD, height: `${LIVE_H}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px 6px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80', flexShrink: 0 }} />
                <p style={{ ...LBL9, margin: 0, flex: 1 }}>Online agora</p>
                {(['web', 'mobile'] as const).map(p => {
                  const active = filtroOnline === p
                  return (
                    <button key={p} onClick={() => setFiltroOnline(filtroOnline === p ? 'todos' : p)} style={{
                      background: active ? 'rgba(0,239,255,0.15)' : 'transparent',
                      border: `0.5px solid ${active ? 'rgba(0,239,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: active ? '#0ef' : 'rgba(255,255,255,0.3)',
                      borderRadius: '20px', padding: '2px 7px', fontSize: '9px',
                      cursor: 'pointer', outline: 'none',
                    }}>
                      {p === 'mobile' ? 'App' : 'Web'}
                    </button>
                  )
                })}
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px 14px' }}>
                {(() => {
                  const onlinesFiltrados = (data?.online_agora ?? []).filter((u: any) =>
                    filtroOnline === 'todos' || u.plataforma === filtroOnline
                  )
                  return !onlinesFiltrados.length
                    ? <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Ninguém online</p>
                    : onlinesFiltrados.map((u: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nome}</span>
                          <span style={{
                            fontSize: '9px', padding: '1px 5px', borderRadius: '20px', flexShrink: 0,
                            background: u.plataforma === 'mobile' ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.06)',
                            border: `0.5px solid ${u.plataforma === 'mobile' ? 'rgba(0,239,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
                            color: u.plataforma === 'mobile' ? '#0ef' : 'rgba(255,255,255,0.35)',
                          }}>{u.plataforma === 'mobile' ? 'app' : 'web'}</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                            · login {new Date(u.login_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{`⌨️ ${new Date(u.ultimo_acesso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}</span>
                      </div>
                    ))
                })()}
              </div>
            </div>

            {/* Promoções ativas */}
            <div style={{ ...CARD, height: `${LIVE_H}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px 6px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#facc15', boxShadow: '0 0 5px rgba(250,204,21,0.7)', flexShrink: 0 }} />
                <p style={{ ...LBL9, margin: 0 }}>Promoções ativas</p>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px 14px' }}>
                {!data?.promocoes_ativas?.length
                  ? <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Nenhuma ativa</p>
                  : data.promocoes_ativas.map((p: any, i: number) => (
                    <div key={i} style={{ marginBottom: '9px' }}>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                        {TIPO_LABEL[p.tipo] ?? p.tipo}
                        {(p.inicio || p.fim) && (
                          <span style={{ marginLeft: '6px' }}>
                            {p.inicio ? new Date(p.inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                            {p.inicio && p.fim ? '–' : ''}
                            {p.fim ? new Date(p.fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Caixas do dia */}
            <div style={{ ...CARD, height: `${LIVE_H}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px 6px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(0,239,255,0.8)', boxShadow: '0 0 5px rgba(0,239,255,0.5)', flexShrink: 0 }} />
                <p style={{ ...LBL9, margin: 0 }}>Caixas do dia</p>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px 14px' }}>
                {!data?.caixas_dia?.length
                  ? <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Nenhum caixa aberto</p>
                  : data.caixas_dia.map((c: any, i: number) => (
                    <div key={i} style={{ marginBottom: '9px', paddingBottom: i < data.caixas_dia.length - 1 ? '9px' : 0, borderBottom: i < data.caixas_dia.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '6px' }}>{c.operador}</span>
                        <span style={{ fontSize: '12px', color: 'rgba(0,239,255,0.85)', flexShrink: 0 }}>{fmtR(c.valor_rodando)}</span>
                      </div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>desde {fmtHora(c.aberto_em)}</p>
                    </div>
                  ))
                }
              </div>
            </div>

          </div>
        </div>

        {/* ═══ ZONE 2 — Análise por período ═══════════════════════════════════ */}
        <div style={ZONE}>

          {/* Header + toggle */}
          <div style={{ ...ZONE_HDR, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(0,239,255,0.7)', display: 'inline-block', boxShadow: '0 0 5px rgba(0,239,255,0.4)', flexShrink: 0 }} />
              Análise por período
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {loading && <span className="w-3 h-3 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin inline-block" />}
              <div style={{ display: 'inline-flex', background: 'rgba(8,18,30,0.6)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '7px', padding: '2px', gap: '1px' }}>
                {(['hoje', 'semana', 'mes'] as Periodo[]).map(p => {
                  const active = periodo === p
                  return (
                    <button
                      key={p}
                      onClick={() => handlePeriodo(p)}
                      style={{
                        background: active ? 'rgba(0,239,255,0.18)' : 'transparent',
                        border: active ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid transparent',
                        color: active ? '#0ef' : 'rgba(255,255,255,0.5)',
                        borderRadius: '5px',
                        padding: '3px 11px',
                        fontSize: '11px',
                        fontWeight: active ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 120ms',
                        outline: 'none',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
                      onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.3)' }}
                      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                    >
                      {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Faturamento chart — full width */}
          <div style={{ padding: '14px 16px', ...DIVIDER }}>
            <p style={{ ...LBL9, marginBottom: '2px' }}>
              Faturamento — {periodoLabel}
              {data?.granularity === 'hour' && (
                <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>por hora</span>
              )}
            </p>
            {loading
              ? null
              : chartData.length === 0
                ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>Sem vendas no período</p>
                : <div style={{ marginTop: '10px' }}><BarChart data={chartData} height={96} /></div>
            }
          </div>

          {/* Forma de pagamento — horizontal scrolling blocks */}
          <div style={DIVIDER}>
            <p style={{ ...LBL9, padding: '12px 16px 0' }}>Por forma de pagamento</p>
            {!data?.por_forma?.length
              ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', padding: '8px 16px 12px' }}>—</p>
              : <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '8px', padding: '8px 16px 12px', minWidth: 'max-content' }}>
                  {data.por_forma.map((f: any, i: number) => (
                    <div key={i} style={{ ...CARD, padding: '10px 14px', minWidth: '120px', flexShrink: 0 }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>{fmtR(f.total)}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(0,239,255,0.7)', marginTop: '4px' }}>{Number(f.pct).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            }
          </div>

          {/* Top produtos + Top vendedores — fixed height lists */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', ...DIVIDER }}>

            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px 5px', flexShrink: 0 }}>
                <p style={{ ...LBL9, marginBottom: '2px' }}>Top produtos</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Faturamento no período</p>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: `${LIVE_H}px`, padding: '6px 14px 10px' }}>
                {!data?.top_produtos?.length
                  ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados</p>
                  : data.top_produtos.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {p.nome}</span>
                      <span style={{ fontSize: '11px', color: 'rgba(0,239,255,0.8)', flexShrink: 0 }}>{fmtR(p.faturamento)}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px 5px', flexShrink: 0 }}>
                <p style={{ ...LBL9, marginBottom: '2px' }}>Top vendedores</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Por vendedor atribuído à venda</p>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: `${LIVE_H}px`, padding: '6px 14px 10px' }}>
                {!data?.top_vendedores?.length
                  ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados</p>
                  : data.top_vendedores.map((v: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {v.nome}</span>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', color: 'rgba(0,239,255,0.8)' }}>{fmtR(v.faturamento)}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>{v.qtd_vendas}Nv</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

          </div>

          {/* A pagar + Margem/GMROI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', padding: '12px', ...DIVIDER }}>

            <div style={{ ...CARD, padding: '14px' }}>
              <p style={{ ...LBL9, marginBottom: '8px' }}>A pagar / Despesas</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#f87171', lineHeight: 1.1 }}>
                {fmtR(data?.despesas?.total ?? 0)}
              </p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>
                {data?.despesas?.qtd ?? 0} lançamento(s) no período
              </p>
            </div>

            <div style={{ ...CARD, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={LBL9}>Margem bruta</p>
                {MOCK_BADGE}
              </div>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(100,220,160,0.9)', lineHeight: 1.1 }}>{MOCK_MARGEM.margem_bruta}%</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>Lucro liq. {MOCK_MARGEM.lucro_liq}%</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>GMROI {MOCK_MARGEM.gmroi}×</p>
            </div>

          </div>

        </div>

      </main>
    </>
  )
}
