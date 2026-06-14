'use client'

import { useEffect, useState } from 'react'
import { provasApi, type ProvaRemota } from '@/lib/api/provas'
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

function fmtPrazo(iso: string): { label: string; color: string } {
  const today = new Date(); today.setHours(0,0,0,0)
  const prazo = new Date(iso); prazo.setHours(0,0,0,0)
  const diff  = Math.round((prazo.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: `Vencida`, color: 'rgba(240,100,100,0.85)' }
  if (diff === 0) return { label: 'Vence hoje', color: 'rgba(234,179,8,0.9)' }
  return { label: `${diff}d`, color: 'rgba(100,220,160,0.85)' }
}

function totalProva(p: ProvaRemota) {
  return p.itens.filter(i => !i.devolvido).reduce((s, i) => s + Number(i.preco_unitario) * i.quantidade, 0)
}

function qtdAtivos(p: ProvaRemota) {
  return p.itens.filter(i => !i.devolvido).reduce((s, i) => s + i.quantidade, 0)
}

export function ProvasModal({ open, onClose, onCarregada }: Props) {
  const { carregarProva, limpar, itens: itensCarrinho } = usePDVStore()

  const [provas,        setProvas]        = useState<ProvaRemota[]>([])
  const [carregando,    setCarregando]    = useState(false)
  const [loadingId,     setLoadingId]     = useState<string | null>(null)
  const [erro,          setErro]          = useState('')
  const [confirmProva,  setConfirmProva]  = useState<ProvaRemota | null>(null)
  const [trocando,      setTrocando]      = useState(false)

  useEffect(() => {
    if (!open) return
    setErro(''); setConfirmProva(null)
    setCarregando(true)
    provasApi.list('aguardando_caixa')
      .then(setProvas)
      .catch(() => setErro('Não foi possível carregar as provas.'))
      .finally(() => setCarregando(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmProva) { setConfirmProva(null); return }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, confirmProva])

  if (!open) return null

  async function doCarregar(prova: ProvaRemota) {
    setLoadingId(prova.id); setErro('')
    try {
      await provasApi.puxar(prova.id)
      const ativos = prova.itens.filter(i => !i.devolvido)
      carregarProva(
        prova.id,
        ativos.map(i => ({
          id:             i.id,
          versao_id:      i.versao_id,
          produto_id:     i.produto_id,
          nome:           i.nome,
          atributos:      i.atributos,
          preco_unitario: i.preco_unitario,
          quantidade:     i.quantidade,
          codigo_barras:  i.codigo_barras ?? null,
        })),
        prova.cliente_id,
        prova.cliente_nome,
        prova.criado_por,
        prova.nome_vendedor,
      )
      onClose()
      onCarregada?.()
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao carregar prova.')
      setLoadingId(null)
    }
  }

  function handleCarregar(prova: ProvaRemota) {
    if (loadingId) return
    if (itensCarrinho.length > 0) { setConfirmProva(prova); return }
    doCarregar(prova)
  }

  async function handleConfirmTroca() {
    if (!confirmProva || trocando) return
    setTrocando(true); setErro('')
    try {
      limpar()
      await doCarregar(confirmProva)
    } finally {
      setTrocando(false)
      setConfirmProva(null)
    }
  }

  const totalCount = provas.length

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,20,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={() => { if (confirmProva) { setConfirmProva(null); return } onClose() }}
    >
      <div
        style={{ background: 'rgba(8,18,30,0.97)', backdropFilter: 'blur(16px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              {confirmProva ? 'Substituir carrinho?' : 'Provas Aguardando Caixa'}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
              {confirmProva
                ? `${confirmProva.cliente_nome ?? 'Sem cliente'} · ${fmtR(totalProva(confirmProva))}`
                : `${totalCount} prova${totalCount !== 1 ? 's' : ''} aguardando`}
            </p>
          </div>
          <button
            onClick={() => { if (confirmProva) { setConfirmProva(null); return } onClose() }}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '22px', borderRadius: '8px', transition: 'color 120ms, background 120ms' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'none' }}
          >×</button>
        </div>

        {/* Confirmation screen */}
        {confirmProva ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: '20px', textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(240,100,100,0.10)', border: '0.5px solid rgba(240,100,100,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              🏠
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>Substituir carrinho atual?</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                Os itens do carrinho serão removidos e a prova será carregada.
              </p>
            </div>
            {erro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.8)' }}>{erro}</p>}
            <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
              <button
                onClick={() => { setConfirmProva(null); setErro('') }}
                disabled={trocando}
                style={{ flex: 1, minHeight: '44px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >Cancelar</button>
              <button
                onClick={handleConfirmTroca}
                disabled={trocando}
                style={{ flex: 1, minHeight: '44px', background: 'rgba(0,239,255,0.08)', border: '0.5px solid rgba(0,239,255,0.25)', borderRadius: '10px', color: 'rgba(0,239,255,0.85)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.16)'; e.currentTarget.style.color = '#0ef' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.08)'; e.currentTarget.style.color = 'rgba(0,239,255,0.85)' }}
              >
                {trocando ? 'Carregando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        ) : (
          <>
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
                      provasApi.list('aguardando_caixa').then(setProvas).catch(() => setErro('Não foi possível carregar.')).finally(() => setCarregando(false))
                    }}
                    style={{ marginTop: '10px', fontSize: '12px', color: '#0ef', background: 'none', border: 'none', cursor: 'pointer' }}
                  >Tentar novamente</button>
                </div>
              )}

              {!carregando && !erro && provas.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', gap: '10px', opacity: 0.45 }}>
                  <span style={{ fontSize: '36px' }}>🏠</span>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Nenhuma prova aguardando o caixa</p>
                </div>
              )}

              {!carregando && !erro && provas.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                  {provas.map(prova => {
                    const isLoading = loadingId === prova.id
                    const tot       = totalProva(prova)
                    const qtd       = qtdAtivos(prova)
                    const prazoInfo = prova.prazo ? fmtPrazo(prova.prazo) : null

                    return (
                      <div
                        key={prova.id}
                        onClick={() => !isLoading && handleCarregar(prova)}
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
                        onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,18,30,0.48)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {prova.cliente_nome ?? 'Sem cliente'}
                          </p>
                          {prazoInfo && (
                            <span style={{ fontSize: '9px', fontWeight: 500, borderRadius: '9999px', padding: '2px 7px', flexShrink: 0, background: 'rgba(0,0,0,0.2)', color: prazoInfo.color }}>
                              {prazoInfo.label}
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '17px', fontWeight: 700, color: '#0ef', marginTop: '2px' }}>
                          {isLoading ? '…' : fmtR(tot)}
                        </p>

                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                          {qtd} item{qtd !== 1 ? 'ns' : ''} · {fmtDt(prova.criado_em)}
                        </p>

                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: 'auto' }}>
                          {prova.nome_vendedor ?? '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0, padding: '10px 16px 14px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={onClose}
                style={{ width: '100%', minHeight: '44px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', outline: 'none', transition: 'background 120ms, border-color 120ms, color 120ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
