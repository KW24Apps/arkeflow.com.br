'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'

const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDt = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const CARD: React.CSSProperties = { background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px' }
const TH: React.CSSProperties = { padding: '8px 12px', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '9px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', borderBottom: '0.5px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }
const INPUT_S: React.CSSProperties = { background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', outline: 'none' }
const MOCK_BADGE = <span style={{ fontSize: '9px', background: 'rgba(251,191,36,0.18)', border: '0.5px solid rgba(251,191,36,0.4)', color: '#fbbf24', borderRadius: '20px', padding: '2px 8px', marginLeft: '8px', fontWeight: 600, letterSpacing: '0.04em' }}>Dados de exemplo</span>

const STATUS_COLOR: Record<string, string> = {
  pendente: '#facc15', pago: '#4ade80', parcial: '#f97316', cancelado: '#f87171', em_aberto: '#facc15', quitado: '#4ade80',
}

function defaultPeriodo() {
  const n = new Date()
  return { inicio: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`, fim: n.toISOString().split('T')[0] }
}

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{title}</p>
        {badge}
      </div>
      <div>{children}</div>
    </div>
  )
}

const MOCK_DRE = [
  { label: 'Faturamento bruto',  value: 48320.00, indent: false, positive: true },
  { label: 'Devoluções / descontos', value: -1240.00, indent: true, positive: false },
  { label: 'Faturamento líquido', value: 47080.00, indent: false, positive: true },
  { label: 'CMV (custo mercadoria)', value: -18900.00, indent: true, positive: false },
  { label: 'Lucro bruto', value: 28180.00, indent: false, positive: true },
  { label: 'Despesas operacionais', value: -12400.00, indent: true, positive: false },
  { label: 'EBITDA estimado', value: 15780.00, indent: false, positive: true },
]

export default function RelatoriosFinanceiroPage() {
  const { inicio: di, fim: df } = defaultPeriodo()
  const [inicio, setInicio] = useState(di)
  const [fim, setFim] = useState(df)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (i: string, f: string) => {
    setLoading(true)
    try { setData(await relatoriosApi.financeiro(i, f)) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(inicio, fim) }, [])

  const cr = data?.contas_receber ?? []
  const cb = data?.cashback ?? {}
  const turnos = data?.turnos ?? []

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-10 flex flex-col gap-3">

        {/* Filtro período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Período:</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>até</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <button onClick={() => load(inicio, fim)}
            style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.35)', color: '#0ef', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.28)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.15)' }}
          >Filtrar</button>
          {loading && <span className="w-4 h-4 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin inline-block" />}
        </div>

        {/* Cashback summary */}
        <Section title="Cashback">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', padding: '12px 16px' }}>
            {[
              { label: 'Gerado no período', value: cb.gerado ?? 0, color: '#4ade80' },
              { label: 'Usado no período',  value: cb.usado ?? 0,  color: '#f97316' },
              { label: 'Saldo atual clientes', value: cb.saldo_total ?? 0, color: 'rgba(0,239,255,0.9)' },
              { label: 'Vence em 30 dias',  value: cb.expirando_30d ?? 0, color: '#f87171' },
            ].map(k => (
              <div key={k.label} style={{ ...CARD, borderLeft: `2px solid ${k.color}`, padding: '10px 12px' }}>
                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.label}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: k.color, marginTop: '4px' }}>{fmtR(k.value)}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Contas a receber (crediário) */}
        <Section title="Contas a receber — crediário">
          {!cr.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados no período</p>
            : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={TH}>Status</th>
                <th style={{ ...TH, textAlign: 'right' }}>Parcelas</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>
                {cr.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={TD}>
                      <span style={{ fontSize: '9px', background: `${STATUS_COLOR[row.status] ?? '#888'}22`, border: `0.5px solid ${STATUS_COLOR[row.status] ?? '#888'}66`, color: STATUS_COLOR[row.status] ?? '#888', borderRadius: '20px', padding: '2px 8px', fontWeight: 600 }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}>{row.qtd}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.85)' }}>{fmtR(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </Section>

        {/* Fluxo de caixa por turno */}
        <Section title="Fluxo de caixa por turno">
          {!turnos.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem turnos no período</p>
            : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={TH}>Abertura</th>
                <th style={TH}>Fechamento</th>
                <th style={{ ...TH, textAlign: 'right' }}>Fundo inicial</th>
                <th style={{ ...TH, textAlign: 'right' }}>Dinheiro</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total vendas</th>
              </tr></thead>
              <tbody>
                {turnos.map((t: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...TD, color: 'rgba(255,255,255,0.5)' }}>{fmtDt(t.aberto_em)}</td>
                    <td style={{ ...TD, color: 'rgba(255,255,255,0.5)' }}>{t.fechado_em ? fmtDt(t.fechado_em) : <span style={{ color: '#4ade80' }}>Aberto</span>}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{fmtR(t.fundo_caixa ?? 0)}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{fmtR(t.total_dinheiro ?? 0)}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.85)' }}>{fmtR(t.total_vendas ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </Section>

        {/* MOCK: DRE simplificada */}
        <Section title="DRE simplificada" badge={MOCK_BADGE}>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {MOCK_DRE.map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < MOCK_DRE.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', paddingLeft: row.indent ? '16px' : '0' }}>{row.label}</span>
                <span style={{ fontSize: '13px', fontWeight: row.indent ? 400 : 600, color: row.positive ? 'rgba(0,239,255,0.9)' : '#f87171' }}>{fmtR(row.value)}</span>
              </div>
            ))}
          </div>
        </Section>

      </main>
    </>
  )
}
