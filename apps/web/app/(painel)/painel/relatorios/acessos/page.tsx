'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { relatoriosApi } from '@/lib/api/relatorios'

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

const MOTIVO_LABEL: Record<string, string> = {
  manual:      'Saída manual',
  substituido: 'Substituído',
  expirado:    'Inatividade',
}

export default function RelatoriosAcessosPage() {
  const { inicio: di, fim: df } = defaultPeriodo()
  const [inicio,     setInicio]     = useState(di)
  const [fim,        setFim]        = useState(df)
  const [usuarioId,  setUsuarioId]  = useState('')
  const [plataforma, setPlataforma] = useState('')
  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async (i: string, f: string, uid: string, plat: string) => {
    setLoading(true)
    try { setData(await relatoriosApi.acessos(i, f, uid || undefined, plat || undefined)) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(di, df, '', '') }, [])

  function handleFiltrar() { load(inicio, fim, usuarioId, plataforma) }

  const kpis   = data?.kpis
  const maxHora = data?.porHora?.length ? Math.max(...data.porHora.map((h: any) => h.total)) : 0
  const horaMap: Record<number, number> = {}
  if (data?.porHora) for (const h of data.porHora) horaMap[h.hora] = h.total

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-10 flex flex-col gap-3">

        {/* Filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Período:</span>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>até</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={INPUT_S}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)} style={INPUT_S}>
            <option value="">Todos os colaboradores</option>
            {data?.colaboradores?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <select value={plataforma} onChange={e => setPlataforma(e.target.value)} style={INPUT_S}>
            <option value="">Todas as plataformas</option>
            <option value="web">Web</option>
            <option value="mobile">App</option>
          </select>
          <button onClick={handleFiltrar}
            style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.35)', color: '#0ef', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.28)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,239,255,0.15)' }}
          >Filtrar</button>
          {loading && <span className="w-4 h-4 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin inline-block" />}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
          {[
            { label: 'Total de logins',  value: kpis ? String(kpis.total_logins)    : '—', accent: 'rgb(0,212,212)' },
            { label: 'Usuários ativos',  value: kpis ? String(kpis.usuarios_ativos) : '—', accent: '#4ade80' },
            { label: 'Logins web',       value: kpis ? String(kpis.logins_web)      : '—', accent: '#a78bfa' },
            { label: 'Logins app',       value: kpis ? String(kpis.logins_mobile)   : '—', accent: '#0ef' },
          ].map(k => (
            <div key={k.label} style={{ ...CARD, borderLeft: `2px solid ${k.accent}`, padding: '12px 14px' }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginTop: '4px' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Bar chart: Logins por hora */}
        <Section title="Logins por hora do dia">
          <div style={{ padding: '8px 16px 12px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px', minWidth: '600px' }}>
              {Array.from({ length: 24 }, (_, hora) => {
                const total  = horaMap[hora] ?? 0
                const height = maxHora > 0 ? Math.max(2, Math.round((total / maxHora) * 80)) : 0
                return (
                  <div key={hora} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div
                      title={`${hora}h: ${total} login${total !== 1 ? 's' : ''}`}
                      style={{
                        width: '100%',
                        height: `${total > 0 ? height : 2}px`,
                        background: total > 0 ? 'rgba(0,239,255,0.6)' : 'rgba(255,255,255,0.05)',
                        borderRadius: '3px 3px 0 0',
                      }}
                    />
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', lineHeight: 1 }}>
                      {hora}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Section>

        {/* Top colaboradores */}
        <Section title="Top colaboradores">
          {!data?.topUsuarios?.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem dados no período</p>
            : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={TH}>Colaborador</th>
                <th style={{ ...TH, textAlign: 'right' }}>Nº Logins</th>
              </tr></thead>
              <tbody>
                {data.topUsuarios.map((u: any, i: number) => (
                  <tr key={i}>
                    <td style={TD}>{u.nome}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'rgba(0,239,255,0.85)' }}>{u.logins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </Section>

        {/* Log detalhado */}
        <Section title={`Registros do período${data?.logs ? ` (${data.logs.length})` : ''}`}>
          {!data?.logs?.length
            ? <p style={{ padding: '20px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Sem registros no período</p>
            : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>Data/Hora</th>
                  <th style={TH}>Colaborador</th>
                  <th style={TH}>Plataforma</th>
                  <th style={TH}>Tipo</th>
                  <th style={TH}>Motivo</th>
                </tr></thead>
                <tbody>
                  {data.logs.map((l: any, i: number) => (
                    <tr key={i}>
                      <td style={TD}>{fmtDt(l.criado_em)}</td>
                      <td style={TD}>{l.nome}</td>
                      <td style={TD}>
                        {l.plataforma ? (
                          <span style={l.plataforma === 'mobile'
                            ? { fontSize: '9px', background: 'rgba(0,239,255,0.1)', color: '#0ef', borderRadius: '9999px', padding: '2px 8px' }
                            : { fontSize: '9px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', borderRadius: '9999px', padding: '2px 8px' }
                          }>
                            {l.plataforma === 'mobile' ? 'app' : 'web'}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ ...TD, color: l.tipo === 'login' ? 'rgba(100,220,160,0.85)' : 'rgba(255,255,255,0.4)' }}>
                        {l.tipo === 'login' ? '▶ Login' : '◀ Logout'}
                      </td>
                      <td style={{ ...TD, color: 'rgba(255,255,255,0.4)' }}>
                        {l.motivo ? (MOTIVO_LABEL[l.motivo] ?? l.motivo) : '—'}
                      </td>
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
