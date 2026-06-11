'use client'

import { useEffect, useState } from 'react'
import { Banknote, QrCode, CreditCard, Receipt, Wallet } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'

const TIPOS = ['dinheiro', 'pix', 'debito', 'credito', 'crediario', 'outro']

const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  position: 'relative',
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.8)',
  borderRadius: '8px',
}

const LABEL: React.CSSProperties = {
  fontSize: '10px', color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
}

const DIV: React.CSSProperties = { height: '0.5px', background: 'rgba(255,255,255,0.07)' }

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'
}
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative transition-colors shrink-0"
      style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: on ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
    >
      <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all" style={{ left: on ? '21px' : '3px' }} />
    </button>
  )
}

function TipoIcon({ tipo, size = 22 }: { tipo: string; size?: number }) {
  const cls = 'text-white/40'
  switch (tipo) {
    case 'dinheiro':  return <Banknote   size={size} className={cls} />
    case 'pix':       return <QrCode     size={size} className={cls} />
    case 'debito':    return <CreditCard size={size} className={cls} />
    case 'credito':   return <CreditCard size={size} className={cls} />
    case 'crediario': return <Receipt    size={size} className={cls} />
    default:          return <Wallet     size={size} className={cls} />
  }
}

export default function FormasPagamentoPage() {
  const [formas,       setFormas]       = useState<FormaPagamento[]>([])
  const [loading,      setLoading]      = useState(true)
  const [formOpen,     setFormOpen]     = useState(false)
  const [editandoId,   setEditandoId]   = useState<string | null>(null)
  const [salvando,     setSalvando]     = useState(false)

  const [nome,           setNome]           = useState('')
  const [tipo,           setTipo]           = useState('outro')
  const [ativo,          setAtivo]          = useState(true)
  const [aceitaDesconto, setAceitaDesconto] = useState(true)
  const [config,         setConfig]         = useState<Record<string, any>>({})
  const [editandoPadrao, setEditandoPadrao] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} })

  async function load() {
    setLoading(true)
    try {
      const data = await financeiroApi.formasPagamento(true)
      setFormas([...data].sort((a, b) => {
        const ia = TIPOS.indexOf(a.tipo)
        const ib = TIPOS.indexOf(b.tipo)
        if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        return a.nome.localeCompare(b.nome)
      }))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function abrirNova() {
    setNome(''); setTipo('outro')
    setAtivo(true); setAceitaDesconto(true); setConfig({}); setEditandoId(null); setEditandoPadrao(false); setFormOpen(true)
  }

  function abrirEdicao(f: FormaPagamento) {
    setNome(f.nome); setTipo(f.tipo)
    setAtivo(f.ativo)
    setAceitaDesconto(f.aceita_desconto !== false)
    setConfig(f.config ?? {})
    setEditandoId(f.id); setEditandoPadrao(!!f.padrao_sistema); setFormOpen(true)
  }

  async function handleSalvar() {
    if (!editandoPadrao && !nome) return
    setSalvando(true)
    try {
      const data = { nome, tipo, ativo, aceita_desconto: aceitaDesconto, config }
      if (editandoId) await financeiroApi.atualizarFormaPagamento(editandoId, data as any)
      else await financeiroApi.criarFormaPagamento(data as any)
      await load(); setFormOpen(false)
    } finally { setSalvando(false) }
  }

  async function toggleAtivo(f: FormaPagamento) {
    try {
      await financeiroApi.atualizarFormaPagamento(f.id, { ativo: !f.ativo } as any)
      await load()
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao atualizar.')
    }
  }

  async function handleRemover(id: string) {
    setModal({
      open: true,
      onConfirm: async () => {
        try {
          await financeiroApi.removerFormaPagamento(id)
          setFormOpen(false)
          await load()
        } catch (err: any) {
          alert(err?.response?.data?.error ?? 'Erro ao remover.')
        }
      },
    })
  }

  function setC(key: string, value: any) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const isWide      = tipo === 'credito' || tipo === 'crediario'
  const isEditing   = formOpen && editandoId !== null
  const formasChips = formas.filter(f => f.ativo && f.tipo !== 'crediario')

  // ── Shared sub-blocks ──────────────────────────────────────────────────────

  const nameBlock = editandoPadrao ? (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} className="px-4 py-3">
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500 }}>{nome}</p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '2px' }} className="capitalize">{tipo}</p>
    </div>
  ) : (
    <>
      <input
        value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome *"
        onFocus={focusIn} onBlur={focusOut}
        className="min-h-[48px] px-4 outline-none w-full"
        style={INPUT_STYLE}
      />
      <div className="flex flex-col gap-1.5">
        <label style={LABEL}>Tipo</label>
        <select
          value={tipo} onChange={e => setTipo(e.target.value)}
          onFocus={focusIn} onBlur={focusOut}
          className="min-h-[48px] px-4 outline-none w-full"
          style={INPUT_STYLE}
        >
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </>
  )

  const ativoToggle = (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Forma ativa</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Disponível no checkout do caixa.</p>
      </div>
      <Toggle on={ativo} onToggle={() => setAtivo(v => !v)} />
    </div>
  )

  const aceitaDescontoToggle = (
    <div className="flex items-center justify-between py-3">
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Aceita desconto</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Elegível para o desconto global do caixa.</p>
      </div>
      <Toggle on={aceitaDesconto} onToggle={() => setAceitaDesconto(v => !v)} />
    </div>
  )

  const actionButtons = (
    <div
      className="flex items-center justify-between gap-3"
      style={isWide ? { borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '12px' } : {}}
    >
      {editandoId && !editandoPadrao ? (
        <button
          onClick={() => handleRemover(editandoId)}
          className="min-h-[40px] px-2 transition-colors"
          style={{ fontSize: '12px', color: 'rgba(248,113,113,0.5)', outline: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.85)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.5)')}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(240,100,100,0.3)' }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          Remover
        </button>
      ) : <span />}
      <div className="flex gap-3">
        <button
          onClick={() => setFormOpen(false)}
          className="min-h-[40px] px-5 rounded-lg text-sm transition-colors"
          style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', borderRadius: '8px', outline: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.25)' }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSalvar}
          disabled={salvando || (!editandoPadrao && !nome)}
          className="min-h-[40px] px-5 text-sm font-semibold rounded-lg disabled:opacity-40"
          style={{ background: 'rgba(0,239,255,0.2)', border: '0.5px solid rgba(0,239,255,0.4)', color: '#0ef', borderRadius: '8px', outline: 'none' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(0,239,255,0.32)'; e.currentTarget.style.borderColor = 'rgba(0,239,255,0.6)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.3)' }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10 flex flex-col gap-6">

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          As formas padrão do sistema não podem ser removidas. Você pode ajustar os descontos e ativar/desativar.
        </p>

        {/* ── Edit panel ──────────────────────────────────────────────────── */}
        {formOpen && (
          <div style={CARD} className="p-5 flex flex-col gap-4">

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              {editandoId ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
            </p>

            {isWide ? (
              /* ── TWO-COLUMN BODY ─────────────────────────────────────────── */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px]">

                {/* LEFT — identity + base toggles + crediário-specific upper fields */}
                <div className="flex flex-col gap-4">
                  {nameBlock}
                  {ativoToggle}
                  {aceitaDescontoToggle}

                  {/* Crediário-only: parcelas + entrada */}
                  {tipo === 'crediario' && (
                    <div className="flex flex-col gap-3">
                      <div style={DIV} />

                      <div className="flex flex-col gap-1.5">
                        <label style={LABEL}>Máximo de parcelas</label>
                        <input
                          type="number" min="1" step="1"
                          value={config.max_parcelas ?? 1}
                          onChange={e => setC('max_parcelas', Math.max(1, parseInt(e.target.value) || 1))}
                          onFocus={focusIn} onBlur={focusOut}
                          className="w-full min-h-[38px] px-3 outline-none"
                          style={{ ...INPUT_STYLE, fontSize: '13px' }}
                        />
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '-2px' }}>
                          A data da 1ª parcela é definida na venda; as seguintes caem todo mês no mesmo dia.
                        </p>
                      </div>

                      <div style={DIV} />

                      <div className="flex items-start justify-between gap-4">
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', flex: 1 }}>Exigir entrada mínima</p>
                        <Toggle on={!!config.entrada_obrigatoria} onToggle={() => setC('entrada_obrigatoria', !config.entrada_obrigatoria)} />
                      </div>

                      {config.entrada_obrigatoria && (
                        <div className="flex flex-col gap-1.5">
                          <label style={LABEL}>Percentual mínimo da entrada %</label>
                          <div className="relative">
                            <input
                              type="number" min="0" max="100" step="0.1"
                              value={config.entrada_min_pct ?? 0}
                              onChange={e => setC('entrada_min_pct', parseFloat(e.target.value) || 0)}
                              onFocus={focusIn} onBlur={focusOut}
                              className="w-full min-h-[38px] px-3 pr-7 outline-none"
                              style={{ ...INPUT_STYLE, fontSize: '13px' }}
                            />
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT — config section */}
                <div className="flex flex-col gap-3">

                  {/* Crédito right: Parcelamento */}
                  {tipo === 'credito' && (
                    <>
                      <p style={{ ...LABEL, color: 'rgba(255,255,255,0.3)' }}>Parcelamento</p>

                      <div className="flex flex-col gap-1.5">
                        <label style={LABEL}>Máx. parcelas</label>
                        <input
                          type="number" min="1" step="1"
                          value={config.max_parcelas ?? 1}
                          onChange={e => setC('max_parcelas', Math.max(1, parseInt(e.target.value) || 1))}
                          onFocus={focusIn} onBlur={focusOut}
                          className="w-full min-h-[38px] px-3 outline-none"
                          style={{ ...INPUT_STYLE, fontSize: '13px' }}
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', flex: 1 }}>Cobrar juros de parcelamento</p>
                        <Toggle on={!!config.juros_habilitado} onToggle={() => setC('juros_habilitado', !config.juros_habilitado)} />
                      </div>

                      {config.juros_habilitado && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label style={LABEL}>Sem juros até (parcelas)</label>
                            <input
                              type="number" min="0" step="1"
                              value={config.juros_sem_ate ?? 0}
                              onChange={e => setC('juros_sem_ate', parseInt(e.target.value) || 0)}
                              onFocus={focusIn} onBlur={focusOut}
                              className="w-full min-h-[38px] px-3 outline-none"
                              style={{ ...INPUT_STYLE, fontSize: '13px' }}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label style={LABEL}>Juros ao mês acima %</label>
                            <div className="relative">
                              <input
                                type="number" min="0" step="0.01"
                                value={config.juros_mes ?? 0}
                                onChange={e => setC('juros_mes', parseFloat(e.target.value) || 0)}
                                onFocus={focusIn} onBlur={focusOut}
                                className="w-full min-h-[38px] px-3 pr-7 outline-none"
                                style={{ ...INPUT_STYLE, fontSize: '13px' }}
                              />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Crediário right: juros + atraso + chips */}
                  {tipo === 'crediario' && (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', flex: 1 }}>Cobrar juros de parcelamento</p>
                        <Toggle on={!!config.juros_habilitado} onToggle={() => setC('juros_habilitado', !config.juros_habilitado)} />
                      </div>

                      {config.juros_habilitado && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label style={LABEL}>Sem juros até (parcelas)</label>
                            <input
                              type="number" min="0" step="1"
                              value={config.juros_sem_ate ?? 0}
                              onChange={e => setC('juros_sem_ate', parseInt(e.target.value) || 0)}
                              onFocus={focusIn} onBlur={focusOut}
                              className="w-full min-h-[38px] px-3 outline-none"
                              style={{ ...INPUT_STYLE, fontSize: '13px' }}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label style={LABEL}>Juros ao mês acima %</label>
                            <div className="relative">
                              <input
                                type="number" min="0" step="0.01"
                                value={config.juros_mes ?? 0}
                                onChange={e => setC('juros_mes', parseFloat(e.target.value) || 0)}
                                onFocus={focusIn} onBlur={focusOut}
                                className="w-full min-h-[38px] px-3 pr-7 outline-none"
                                style={{ ...INPUT_STYLE, fontSize: '13px' }}
                              />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={DIV} />

                      <div className="flex items-start justify-between gap-4">
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', flex: 1 }}>Cobrar juros por atraso</p>
                        <Toggle on={!!config.atraso_habilitado} onToggle={() => setC('atraso_habilitado', !config.atraso_habilitado)} />
                      </div>

                      {config.atraso_habilitado && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label style={LABEL}>Multa por atraso %</label>
                            <div className="relative">
                              <input
                                type="number" min="0" step="0.1"
                                value={config.atraso_multa ?? 0}
                                onChange={e => setC('atraso_multa', parseFloat(e.target.value) || 0)}
                                onFocus={focusIn} onBlur={focusOut}
                                className="w-full min-h-[38px] px-3 pr-7 outline-none"
                                style={{ ...INPUT_STYLE, fontSize: '13px' }}
                              />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>%</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label style={LABEL}>Juros de mora ao mês %</label>
                            <div className="relative">
                              <input
                                type="number" min="0" step="0.01"
                                value={config.atraso_mora_mes ?? 0}
                                onChange={e => setC('atraso_mora_mes', parseFloat(e.target.value) || 0)}
                                onFocus={focusIn} onBlur={focusOut}
                                className="w-full min-h-[38px] px-3 pr-7 outline-none"
                                style={{ ...INPUT_STYLE, fontSize: '13px' }}
                              />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {formasChips.length > 0 && (
                        <>
                          <div style={DIV} />

                          <p style={LABEL}>Formas aceitas na entrada</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {formasChips.map(f => {
                              const on = ((config.formas_entrada ?? []) as string[]).includes(f.id)
                              return (
                                <button
                                  key={f.id} type="button"
                                  onClick={() => setC('formas_entrada', on
                                    ? (config.formas_entrada ?? [] as string[]).filter((id: string) => id !== f.id)
                                    : [...(config.formas_entrada ?? []), f.id]
                                  )}
                                  style={{
                                    minHeight: '38px', padding: '8px 15px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer',
                                    border: on ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)',
                                    background: on ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)',
                                    color: on ? '#0ef' : 'rgba(255,255,255,0.35)',
                                    outline: 'none',
                                    transition: 'background 120ms, border-color 120ms, box-shadow 120ms',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = on ? 'rgba(0,239,255,0.16)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = on ? 'rgba(0,239,255,0.6)' : 'rgba(255,255,255,0.18)' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = on ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = on ? 'rgba(0,239,255,0.4)' : 'rgba(255,255,255,0.1)' }}
                                  onFocus={e => { e.currentTarget.style.boxShadow = on ? '0 0 0 2px rgba(0,239,255,0.3)' : '0 0 0 2px rgba(255,255,255,0.2)' }}
                                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                                >
                                  {f.nome}{on ? ' ✓' : ''}
                                </button>
                              )
                            })}
                          </div>

                          <p style={LABEL}>Formas aceitas nas parcelas</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {formasChips.map(f => {
                              const on = ((config.formas_parcela ?? []) as string[]).includes(f.id)
                              return (
                                <button
                                  key={f.id} type="button"
                                  onClick={() => setC('formas_parcela', on
                                    ? (config.formas_parcela ?? [] as string[]).filter((id: string) => id !== f.id)
                                    : [...(config.formas_parcela ?? []), f.id]
                                  )}
                                  style={{
                                    minHeight: '38px', padding: '8px 15px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer',
                                    border: on ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)',
                                    background: on ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)',
                                    color: on ? '#0ef' : 'rgba(255,255,255,0.35)',
                                    outline: 'none',
                                    transition: 'background 120ms, border-color 120ms, box-shadow 120ms',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = on ? 'rgba(0,239,255,0.16)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = on ? 'rgba(0,239,255,0.6)' : 'rgba(255,255,255,0.18)' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = on ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = on ? 'rgba(0,239,255,0.4)' : 'rgba(255,255,255,0.1)' }}
                                  onFocus={e => { e.currentTarget.style.boxShadow = on ? '0 0 0 2px rgba(0,239,255,0.3)' : '0 0 0 2px rgba(255,255,255,0.2)' }}
                                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                                >
                                  {f.nome}{on ? ' ✓' : ''}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* ── SINGLE-COLUMN BODY (dinheiro / pix / debito / outro) ──── */
              <div className="flex flex-col gap-4">
                {nameBlock}
                {ativoToggle}
                {aceitaDescontoToggle}
              </div>
            )}

            {actionButtons}
          </div>
        )}

        {/* ── Card grid ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>

            {formas.map(f => {
              const isSelected = isEditing && f.id === editandoId
              const baseOpacity = f.ativo ? 1 : 0.45
              const cardOpacity = isSelected ? 1 : isEditing ? baseOpacity * 0.4 : baseOpacity
              return (
              <button
                key={f.id}
                onClick={() => abrirEdicao(f)}
                className="p-4 flex flex-col items-center gap-3 text-center active:scale-[0.97] transition-all"
                style={{ ...CARD, opacity: cardOpacity, ...(isSelected && { background: 'rgba(0,239,255,0.06)', border: '1px solid rgba(0,239,255,0.5)' }) }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
              >
                {/* Active/inactive pill switch — top-right corner */}
                <button
                  onClick={e => { e.stopPropagation(); toggleAtivo(f) }}
                  title={f.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                  style={{ position: 'absolute', top: '9px', right: '9px', width: '36px', height: '20px',
                    borderRadius: '9999px', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                    background: f.ativo ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', transition: 'all 0.15s', outline: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = f.ativo ? 'rgba(0,212,212,0.9)' : 'rgba(255,255,255,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = f.ativo ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.3)' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  <span style={{ position: 'absolute', top: '3px', left: f.ativo ? '19px' : '3px',
                    width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'all 0.15s' }} />
                </button>

                <div
                  className="w-12 h-12 flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}
                >
                  <TipoIcon tipo={f.tipo} />
                </div>
                <div className="flex flex-col items-center gap-1 w-full min-w-0">
                  <p className="font-medium truncate w-full" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                    {f.nome}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {f.padrao_sistema && (
                      <span
                        className="px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
                      >
                        Sistema
                      </span>
                    )}
                    {!f.ativo && (
                      <span
                        className="px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{
                          fontSize: '9px',
                          background: 'rgba(240,100,100,0.08)',
                          border: '0.5px solid rgba(240,100,100,0.25)',
                          color: 'rgba(240,130,130,0.75)',
                        }}
                      >
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
              </button>
              )
            })}

          </div>
        )}

        {/* FAB */}
        <button
          onClick={abrirNova}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{
            width: '48px', height: '48px',
            background: 'rgba(0,239,255,0.9)',
            borderRadius: '50%',
            color: '#0a0a1a',
            fontSize: '24px', fontWeight: 700,
            border: 'none',
            outline: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,239,255,0.35)' }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          +
        </button>
      </main>
      <ConfirmModal
        isOpen={modal.open}
        title="Remover forma de pagamento"
        message="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        confirmStyle="danger"
        onConfirm={() => { setModal(m => ({ ...m, open: false })); modal.onConfirm() }}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </>
  )
}
