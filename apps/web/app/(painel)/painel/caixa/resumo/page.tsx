'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useCaixaStore } from '@/store/caixa.store'
import { useAuthStore } from '@/store/auth.store'
import { vendasApi, type VendaHistoricoItem } from '@/lib/api/vendas'

type DetailMap = Record<string, any>

const fmt   = (v?: number | string | null) => `R$ ${Number(v ?? 0).toFixed(2)}`
const fmtHr = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fmtTs = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR') + ' · ' +
  new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      <div
        style={{ background: 'rgba(8,18,30,0.96)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', maxWidth: '300px', width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, margin: '0 0 4px' }}>Cancelar venda?</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 16px' }}>Esta ação é irreversível.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '9px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>
            Voltar
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '9px', background: 'rgba(240,80,80,0.12)', border: '0.5px solid rgba(240,80,80,0.28)', borderRadius: '8px', color: '#f05050', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── VendaRow ─────────────────────────────────────────────────────────────────

const GRID  = '50px 1fr 1fr 80px 40px 80px 20px'
const BADGE: React.CSSProperties = {
  fontSize: '9px',
  background: 'rgba(255,255,255,0.06)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '2px 7px',
  color: 'rgba(255,255,255,0.45)',
  whiteSpace: 'nowrap',
  display: 'inline-block',
}
const ITEM_LABEL: React.CSSProperties = {
  fontSize: '9px',
  color: 'rgba(255,255,255,0.25)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

function VendaRow({
  venda,
  detail,
  onExpand,
}: {
  venda:    VendaHistoricoItem
  detail?:  any
  onExpand: () => void
}) {
  const [aberto,        setAberto]        = useState(false)
  const [hov,           setHov]           = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const pagamentos: any[] = detail?.pagamentos ?? []

  function toggle() {
    if (!aberto && !detail) onExpand()
    setAberto(v => !v)
  }

  return (
    <>
      <div
        style={{
          background: 'rgba(8,18,30,0.35)',
          border: `0.5px solid ${hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: '8px',
          marginBottom: '4px',
          cursor: 'pointer',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* Summary row */}
        <div
          style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '10px 12px' }}
          onClick={toggle}
        >
          {/* HORA */}
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{fmtHr(venda.criado_em)}</span>

          {/* CLIENTE */}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {venda.cliente_nome ?? 'Não identificado'}
            </p>
            {venda.cliente_telefone && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{venda.cliente_telefone}</p>
            )}
          </div>

          {/* VENDEDOR */}
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {detail?.vendedor_nome ?? '—'}
          </span>

          {/* FORMA */}
          <div>
            {pagamentos.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</span>
            ) : pagamentos.length === 1 ? (
              <span style={BADGE}>{pagamentos[0].forma_nome}</span>
            ) : (
              <span style={BADGE}>{pagamentos.length} formas</span>
            )}
          </div>

          {/* ITENS */}
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
            {venda.total_itens}
          </span>

          {/* TOTAL */}
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, textAlign: 'right' }}>
            {fmt(venda.total)}
          </span>

          {/* CHEVRON */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ChevronDown
              size={13}
              style={{ color: 'rgba(255,255,255,0.3)', transition: 'transform 0.2s', transform: aberto ? 'rotate(180deg)' : 'none' }}
            />
          </div>
        </div>

        {/* Expanded panel */}
        {aberto && (
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!detail ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                <div className="w-5 h-5 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Itens — 3-column layout */}
                <div>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 88px', gap: '8px', marginBottom: '6px' }}>
                    <span style={ITEM_LABEL}>Produto</span>
                    <span style={{ ...ITEM_LABEL, textAlign: 'center' }}>Qtd</span>
                    <span style={{ ...ITEM_LABEL, textAlign: 'right' }}>Valor</span>
                  </div>
                  {(detail.itens ?? []).map((item: any, i: number) => {
                    const lineTotal = Number(item.preco_unitario) * item.quantidade - Number(item.desconto_item)
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 88px', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                        {/* Product name + attribute chips */}
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>{item.produto_nome}</span>
                          {Object.keys(item.atributos_json ?? {}).length > 0 && (
                            <span style={{ marginLeft: '6px' }}>
                              {Object.entries(item.atributos_json ?? {}).map(([key, val]: [string, any]) => (
                                <span key={key} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 7px', color: 'rgba(255,255,255,0.45)', marginRight: '4px', display: 'inline-block' }}>
                                  {key}: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{val}</span>
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                        {/* Quantity chip */}
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 7px', color: 'rgba(255,255,255,0.55)' }}>
                            {item.quantidade}
                          </span>
                        </div>
                        {/* Line total */}
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {fmt(lineTotal)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Pagamento */}
                <div>
                  <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Pagamento</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {(detail.pagamentos ?? []).map((p: any, i: number) => (
                      <span key={i} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 10px', color: 'rgba(255,255,255,0.6)' }}>
                        {p.forma_nome} · {fmt(p.valor)}
                        {p.tipo === 'dinheiro' && Number(p.troco) > 0 && ` · troco ${fmt(p.troco)}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                  {(['Emitir NF-e', 'Baixar XML', 'Enviar e-mail'] as const).map(label => (
                    <button key={label} disabled
                      style={{ padding: '5px 11px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed', opacity: 0.5 }}>
                      {label}
                    </button>
                  ))}
                  {detail.status === 'finalizada' && (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmCancel(true) }}
                      style={{ padding: '5px 11px', background: 'rgba(240,80,80,0.1)', border: '0.5px solid rgba(240,80,80,0.25)', borderRadius: '8px', fontSize: '11px', color: '#f05050', cursor: 'pointer' }}>
                      Cancelar venda
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {confirmCancel && (
        <ConfirmModal
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => setConfirmCancel(false)}
        />
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumoCaixaPage() {
  const { status, turno, carregar } = useCaixaStore()
  const authNome                    = useAuthStore(s => (s.usuario as any)?.nome ?? (s.usuario as any)?.username ?? null)
  const [vendas,     setVendas]     = useState<VendaHistoricoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [details,    setDetails]    = useState<DetailMap>({})

  // Always refresh caixa status on mount
  useEffect(() => { carregar() }, [])

  // Fetch vendas + eagerly load ALL sale details so aggregations are correct immediately
  useEffect(() => {
    if (status !== 'aberto' || !turno) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    const abertoEm = new Date(turno.aberto_em).getTime()
    vendasApi
      .historico({ de: turno.aberto_em, ...(turno.fechado_em ? { ate: turno.fechado_em } : {}) })
      .then(data => {
        const filtered = data.filter(v => new Date(v.criado_em).getTime() >= abertoEm)
        setVendas(filtered)
        // Fetch every sale detail in parallel so summary cards are fully populated on load
        return Promise.all(
          filtered.map(v =>
            vendasApi.get(v.id)
              .then(d => ({ id: v.id, d }))
              .catch(() => null)
          )
        )
      })
      .then(results => {
        const fetched: DetailMap = {}
        for (const r of results ?? []) {
          if (r) fetched[r.id] = r.d
        }
        setDetails(fetched)
      })
      .finally(() => setCarregando(false))
  }, [status, turno?.id])

  function handleExpand(id: string) {
    // Data is pre-loaded; this is a fallback for any race conditions
    if (details[id]) return
    vendasApi.get(id).then(d => setDetails(prev => ({ ...prev, [id]: d })))
  }

  // ── Aggregations ──
  const totalGeral = vendas.reduce((s, v) => s + Number(v.total), 0)

  const porFormaMap: Record<string, { nome: string; total: number; count: number }> = {}
  let vendasDinheiro = 0
  for (const d of Object.values(details)) {
    for (const p of (d.pagamentos ?? []) as any[]) {
      if (!porFormaMap[p.forma_nome]) porFormaMap[p.forma_nome] = { nome: p.forma_nome, total: 0, count: 0 }
      porFormaMap[p.forma_nome].total += Number(p.valor)
      porFormaMap[p.forma_nome].count++
      if (p.tipo === 'dinheiro') vendasDinheiro += Number(p.valor ?? 0)
    }
  }
  const porForma = Object.values(porFormaMap).sort((a, b) => b.total - a.total)

  // Cash drawer — sangrias/suprimentos read ONCE from turno (shift-level totals, not per-sale)
  const saldoInicial     = Number((turno as any)?.saldo_inicial     ?? 0)
  const totalSangrias    = Number((turno as any)?.total_sangrias     ?? 0)
  const totalSuprimentos = Number((turno as any)?.total_suprimentos  ?? 0)
  const esperadoGaveta   = saldoInicial + vendasDinheiro + totalSuprimentos - totalSangrias

  // ── Shared styles ──
  const CARD: React.CSSProperties = {
    background: 'rgba(8,18,30,0.48)',
    border: '0.5px solid rgba(255,255,255,0.09)',
    borderRadius: '10px',
    padding: '14px 16px',
  }
  const SEC_LABEL: React.CSSProperties = {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '8px',
    display: 'block',
  }
  const COL_HDR: React.CSSProperties = {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  }
  const META_ROW: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
  }
  const META_LABEL: React.CSSProperties = {
    fontSize: '11px', color: 'rgba(255,255,255,0.35)',
  }
  const META_VAL: React.CSSProperties = {
    fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums',
  }

  // ── Loading ──
  if (status === 'desconhecido' || (status === 'aberto' && carregando)) return (
    <>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  )

  // ── Caixa fechado / sem turno ──
  if (status !== 'aberto' || !turno) return (
    <>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <Lock size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, margin: 0 }}>Caixa fechado</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>Abra o caixa para ver o resumo do turno.</p>
      </div>
    </>
  )

  const nomeOp        = (turno as any)?.usuario_nome || authNome || '—'
  // Round to cents before color check — floating-point subtraction can yield -2e-14
  // at zero, which would incorrectly trigger the danger color.
  const gavetaArredondado = Math.round(esperadoGaveta * 100) / 100
  const gavetaColor       = gavetaArredondado < 0 ? 'rgba(240,130,130,0.9)' : 'rgba(100,220,160,0.95)'

  return (
    <>
    <TopBar />
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>

      {/* ── Section 1: Three summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>

        {/* Receita total — with operador/abertura folded in */}
        <div style={CARD}>
          <span style={SEC_LABEL}>Receita total</span>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: '0 0 2px' }}>
            {fmt(totalGeral)}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '0 0 10px' }}>
            {vendas.length} transação{vendas.length !== 1 ? 'ões' : ''}
          </p>
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: '8px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={META_ROW}>
              <span style={META_LABEL}>Operador</span>
              <span style={META_VAL}>{nomeOp}</span>
            </div>
            <div style={META_ROW}>
              <span style={META_LABEL}>Abertura</span>
              <span style={META_VAL}>{fmtTs(turno.aberto_em)}</span>
            </div>
          </div>
        </div>

        {/* Caixa em dinheiro */}
        <div style={CARD}>
          <span style={SEC_LABEL}>Caixa em dinheiro</span>
          <p style={{ fontSize: '22px', fontWeight: 700, color: gavetaColor, margin: '0 0 10px' }}>
            {fmt(gavetaArredondado)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {([
              { label: 'Saldo inicial',        value: saldoInicial,     color: 'rgba(255,255,255,0.5)'  },
              { label: '+ Vendas em dinheiro', value: vendasDinheiro,   color: 'rgba(100,220,160,0.8)'  },
              { label: '+ Suprimentos',        value: totalSuprimentos, color: 'rgba(100,220,160,0.8)'  },
              { label: '− Sangrias',           value: totalSangrias,    color: 'rgba(240,130,130,0.80)' },
            ] as const).map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{r.label}</span>
                <span style={{ fontSize: '11px', color: r.color, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.value)}</span>
              </div>
            ))}
            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Esperado na gaveta</span>
              <span style={{ fontSize: '12px', color: gavetaColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(gavetaArredondado)}</span>
            </div>
          </div>
        </div>

        {/* Por forma de pagamento */}
        <div style={CARD}>
          <span style={SEC_LABEL}>Por forma de pagamento</span>
          {porForma.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>—</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {porForma.map(f => (
                <div key={f.nome} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>{f.nome}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: '0 0 1px' }}>{fmt(f.total)}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{f.count} transação{f.count !== 1 ? 'ões' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Column headers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '4px 12px' }}>
        {(['Hora', 'Cliente', 'Vendedor', 'Forma', 'Itens', 'Total', ''] as const).map((h, i) => (
          <span key={i} style={COL_HDR}>{h}</span>
        ))}
      </div>

      {/* ── Section 3: Sale rows ── */}
      {vendas.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '32px 0' }}>
          Nenhuma venda neste turno
        </p>
      ) : (
        <div>
          {vendas.map(v => (
            <VendaRow
              key={v.id}
              venda={v}
              detail={details[v.id]}
              onExpand={() => handleExpand(v.id)}
            />
          ))}
        </div>
      )}

    </div>
    </>
  )
}
