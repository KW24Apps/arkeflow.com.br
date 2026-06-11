'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const fmtPct = (v: number) => v.toFixed(1) + '%'

function defaultPeriodo() {
  const n = new Date()
  return {
    inicio: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`,
    fim: n.toISOString().split('T')[0],
  }
}

const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px',
}
const LBL9: React.CSSProperties = {
  fontSize: '9px', color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
}
const INPUT_S: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', padding: '6px 10px', fontSize: '12px',
  color: 'rgba(255,255,255,0.8)', outline: 'none',
}
const MOCK_BADGE = (
  <span style={{
    fontSize: '9px', background: 'rgba(234,179,8,0.12)', color: 'rgba(234,179,8,0.85)',
    border: '0.5px solid rgba(234,179,8,0.3)', borderRadius: '6px', padding: '2px 8px',
    letterSpacing: '0.05em',
  }}>Dados de exemplo</span>
)

function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ ...CARD, borderLeft: `2px solid ${accent}`, padding: '12px 14px' }}>
      <p style={LBL9}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.1, margin: '4px 0 2px' }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
    </div>
  )
}

function BarChart({ data, height = 80 }: { data: { label: string; value: number; today?: boolean }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${height}px` }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', height: '100%' }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0',
            height: `${Math.max(3, (d.value / max) * (height - 14))}px`,
            background: d.today ? 'rgba(0,239,255,0.6)' : 'rgba(0,239,255,0.22)',
          }} />
          <span style={{ fontSize: '8px', color: d.today ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.25)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_MARGEM = { margem_bruta: 48.2, lucro_liq: 18.7, gmroi: 2.4 }
const MOCK_CANAIS = [
  { nome: 'Loja Física', pct: 68 }, { nome: 'E-commerce', pct: 22 }, { nome: 'Marketplace', pct: 10 },
]
const MOCK_LTV = { ltv_medio: 1840, cac_medio: 95, ratio: 19.4 }
const MOCK_M2 = { vendas_m2: 3420, area_m2: 120, aluguel_pct: 8.4 }

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const usuario = useAuthStore(s => s.usuario)

  useEffect(() => {
    if (usuario && usuario.nivel === 'vendedor') router.push('/painel/caixa')
  }, [usuario])

  const { inicio: di, fim: df } = defaultPeriodo()
  const [inicio, setInicio] = useState(di)
  const [fim, setFim] = useState(df)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const load = useCallback(async (i: string, f: string) => {
    setLoading(true); setErro('')
    try { setData(await relatoriosApi.dashboard(i, f)) }
    catch { setErro('Não foi possível carregar os dados.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(inicio, fim) }, [])

  function handleFiltrar() { load(inicio, fim) }

  const kpis = data?.kpis
  const hoje = new Date().toISOString().split('T')[0]

  const chartData = (() => {
    if (!data?.faturamento_por_dia?.length) return []
    return data.faturamento_por_dia.map((d: any) => ({
      label: new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: d.faturamento,
      today: d.dia === hoje,
    }))
  })()

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-10 flex flex-col gap-3">

        {/* ── Filtro de período ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Período:</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>até</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <button onClick={handleFiltrar} style={{
            background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.35)',
            color: '#0ef', borderRadius: '8px', padding: '6px 14px', fontSize: '12px',
            cursor: 'pointer', fontWeight: 500,
            transition: 'background 120ms, border-color 120ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.28)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.15)' }}
          >Filtrar</button>
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

        {/* ── Faturamento por dia + Formas de pagamento ─────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
          <div style={{ ...CARD, padding: '16px' }}>
            <p style={{ ...LBL9, marginBottom: '12px' }}>Faturamento por dia</p>
            {!loading && chartData.length === 0
              ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>Sem vendas no período</p>
              : <BarChart data={chartData} height={90} />
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
            <p style={{ ...LBL9, marginBottom: '12px' }}>Top produtos</p>
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
            <p style={{ ...LBL9, marginBottom: '12px' }}>Top vendedores</p>
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
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>{v.qtd_vendas}v</span>
                    </div>
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
