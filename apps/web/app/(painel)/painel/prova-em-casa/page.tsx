'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api/client'

interface ProvaItem {
  versao_id:      string
  produto_id:     string
  nome:           string
  atributos:      Record<string, string>
  preco_unitario: number
  quantidade:     number
}

interface ProvaRemota {
  id:            string
  cliente_id:    string | null
  cliente_nome:  string | null
  criado_por:    string | null
  nome_vendedor: string | null
  criado_em:     string
  prazo:         string | null
  status:        'em_prova' | 'finalizada' | 'cancelada'
  itens:         ProvaItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtR(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function fmtData(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function agoMin(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function diffDias(prazoIso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const prazo = new Date(prazoIso)
  prazo.setHours(0, 0, 0, 0)
  return Math.round((prazo.getTime() - today.getTime()) / 86400000)
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background:     'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border:         '0.5px solid rgba(255,255,255,0.09)',
  borderRadius:   '10px',
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProvaEmCasaPage() {
  const [view,            setView]            = useState<'grid' | 'builder'>('grid')
  const [provas,          setProvas]          = useState<ProvaRemota[]>([])
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)
  const [alertaDias,      setAlertaDias]      = useState(2)
  const [provaHabilitada, setProvaHabilitada] = useState(true)

  async function loadData(soft = false) {
    soft ? setRefreshing(true) : setLoading(true)
    try {
      const sysRes = await api.get('/dados-loja/sistema')
      setAlertaDias(Number(sysRes.data.prova_alerta_dias ?? 2))
      setProvaHabilitada(sysRes.data.prova_habilitada ?? false)
      try {
        const { data } = await api.get<ProvaRemota[]>('/provas-em-casa')
        setProvas(data)
      } catch {
        setProvas([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ── Computed stats ────────────────────────────────────────────────────────────
  const emProva       = provas.filter(p => p.status === 'em_prova').length
  const vencidas      = provas.filter(p => p.prazo && diffDias(p.prazo) < 0).length
  const venceProximo  = provas.filter(p => p.prazo && diffDias(p.prazo) >= 0 && diffDias(p.prazo) <= alertaDias).length
  const totalProdutos = provas.reduce((sum, p) => sum + p.itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0), 0)

  // ── Prazo badge ───────────────────────────────────────────────────────────────
  function prazoBadge(prazo: string | null) {
    if (!prazo) return null
    const diff = diffDias(prazo)
    const data = fmtData(prazo)
    if (diff < 0) return {
      bg: 'rgba(240,100,100,0.08)', border: 'rgba(240,100,100,0.25)', color: 'rgba(240,100,100,0.85)',
      text: `Vencida · ${data}`,
    }
    if (diff <= alertaDias) return {
      bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', color: 'rgba(234,179,8,0.9)',
      text: `Vence em ${diff} dia${diff !== 1 ? 's' : ''} · ${data}`,
    }
    return {
      bg: 'rgba(100,220,160,0.08)', border: 'rgba(100,220,160,0.25)', color: 'rgba(100,220,160,0.85)',
      text: `Vence em ${diff} dias · ${data}`,
    }
  }

  function cardLeftBorder(prazo: string | null): string {
    if (!prazo) return 'none'
    const diff = diffDias(prazo)
    if (diff < 0) return '2px solid rgba(240,100,100,0.6)'
    if (diff <= alertaDias) return '2px solid rgba(234,179,8,0.5)'
    return '2px solid rgba(100,220,160,0.3)'
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar />

      {view === 'grid' ? (

        /* ══════════════════════════════════ GRID VIEW ══════════════════════════ */
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 pb-24 flex flex-col gap-4">

          {/* Module disabled notice */}
          {!loading && !provaHabilitada && (
            <div style={{ ...CARD, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
              <ClipboardList size={36} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Módulo desativado</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', maxWidth: '280px', lineHeight: 1.6 }}>
                Ative em Configurações › Sistema › Prova em Casa.
              </p>
              <Link
                href="/painel/configuracoes/sistema"
                style={{ fontSize: '12px', color: '#0ef', background: 'rgba(0,239,255,0.1)', border: '0.5px solid rgba(0,239,255,0.25)', borderRadius: '8px', padding: '7px 16px', textDecoration: 'none' }}
              >
                Ir para Configurações
              </Link>
            </div>
          )}

          {(loading || provaHabilitada) && <>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                Produtos enviados para prova em casa. Gerencie devoluções e finalizações.
              </p>
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
              >
                <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
                Atualizar
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {([
                { label: 'Em prova',           value: String(emProva),      color: '#0ef' },
                { label: 'Vencem hoje/amanhã', value: String(venceProximo), color: 'rgba(234,179,8,0.9)' },
                { label: 'Vencidas',           value: String(vencidas),     color: 'rgba(240,100,100,0.85)' },
                { label: 'Total em produtos',  value: fmtR(totalProdutos),  color: 'rgba(255,255,255,0.75)' },
              ] as const).map(({ label, value, color }) => (
                <div key={label} style={{ ...CARD, padding: '14px 16px' }}>
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>{label}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Loading / empty / list */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '64px' }}>
                <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : provas.filter(p => p.status === 'em_prova').length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '60px' }}>
                <ClipboardList size={40} style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Nenhuma prova em casa</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', maxWidth: '240px' }}>
                  Crie uma prova para registrar produtos levados por um cliente.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {provas.filter(p => p.status === 'em_prova').map(p => {
                  const tot    = p.itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
                  const badge  = prazoBadge(p.prazo)
                  const border = cardLeftBorder(p.prazo)
                  return (
                    <div
                      key={p.id}
                      className="cursor-pointer active:scale-[0.99]"
                      style={{ ...CARD, padding: '14px 16px', borderLeft: border, display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 120ms' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,18,30,0.48)' }}
                    >
                      {/* Left */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.cliente_nome ?? 'Sem cliente'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                          Criada em {fmtData(p.criado_em)} · por {p.nome_vendedor ?? '—'}
                        </p>
                      </div>
                      {/* Middle */}
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                        {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}
                      </p>
                      {/* Right */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        {badge && (
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', background: badge.bg, border: `0.5px solid ${badge.border}`, color: badge.color, whiteSpace: 'nowrap' }}>
                            {badge.text}
                          </span>
                        )}
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0ef' }}>{fmtR(tot)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </>}

          {/* FAB — só aparece quando módulo habilitado */}
          {provaHabilitada && (
            <button
              onClick={() => setView('builder')}
              className="fixed bottom-6 right-6 z-50 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              style={{ width: '48px', height: '48px', background: 'rgba(0,239,255,0.9)', borderRadius: '50%', color: '#0a0a1a', fontSize: '24px', fontWeight: 700, border: 'none', outline: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
              onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,239,255,0.35)' }}
              onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
            >+</button>
          )}

        </main>

      ) : (

        /* ════════════════════════════════ BUILDER STUB ═════════════════════════ */
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Breadcrumb */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={() => setView('grid')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            >
              <ArrowLeft size={14} />
              Prova em Casa
            </button>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Nova prova em casa</span>
          </div>

          {/* Stub placeholder */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
            <div style={{ ...CARD, padding: '40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', maxWidth: '360px' }}>
              <ClipboardList size={36} style={{ color: 'rgba(0,239,255,0.35)' }} />
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Criação de Prova em Casa</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>Em construção — será implementada em breve.</p>
              <button
                onClick={() => setView('grid')}
                style={{ marginTop: '8px', background: 'none', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
              >
                <ArrowLeft size={13} />
                Voltar
              </button>
            </div>
          </div>

        </main>
      )}
    </>
  )
}
