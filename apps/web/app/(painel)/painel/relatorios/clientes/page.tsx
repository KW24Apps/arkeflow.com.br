'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'

const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDt = (s: string) => new Date(s).toLocaleDateString('pt-BR')

const CARD: React.CSSProperties = { background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px' }
const TH: React.CSSProperties = { padding: '8px 12px', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '9px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', borderBottom: '0.5px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }
const INPUT_S: React.CSSProperties = { background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', outline: 'none' }
const MOCK_BADGE = <span style={{ fontSize: '9px', background: 'rgba(251,191,36,0.18)', border: '0.5px solid rgba(251,191,36,0.4)', color: '#fbbf24', borderRadius: '20px', padding: '2px 8px', marginLeft: '8px', fontWeight: 600, letterSpacing: '0.04em' }}>Dados de exemplo</span>

const SEG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Campeões':         { bg: 'rgba(0,239,255,0.12)', border: 'rgba(0,239,255,0.4)',  text: '#0ef' },
  'Leais':            { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.4)', text: '#4ade80' },
  'Novos':            { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.4)', text: '#a78bfa' },
  'Em risco':         { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', text: '#f97316' },
  'Perdidos':         { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.4)', text: '#f87171' },
  'Em desenvolvimento':{ bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.4)', text: '#facc15' },
}

function defaultPeriodo() {
  const n = new Date()
  return { inicio: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`, fim: n.toISOString().split('T')[0] }
}

function SegBadge({ seg }: { seg: string }) {
  const c = SEG_COLORS[seg] ?? { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.6)' }
  return (
    <span style={{ fontSize: '9px', background: c.bg, border: `0.5px solid ${c.border}`, color: c.text, borderRadius: '20px', padding: '2px 8px', fontWeight: 600 }}>
      {seg}
    </span>
  )
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

export default function RelatoriosClientesPage() {
  const { inicio: di, fim: df } = defaultPeriodo()
  const [inicio, setInicio] = useState(di)
  const [fim, setFim] = useState(df)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (i: string, f: string) => {
    setLoading(true)
    try { setData(await relatoriosApi.clientesRfm(i, f)) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(inicio, fim) }, [])

  const segmentos: Record<string, number> = {}
  const clientes: any[] = data?.clientes ?? []
  clientes.forEach((c: any) => { segmentos[c.segmento] = (segmentos[c.segmento] ?? 0) + 1 })
  const totalClientes = clientes.length

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

        {/* RFM segment chips */}
        {totalClientes > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(segmentos).sort((a, b) => b[1] - a[1]).map(([seg, count]) => {
              const c = SEG_COLORS[seg] ?? { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.5)' }
              return (
                <div key={seg} style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: '10px', padding: '8px 14px' }}>
                  <p style={{ fontSize: '9px', color: c.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{seg}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: c.text, marginTop: '2px' }}>{count}</p>
                  <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{((count / totalClientes) * 100).toFixed(0)}%</p>
                </div>
              )
            })}
          </div>
        )}

        {/* RFM clientes tabela */}
        <Section title={`Análise RFM — clientes${totalClientes ? ` (${totalClientes})` : ''}`}>
          {!clientes.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados no período</p>
            : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>Cliente</th>
                  <th style={TH}>Segmento</th>
                  <th style={{ ...TH, textAlign: 'right' }}>R (recência)</th>
                  <th style={{ ...TH, textAlign: 'right' }}>F (frequência)</th>
                  <th style={{ ...TH, textAlign: 'right' }}>M (monetário)</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Score</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total gasto</th>
                  <th style={TH}>Última compra</th>
                </tr></thead>
                <tbody>
                  {clientes.map((c: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...TD, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome ?? '—'}</td>
                      <td style={TD}><SegBadge seg={c.segmento} /></td>
                      <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.7)' }}>{c.r_score}</td>
                      <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.7)' }}>{c.f_score}</td>
                      <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.7)' }}>{c.m_score}</td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{c.rfm_score}</td>
                      <td style={{ ...TD, textAlign: 'right' }}>{fmtR(c.total_gasto)}</td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.45)' }}>{fmtDt(c.ultima_compra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </Section>


      </main>
    </>
  )
}
