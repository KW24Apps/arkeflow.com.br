'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCaixaStore } from '@/store/caixa.store'
import { useAuthStore } from '@/store/auth.store'
import { caixaApi, type VendaTurno, type VendaDetalhe } from '@/lib/api/caixa'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ── Style constants ───────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '14px 16px',
}

const SEC_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.3)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: '10px',
}

const FIELD_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.25)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '3px',
}

const FIELD_VALUE: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  fontWeight: 500,
  margin: 0,
}

const COL_HDR: React.CSSProperties = {
  fontSize: '9px',
  color: 'rgba(255,255,255,0.3)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

const GRID_COLS = '50px 1fr 1fr 80px 40px 80px 20px'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDt(iso: string) {
  const d = new Date(iso)
  const dd  = String(d.getDate()).padStart(2, '0')
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  const hh  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()} · ${hh}:${min}`
}

function fmtHora(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtBRL(v: string | number) {
  const n = Number(v)
  const parts = n.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${parts.join(',')}`
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '2px 7px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, border: `2px solid rgba(0,239,255,0.7)`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PDVHistorico() {
  const { turno, carregar: carregarCaixa } = useCaixaStore()
  const { usuario } = useAuthStore()

  const [vendas,      setVendas]      = useState<VendaTurno[]>([])
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [details,     setDetails]     = useState<Record<string, VendaDetalhe>>({})
  const [loadingDet,  setLoadingDet]  = useState<Record<string, boolean>>({})
  const [cancelModal, setCancelModal] = useState<{ open: boolean; vendaId: string | null }>({ open: false, vendaId: null })

  useEffect(() => {
    if (!turno) carregarCaixa()
    caixaApi.vendas()
      .then(r => setVendas(r.vendas))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleRow(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (details[id] || loadingDet[id]) return
    setLoadingDet(p => ({ ...p, [id]: true }))
    try {
      const d = await caixaApi.vendaDetalhe(id)
      setDetails(p => ({ ...p, [id]: d }))
    } catch {}
    finally { setLoadingDet(p => ({ ...p, [id]: false })) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalReceita   = vendas.reduce((s, v) => s + Number(v.total), 0)
  const pgMap: Record<string, { total: number; count: number }> = {}
  for (const det of Object.values(details)) {
    for (const pg of det.pagamentos) {
      if (!pgMap[pg.forma_nome]) pgMap[pg.forma_nome] = { total: 0, count: 0 }
      pgMap[pg.forma_nome].total += Number(pg.valor)
      pgMap[pg.forma_nome].count++
    }
  }
  const pgEntries = Object.entries(pgMap)
  const turnoAny  = turno as any

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* ── Section 1: Turno info ─────────────────────────────────────────── */}
      {turno && (
        <div style={CARD}>
          <span style={SEC_LABEL}>Caixa aberto</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <span style={FIELD_LABEL}>Operador</span>
              <p style={FIELD_VALUE}>{turnoAny.usuario_nome ?? usuario?.nome ?? '—'}</p>
            </div>
            <div>
              <span style={FIELD_LABEL}>Abertura</span>
              <p style={FIELD_VALUE}>{fmtDt(turno.aberto_em)}</p>
            </div>
            <div>
              <span style={FIELD_LABEL}>Saldo inicial</span>
              <p style={FIELD_VALUE}>{fmtBRL(turno.saldo_inicial)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 2: Summary ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

        {/* Receita total */}
        <div style={CARD}>
          <span style={SEC_LABEL}>Receita total</span>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>
            {fmtBRL(totalReceita)}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            {vendas.length} transação{vendas.length !== 1 ? 'ões' : ''}
          </p>
        </div>

        {/* Por forma de pagamento */}
        <div style={CARD}>
          <span style={SEC_LABEL}>Por forma de pagamento</span>
          {pgEntries.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>—</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {pgEntries.map(([nome, { total, count }]) => (
                <div key={nome} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>{nome}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: '0 0 1px' }}>{fmtBRL(total)}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{count} venda{count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sections 3+4: Column headers + rows ───────────────────────────── */}
      <div style={{ background: 'rgba(8,18,30,0.48)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px', overflow: 'hidden' }}>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, padding: '8px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', gap: '8px', alignItems: 'center' }}>
          {(['HORA', 'CLIENTE', 'VENDEDOR', 'FORMA', 'ITENS', 'TOTAL', ''] as const).map((h, i) => (
            <span key={i} style={COL_HDR}>{h}</span>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Spinner size={24} />
          </div>
        )}

        {/* Empty */}
        {!loading && vendas.length === 0 && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '32px 0', margin: 0 }}>
            Nenhuma venda neste turno
          </p>
        )}

        {/* Rows */}
        {!loading && vendas.map((venda, idx) => {
          const open        = expandedId === venda.id
          const det         = details[venda.id]
          const loadingThis = loadingDet[venda.id]
          const pgList      = venda.pagamentos ?? []

          return (
            <div key={venda.id} style={{ borderBottom: idx < vendas.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>

              {/* Collapsed row */}
              <div
                onClick={() => toggleRow(venda.id)}
                style={{ display: 'grid', gridTemplateColumns: GRID_COLS, padding: '10px 12px', cursor: 'pointer', gap: '8px', alignItems: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* HORA */}
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {fmtHora(venda.criado_em)}
                </span>

                {/* CLIENTE */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {venda.cliente_nome ?? '—'}
                  </p>
                  {venda.cliente_telefone && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{venda.cliente_telefone}</p>
                  )}
                </div>

                {/* VENDEDOR */}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {venda.vendedor_nome ?? '—'}
                </span>

                {/* FORMA */}
                <div>
                  {pgList.length === 0
                    ? <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>—</span>
                    : pgList.length === 1
                      ? <Badge>{pgList[0].forma_nome}</Badge>
                      : <Badge>{pgList.length} formas</Badge>}
                </div>

                {/* ITENS */}
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{venda.total_itens}</span>

                {/* TOTAL */}
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  {fmtBRL(venda.total)}
                </span>

                {/* CHEVRON */}
                <ChevronDown
                  size={14}
                  style={{ color: 'rgba(255,255,255,0.3)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', justifySelf: 'center' }}
                />
              </div>

              {/* Expanded panel */}
              {open && (
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {loadingThis ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                      <Spinner size={20} />
                    </div>
                  ) : det ? (
                    <>
                      {/* Itens */}
                      <div>
                        <span style={{ ...SEC_LABEL, marginBottom: '6px' }}>Itens</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {det.itens.map((item, i) => {
                            const attrs = Object.values(item.atributos_json ?? {}).join(' / ')
                            return (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(8,18,30,0.35)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 500 }}>{item.produto_nome}</p>
                                  {attrs && (
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '1px 0 0' }}>{attrs}</p>
                                  )}
                                </div>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', flexShrink: 0, marginLeft: '16px', whiteSpace: 'nowrap' }}>
                                  {item.quantidade}× {fmtBRL(item.preco_unitario)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Pagamento */}
                      <div>
                        <span style={{ ...SEC_LABEL, marginBottom: '6px' }}>Pagamento</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {det.pagamentos.map((pg, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px' }}>
                              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>{pg.forma_nome}</p>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: 0 }}>{fmtBRL(pg.valor)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                        {(['Emitir NF-e', 'Baixar XML', 'Enviar e-mail'] as const).map(label => (
                          <button key={label} disabled style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', opacity: 0.5, cursor: 'not-allowed' }}>
                            {label}
                          </button>
                        ))}
                        {venda.status !== 'cancelada' && (
                          <button
                            onClick={e => { e.stopPropagation(); setCancelModal({ open: true, vendaId: venda.id }) }}
                            style={{ background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.25)', color: 'rgba(240,130,130,0.75)', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Cancelar venda
                          </button>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Cancel modal ─────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={cancelModal.open}
        title="Cancelar venda"
        message="Esta ação não pode ser desfeita. Deseja continuar?"
        confirmLabel="Cancelar venda"
        confirmStyle="danger"
        onConfirm={() => {
          setCancelModal({ open: false, vendaId: null })
          alert('Cancelamento de venda não implementado nesta versão.')
        }}
        onCancel={() => setCancelModal({ open: false, vendaId: null })}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
