'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtR  = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK  = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${Math.round(v)}`
const fmtN  = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const fmtPct= (v: number) => v.toFixed(1) + '%'

function agoMin(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff === 1) return 'há 1 min'
  return `há ${diff} min`
}

function fmtHora(ts: string): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const TIPO_LABEL: Record<string, string> = {
  desconto_percentual: 'Desconto %',
  desconto_fixo:       'Desconto fixo',
  compre_ganhe:        'Compre & Ganhe',
  segunda_peca:        '2ª Peça',
  primeira_compra:     'Primeira compra',
}

const NIVEL_LABEL: Record<string, string> = {
  dono_loja:     'Gestor',
  gerente:       'Gerente',
  vendedor:      'Vendedor',
  caixa:         'Caixa',
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px',
}
const LBL9: React.CSSProperties = {
  fontSize: '9px', color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
}
const MOCK_BADGE = (
  <span style={{
    fontSize: '9px', background: 'rgba(234,179,8,0.12)', color: 'rgba(234,179,8,0.85)',
    border: '0.5px solid rgba(234,179,8,0.3)', borderRadius: '6px', padding: '2px 8px',
    letterSpacing: '0.05em',
  }}>Dados de exemplo</span>
)

// ── Sub-components ─────────────────────────────────────────────────────────────
function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ ...CARD, borderLeft: `2px solid ${accent}`, padding: '12px 14px' }}>
      <p style={LBL9}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.1, margin: '4px 0 2px' }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
    </div>
  )
}

function BarChart({ data, height = 90 }: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const showLabels = data.length <= 24 // show value labels only when bars are wide enough
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: `${height + (showLabels ? 18 : 0)}px` }}>
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / max) * height)
        const active = d.highlight ?? false
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 0 }}>
            {showLabels && d.value > 0 && (
              <span style={{ fontSize: '7px', color: active ? 'rgba(0,239,255,0.85)' : 'rgba(255,255,255,0.3)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {fmtK(d.value)}
              </span>
            )}
            {showLabels && d.value === 0 && <span style={{ marginBottom: '2px', fontSize: '7px' }} />}
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              height: `${barH}px`,
              background: active ? 'rgba(0,239,255,0.65)' : 'rgba(0,239,255,0.22)',
            }} />
            <span style={{ fontSize: '7px', color: active ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.22)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_MARGEM = { margem_bruta: 48.2, lucro_liq: 18.7, gmroi: 2.4 }
const MOCK_CANAIS = [
  { nome: 'Loja Física', pct: 68 }, { nome: 'E-commerce', pct: 22 }, { nome: 'Marketplace', pct: 10 },
]
const MOCK_LTV  = { ltv_medio: 1840, cac_medio: 95, ratio: 19.4 }
const MOCK_M2   = { vendas_m2: 3420, area_m2: 120, aluguel_pct: 8.4 }

type Periodo = 'hoje' | 'semana' | 'mes'

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router  = useRouter()
  const usuario = useAuthStore(s => s.usuario)

  useEffect(() => {
    if (usuario && usuario.nivel === 'vendedor') router.push('/painel/caixa')
  }, [usuario])

  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  const load = useCallback(async (p: Periodo) => {
    setLoading(true); setErro('')
    try { setData(await relatoriosApi.dashboard(p)) }
    catch { setErro('Não foi possível carregar os dados.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('hoje') }, [])

  function handlePeriodo(p: Periodo) { setPeriodo(p); load(p) }

  // ── Chart data ───────────────────────────────────────────────────────────────
  const kpis = data?.kpis
  const hoje  = new Date().toISOString().split('T')[0]
  const horaAtual = new Date().getHours()

  const chartData = (() => {
    if (!data?.faturamento_por_dia?.length && data?.granularity !== 'hour') return []
    if (data?.granularity === 'hour') {
      const porHora = new Map<number, number>(
        (data.faturamento_por_dia ?? []).map((d: any) => [Number(d.hora), Number(d.faturamento)])
      )
      return Array.from({ length: horaAtual + 1 }, (_, h) => ({
        label: `${String(h).padStart(2, '0')}h`,
        value: porHora.get(h) ?? 0,
        highlight: h === horaAtual,
      }))
    }
    // day granularity
    return (data.faturamento_por_dia ?? []).map((d: any) => {
      const [, m, day] = (d.dia as string).split('-')
      return {
        label: `${day}/${m}`,
        value: Number(d.faturamento),
        highlight: d.dia === hoje,
      }
    })
  })()

  const periodoLabel = periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta semana' : 'Este mês'

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-10 flex flex-col gap-3">

        {/* ── Toggle de período ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            background: 'rgba(8,18,30,0.6)',
            border: '0.5px solid rgba(255,255,255,0.09)',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}>
            {(['hoje', 'semana', 'mes'] as Periodo[]).map(p => {
              const active = periodo === p
              return (
                <button
                  key={p}
                  onClick={() => handlePeriodo(p)}
                  style={{
                    background: active ? 'rgba(0,239,255,0.18)' : 'transparent',
                    border: active ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid transparent',
                    color: active ? '#0ef' : 'rgba(255,255,255,0.38)',
                    borderRadius: '7px',
                    padding: '5px 16px',
                    fontSize: '12px',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 120ms',
                    outline: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)'
                  }}
                  onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.3)' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
                </button>
              )
            })}
          </div>
          {loading && <span className="w-4 h-4 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin inline-block" />}
        </div>

        {erro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.8)' }}>{erro}</p>}

        {/* ── KPIs principais ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
          <KPI label="Faturamento" value={kpis ? fmtR(kpis.faturamento) : '—'} sub={`${kpis?.qtd_vendas ?? 0} vendas`} accent="rgb(0,212,212)" />
          <KPI label="Ticket médio" value={kpis ? fmtR(kpis.ticket_medio) : '—'} sub="por venda" accent="#4ade80" />
          <KPI label="PA" value={kpis ? fmtN(kpis.pa) : '—'} sub="peças / venda" accent="#a78bfa" />
          <KPI label="Markdown" value={kpis ? fmtPct(kpis.markdown_pct) : '—'} sub="% de desconto" accent="#facc15" />
          <KPI label="Cashback gerado" value={kpis ? fmtR(kpis.cashback_gerado) : '—'} sub={`usado ${kpis ? fmtR(kpis.cashback_usado) : '—'}`} accent="rgba(100,220,160,0.9)" />
          <KPI label="A receber" value={data?.contas_receber ? fmtR(data.contas_receber.total) : '—'}
            sub={`${data?.contas_receber?.vencidas ?? 0} vencida(s)`} accent="rgba(248,113,113,0.8)" />
        </div>

        {/* ── Faturamento por período + Formas de pagamento ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
          <div style={{ ...CARD, padding: '16px' }}>
            <p style={{ ...LBL9, marginBottom: '2px' }}>
              Faturamento — {periodoLabel}
              {data?.granularity === 'hour' && <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>por hora</span>}
            </p>
            {!loading && chartData.length === 0
              ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>Sem vendas no período</p>
              : <div style={{ marginTop: '10px' }}><BarChart data={chartData} height={90} /></div>
            }
          </div>
          <div style={{ ...CARD, padding: '16px' }}>
            <p style={{ ...LBL9, marginBottom: '12px' }}>Por forma de pagamento</p>
            {loading ? null : !data?.por_forma?.length
              ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.por_forma.slice(0, 5).map((f: any, i: number) => {
                  const pct = kpis?.faturamento > 0 ? f.total / kpis.faturamento * 100 : 0
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{f.nome}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{fmtPct(pct)}</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(0,239,255,0.5)', borderRadius: '2px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            }
          </div>
        </div>

        {/* ── Top produtos + Top vendedores ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ ...CARD, padding: '16px' }}>
            <p style={{ ...LBL9, marginBottom: '2px' }}>Top produtos</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginBottom: '10px' }}>Faturamento no período</p>
            {loading ? null : !data?.top_produtos?.length
              ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {data.top_produtos.map((p: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i + 1}. {p.nome}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(0,239,255,0.8)', flexShrink: 0 }}>{fmtR(p.faturamento)}</span>
                  </div>
                ))}
              </div>
            }
          </div>
          <div style={{ ...CARD, padding: '16px' }}>
            <p style={{ ...LBL9, marginBottom: '2px' }}>Top vendedores</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginBottom: '10px' }}>Por vendedor atribuído à venda</p>
            {loading ? null : !data?.top_vendedores?.length
              ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {data.top_vendedores.map((v: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i + 1}. {v.nome}
                    </span>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: 'rgba(0,239,255,0.8)' }}>{fmtR(v.faturamento)}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>{v.qtd_vendas}Nv</span>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>

        {/* ── Blocos ao vivo ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>

          {/* Online agora */}
          <div style={{ ...CARD, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
              <p style={{ ...LBL9, margin: 0 }}>Online agora</p>
            </div>
            {loading ? null : !data?.online_agora?.length
              ? <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Ninguém online</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.online_agora.map((u: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {u.nome}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginLeft: '6px' }}>{agoMin(u.ultimo_acesso)}</span>
                  </div>
                ))}
              </div>
            }
          </div>

          {/* Promoções ativas */}
          <div style={{ ...CARD, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#facc15', display: 'inline-block', boxShadow: '0 0 6px rgba(250,204,21,0.7)' }} />
              <p style={{ ...LBL9, margin: 0 }}>Promoções ativas</p>
            </div>
            {loading ? null : !data?.promocoes_ativas?.length
              ? <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Nenhuma promoção ativa</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.promocoes_ativas.map((p: any, i: number) => (
                  <div key={i}>
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
                ))}
              </div>
            }
          </div>

          {/* Caixas do dia */}
          <div style={{ ...CARD, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(0,239,255,0.8)', display: 'inline-block', boxShadow: '0 0 6px rgba(0,239,255,0.5)' }} />
              <p style={{ ...LBL9, margin: 0 }}>Caixas do dia</p>
            </div>
            {loading ? null : !data?.caixas_dia?.length
              ? <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Nenhum caixa aberto</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.caixas_dia.map((c: any, i: number) => (
                  <div key={i} style={{ borderBottom: i < data.caixas_dia.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: i < data.caixas_dia.length - 1 ? '6px' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.operador}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(0,239,255,0.85)', flexShrink: 0, marginLeft: '6px' }}>{fmtR(c.valor_rodando)}</span>
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>desde {fmtHora(c.aberto_em)}</p>
                  </div>
                ))}
              </div>
            }
          </div>

        </div>

        {/* ── MOCK cards ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>

          {/* Margem & GMROI */}
          <div style={{ ...CARD, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={LBL9}>Margem bruta</p>
              {MOCK_BADGE}
            </div>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(100,220,160,0.9)' }}>{MOCK_MARGEM.margem_bruta}%</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Lucro liq. {MOCK_MARGEM.lucro_liq}%</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>GMROI {MOCK_MARGEM.gmroi}×</p>
          </div>

          {/* Canais */}
          <div style={{ ...CARD, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={LBL9}>Canais</p>
              {MOCK_BADGE}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {MOCK_CANAIS.map(c => (
                <div key={c.nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{c.nome}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{c.pct}%</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '2px' }}>
                    <div style={{ height: '100%', width: `${c.pct}%`, background: 'rgba(0,239,255,0.4)', borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LTV / CAC */}
          <div style={{ ...CARD, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={LBL9}>LTV / CAC</p>
              {MOCK_BADGE}
            </div>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(0,239,255,0.9)' }}>{MOCK_LTV.ratio}×</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>LTV {fmtR(MOCK_LTV.ltv_medio)}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>CAC {fmtR(MOCK_LTV.cac_medio)}</p>
          </div>

          {/* Vendas / m² */}
          <div style={{ ...CARD, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={LBL9}>Vendas / m²</p>
              {MOCK_BADGE}
            </div>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#facc15' }}>{fmtR(MOCK_M2.vendas_m2)}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{MOCK_M2.area_m2} m² · aluguel {MOCK_M2.aluguel_pct}%</p>
          </div>

        </div>
      </main>
    </>
  )
}
