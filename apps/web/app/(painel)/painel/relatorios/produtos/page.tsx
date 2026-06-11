'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'

const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number) => (v * 100).toFixed(1) + '%'

const CARD: React.CSSProperties = { background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px' }
const TH: React.CSSProperties = { padding: '8px 12px', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '9px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', borderBottom: '0.5px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }
const INPUT_S: React.CSSProperties = { background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', outline: 'none' }
const MOCK_BADGE = <span style={{ fontSize: '9px', background: 'rgba(251,191,36,0.18)', border: '0.5px solid rgba(251,191,36,0.4)', color: '#fbbf24', borderRadius: '20px', padding: '2px 8px', marginLeft: '8px', fontWeight: 600, letterSpacing: '0.04em' }}>Dados de exemplo</span>

function defaultPeriodo() {
  const n = new Date()
  return { inicio: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`, fim: n.toISOString().split('T')[0] }
}

const AGING_COLORS: Record<string, string> = { '0-30': '#4ade80', '31-60': '#facc15', '61-90': '#f97316', '+90': '#f87171' }

const MOCK_MARGEM = [
  { nome: 'Calça Jeans Skinny', custo: 49.90, preco: 119.90, margem: 0.584 },
  { nome: 'Blusa de Linho', custo: 28.00, preco: 79.90, margem: 0.650 },
  { nome: 'Vestido Floral', custo: 55.00, preco: 149.00, margem: 0.631 },
  { nome: 'Tênis Casual', custo: 89.00, preco: 199.90, margem: 0.555 },
  { nome: 'Bermuda Cargo', custo: 35.00, preco: 89.90, margem: 0.611 },
]

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

export default function RelatoriosProdutosPage() {
  const { inicio: di, fim: df } = defaultPeriodo()
  const [inicio, setInicio] = useState(di)
  const [fim, setFim] = useState(df)
  const [giro, setGiro] = useState<any>(null)
  const [aging, setAging] = useState<any>(null)
  const [cesta, setCesta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  const load = useCallback(async (i: string, f: string) => {
    setLoading(true)
    try {
      const [g, a, c] = await Promise.all([
        relatoriosApi.giroGrade(i, f),
        relatoriosApi.agingEstoque(),
        relatoriosApi.cesta(i, f),
      ])
      setGiro(g); setAging(a); setCesta(c)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(inicio, fim) }, [])

  const giroFiltrado = giro?.itens?.filter((it: any) =>
    !filtro || it.produto.toLowerCase().includes(filtro.toLowerCase())
  ) ?? []

  const agingBuckets = aging?.resumo ?? []
  const totalAging = agingBuckets.reduce((s: number, b: any) => s + Number(b.qtd_skus), 0)

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

        {/* Giro de grade */}
        <Section title="Giro de grade por SKU">
          <div style={{ padding: '10px 16px 0' }}>
            <input
              type="text" placeholder="Filtrar por produto..." value={filtro}
              onChange={e => setFiltro(e.target.value)} style={{ ...INPUT_S, width: '240px' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          </div>
          {!giroFiltrado.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados no período</p>
            : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>Produto</th>
                  <th style={TH}>Cor</th>
                  <th style={TH}>Tamanho</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Estoque</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Vendido</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Sell-through</th>
                </tr></thead>
                <tbody>
                  {giroFiltrado.map((it: any, i: number) => {
                    const st = it.sell_through ?? 0
                    const color = st >= 0.6 ? '#4ade80' : st >= 0.3 ? '#facc15' : '#f87171'
                    return (
                      <tr key={i}>
                        <td style={{ ...TD, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.produto}</td>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.45)' }}>{it.cor || '—'}</td>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.45)' }}>{it.tamanho || '—'}</td>
                        <td style={{ ...TD, textAlign: 'right' }}>{it.estoque_atual}</td>
                        <td style={{ ...TD, textAlign: 'right' }}>{it.qtd_vendida}</td>
                        <td style={{ ...TD, textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <div style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                              <div style={{ height: '100%', width: `${Math.min(st * 100, 100)}%`, background: color, borderRadius: '2px' }} />
                            </div>
                            <span style={{ color }}>{fmtPct(st)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          }
        </Section>

        {/* Aging de estoque */}
        <Section title="Aging de estoque (dias sem venda)">
          {agingBuckets.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', flexWrap: 'wrap' }}>
              {agingBuckets.map((b: any) => (
                <div key={b.bucket} style={{ ...CARD, padding: '8px 14px', borderLeft: `2px solid ${AGING_COLORS[b.bucket] ?? '#888'}` }}>
                  <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{b.bucket} dias</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: AGING_COLORS[b.bucket] ?? '#888' }}>{b.qtd_skus}</p>
                  <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>{totalAging ? ((b.qtd_skus / totalAging) * 100).toFixed(0) + '%' : '—'} dos SKUs</p>
                </div>
              ))}
            </div>
          )}
          {!aging?.itens?.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados</p>
            : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>Produto</th>
                  <th style={TH}>Cor</th>
                  <th style={TH}>Tamanho</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Estoque</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Dias parado</th>
                </tr></thead>
                <tbody>
                  {aging.itens.slice(0, 100).map((it: any, i: number) => {
                    const color = AGING_COLORS[it.bucket] ?? '#888'
                    return (
                      <tr key={i}>
                        <td style={{ ...TD, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.produto}</td>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.45)' }}>{it.cor || '—'}</td>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.45)' }}>{it.tamanho || '—'}</td>
                        <td style={{ ...TD, textAlign: 'right' }}>{it.estoque_atual}</td>
                        <td style={{ ...TD, textAlign: 'right', color }}>{it.dias_parado !== null ? it.dias_parado : '+90'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {aging.itens.length > 100 && (
                <p style={{ padding: '8px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Exibindo 100 de {aging.itens.length} itens</p>
              )}
            </div>
          }
        </Section>

        {/* Cesta de compras */}
        <Section title="Cesta de compras — pares mais comprados juntos">
          {!cesta?.pares?.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados no período</p>
            : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={TH}>Produto A</th>
                <th style={TH}>Produto B</th>
                <th style={{ ...TH, textAlign: 'right' }}>Combinações</th>
              </tr></thead>
              <tbody>
                {cesta.pares.map((par: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...TD, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{par.produto_a}</td>
                    <td style={{ ...TD, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(255,255,255,0.5)' }}>{par.produto_b}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.85)' }}>{par.vezes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </Section>

        {/* MOCK: Margem por produto */}
        <Section title="Margem por produto" badge={MOCK_BADGE}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={TH}>Produto</th>
              <th style={{ ...TH, textAlign: 'right' }}>Custo</th>
              <th style={{ ...TH, textAlign: 'right' }}>Preço</th>
              <th style={{ ...TH, textAlign: 'right' }}>Margem</th>
            </tr></thead>
            <tbody>
              {MOCK_MARGEM.map((m, i) => (
                <tr key={i}>
                  <td style={TD}>{m.nome}</td>
                  <td style={{ ...TD, textAlign: 'right', color: 'rgba(255,255,255,0.45)' }}>{fmtR(m.custo)}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>{fmtR(m.preco)}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <div style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${m.margem * 100}%`, background: '#4ade80', borderRadius: '2px' }} />
                      </div>
                      <span style={{ color: '#4ade80' }}>{(m.margem * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

      </main>
    </>
  )
}
