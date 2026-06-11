'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'

const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number) => v.toFixed(1) + '%'
const fmtDt = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

const CARD: React.CSSProperties = { background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px' }
const TH: React.CSSProperties = { padding: '8px 12px', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '9px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', borderBottom: '0.5px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }
const INPUT_S: React.CSSProperties = { background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', outline: 'none' }

function defaultPeriodo() {
  const n = new Date()
  return { inicio: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`, fim: n.toISOString().split('T')[0] }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{title}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function RelatoriosVendasPage() {
  const { inicio: di, fim: df } = defaultPeriodo()
  const [inicio, setInicio] = useState(di)
  const [fim, setFim] = useState(df)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = useCallback(async (i: string, f: string, pg: number) => {
    setLoading(true)
    try { setData(await relatoriosApi.vendas(i, f, pg)) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(inicio, fim, page) }, [])

  function handleFiltrar() { setPage(1); load(inicio, fim, 1) }

  const kpis = data?.kpis
  const fat = kpis?.faturamento ?? 0

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-10 flex flex-col gap-3">

        {/* Filtro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Período:</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>até</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <button onClick={handleFiltrar} style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.35)', color: '#0ef', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.28)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.15)' }}
          >Filtrar</button>
          {loading && <span className="w-4 h-4 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin inline-block" />}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
          {[
            { label: 'Faturamento',  value: kpis ? fmtR(fat)                : '—', accent: 'rgb(0,212,212)' },
            { label: 'Nº vendas',    value: kpis ? String(kpis.qtd_vendas)  : '—', accent: '#4ade80' },
            { label: 'Ticket médio', value: kpis ? fmtR(kpis.ticket_medio) : '—', accent: '#a78bfa' },
            { label: 'Nº itens',     value: kpis ? String(kpis.qtd_itens)  : '—', accent: '#facc15' },
          ].map(k => (
            <div key={k.label} style={{ ...CARD, borderLeft: `2px solid ${k.accent}`, padding: '12px 14px' }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginTop: '4px' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Por forma de pagamento */}
        <Section title="Por forma de pagamento">
          {!data?.por_forma?.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados no período</p>
            : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={TH}>Forma</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                <th style={{ ...TH, textAlign: 'right' }}>Nº vendas</th>
                <th style={{ ...TH, textAlign: 'right' }}>Part. %</th>
              </tr></thead>
              <tbody>
                {data.por_forma.map((f: any, i: number) => (
                  <tr key={i}>
                    <td style={TD}>{f.nome}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.85)' }}>{fmtR(f.total)}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{f.qtd}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <div style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${f.pct}%`, background: 'rgba(0,239,255,0.5)', borderRadius: '2px' }} />
                        </div>
                        <span>{fmtPct(f.pct)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </Section>

        {/* Por vendedor */}
        <Section title="Por vendedor">
          {!data?.por_vendedor?.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados no período</p>
            : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={TH}>Vendedor</th>
                <th style={{ ...TH, textAlign: 'right' }}>Faturamento</th>
                <th style={{ ...TH, textAlign: 'right' }}>Vendas</th>
                <th style={{ ...TH, textAlign: 'right' }}>Ticket</th>
                <th style={{ ...TH, textAlign: 'right' }}>PA</th>
                <th style={{ ...TH, textAlign: 'right' }}>Part. %</th>
              </tr></thead>
              <tbody>
                {data.por_vendedor.map((v: any, i: number) => (
                  <tr key={i}>
                    <td style={TD}>{v.nome}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.85)' }}>{fmtR(v.faturamento)}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{v.qtd_vendas}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{fmtR(v.ticket_medio)}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{v.pa.toFixed(1)}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{fmtPct(v.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </Section>

        {/* Lista de vendas */}
        <Section title={`Vendas do período ${data?.paginacao ? `(${data.paginacao.total})` : ''}`}>
          {!data?.vendas?.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem vendas no período</p>
            : <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>Data</th>
                  <th style={TH}>Cliente</th>
                  <th style={TH}>Vendedor</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                </tr></thead>
                <tbody>
                  {data.vendas.map((v: any) => (
                    <tr key={v.id}>
                      <td style={TD}>{fmtDt(v.criado_em)}</td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.5)' }}>{v.cliente ?? '—'}</td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.5)' }}>{v.vendedor ?? '—'}</td>
                      <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.85)' }}>{fmtR(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.paginacao && data.paginacao.total > data.paginacao.per_page && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}>
                  <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); load(inicio, fim, p) }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                    ← Anterior
                  </button>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: '28px' }}>pág. {page}</span>
                  <button disabled={page * data.paginacao.per_page >= data.paginacao.total}
                    onClick={() => { const p = page + 1; setPage(p); load(inicio, fim, p) }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
                    Próxima →
                  </button>
                </div>
              )}
            </>
          }
        </Section>

      </main>
    </>
  )
}
