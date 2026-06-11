'use client'

import { useEffect, useState } from 'react'
import { sacolasApi, type SacolaRemota } from '@/lib/api/sacolas'
import { usePDVStore } from '@/store/pdv.store'

interface Props {
  open:         boolean
  onClose:      () => void
  onCarregada?: () => void
}

function fmtR(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function totalSacola(s: SacolaRemota) {
  return s.itens.reduce((sum, i) => sum + Number(i.preco_unitario) * i.quantidade, 0)
}

function qtdItens(s: SacolaRemota) {
  return s.itens.reduce((sum, i) => sum + i.quantidade, 0)
}

export function SacolasModal({ open, onClose, onCarregada }: Props) {
  const { carregarSacola } = usePDVStore()

  const [sacolas,    setSacolas]    = useState<SacolaRemota[]>([])
  const [carregando, setCarregando] = useState(false)
  const [loadingId,  setLoadingId]  = useState<string | null>(null)
  const [erro,       setErro]       = useState('')

  // ── Load on open ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setErro('')
    setCarregando(true)
    sacolasApi.listPendentes()
      .then(setSacolas)
      .catch(() => setErro('Não foi possível carregar as sacolas.'))
      .finally(() => setCarregando(false))
  }, [open])

  // ── ESC to close ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // ── Load cart into POS ────────────────────────────────────────────────────────
  async function handleCarregar(sacola: SacolaRemota) {
    if (loadingId) return
    setLoadingId(sacola.id); setErro('')
    try {
      await sacolasApi.updateStatus(sacola.id, 'em_atendimento')
      carregarSacola(
        sacola.id,
        sacola.itens,
        sacola.cliente_id,
        sacola.cliente_nome,
        sacola.criado_por,
        sacola.nome_vendedor,
      )
      onClose()
      onCarregada?.()
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao carregar sacola.')
      setLoadingId(null)
    }
  }

  const totalCount = sacolas.length

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,20,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'rgba(8,18,30,0.97)', backdropFilter: 'blur(16px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Sacolas Pendentes</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
              {totalCount} sacola{totalCount !== 1 ? 's' : ''} aguardando ou no caixa
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '22px', borderRadius: '8px', transition: 'color 120ms, background 120ms' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'none' }}
          >×</button>
        </div>

        {/* Card grid body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>
          {carregando && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '48px' }}>
              <div className="w-7 h-7 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!carregando && erro && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontSize: '13px', color: 'rgba(248,113,113,0.8)' }}>{erro}</p>
              <button
                onClick={() => {
                  setErro(''); setCarregando(true)
                  sacolasApi.listPendentes().then(setSacolas).catch(() => setErro('Não foi possível carregar as sacolas.')).finally(() => setCarregando(false))
                }}
                style={{ marginTop: '10px', fontSize: '12px', color: '#0ef', background: 'none', border: 'none', cursor: 'pointer' }}
              >Tentar novamente</button>
            </div>
          )}

          {!carregando && !erro && sacolas.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', gap: '10px', opacity: 0.45 }}>
              <span style={{ fontSize: '36px' }}>🛍</span>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Nenhuma sacola pendente</p>
            </div>
          )}

          {!carregando && !erro && sacolas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {sacolas.map(sacola => {
                const isLoading = loadingId === sacola.id
                const tot       = totalSacola(sacola)
                const qtd       = qtdItens(sacola)
                const emAtend   = sacola.status === 'em_atendimento'

                return (
                  <div
                    key={sacola.id}
                    onClick={() => !isLoading && handleCarregar(sacola)}
                    style={{
                      background:    'rgba(8,18,30,0.48)',
                      backdropFilter:'blur(8px)',
                      border:        '0.5px solid rgba(255,255,255,0.08)',
                      borderRadius:  '10px',
                      padding:       '16px',
                      minHeight:     '110px',
                      display:       'flex',
                      flexDirection: 'column',
                      gap:           '6px',
                      cursor:        isLoading ? 'wait' : 'pointer',
                      transition:    'background 120ms, border-color 120ms',
                      position:      'relative',
                    }}
                    onMouseEnter={e => {
                      if (!isLoading) {
                        e.currentTarget.style.background    = 'rgba(255,255,255,0.04)'
                        e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.18)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background  = 'rgba(8,18,30,0.48)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    }}
                  >
                    {/* Status badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {sacola.cliente_nome ?? 'Sem cliente'}
                      </p>
                      <span style={{
                        fontSize:      '9px',
                        fontWeight:    500,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        borderRadius:  '9999px',
                        padding:       '2px 7px',
                        flexShrink:    0,
                        background:    emAtend ? 'rgba(255,165,0,0.10)' : 'rgba(0,239,255,0.10)',
                        color:         emAtend ? 'rgba(255,165,0,0.85)' : '#0ef',
                        border:        `0.5px solid ${emAtend ? 'rgba(255,165,0,0.30)' : 'rgba(0,239,255,0.30)'}`,
                      }}>
                        {emAtend ? 'No caixa' : 'Aguardando'}
                      </span>
                    </div>

                    {/* Total */}
                    <p style={{ fontSize: '17px', fontWeight: 700, color: '#0ef', marginTop: '2px' }}>
                      {isLoading ? '…' : fmtR(tot)}
                    </p>

                    {/* Item count + date */}
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      {qtd} item{qtd !== 1 ? 'ns' : ''} · {fmtDt(sacola.criado_em)}
                    </p>

                    {/* Vendedor */}
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: 'auto' }}>
                      {sacola.nome_vendedor ?? '—'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '10px 16px 14px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={onClose}
            style={{ width: '100%', minHeight: '44px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', outline: 'none', transition: 'background 120ms, border-color 120ms, color 120ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.25)' }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
