'use client'

import { useEffect, useState } from 'react'
import { Banknote, QrCode, CreditCard, Receipt, Wallet } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
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

function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'
}
function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
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

function descLine(f: FormaPagamento): string {
  const pct = Number(f.desconto_percentual)
  const cap = Number(f.desconto_maximo)
  if (pct <= 0) return 'Sem desconto'
  if (cap > 0) {
    const capFmt = cap.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${pct.toFixed(1)}% desc · máx R$ ${capFmt}`
  }
  return `${pct.toFixed(1)}% desc.`
}

export default function FormasPagamentoPage() {
  const [formas,    setFormas]    = useState<FormaPagamento[]>([])
  const [loading,   setLoading]   = useState(true)
  const [formOpen,  setFormOpen]  = useState(false)
  const [editandoId,setEditandoId]= useState<string | null>(null)
  const [salvando,  setSalvando]  = useState(false)

  const [nome,               setNome]               = useState('')
  const [tipo,               setTipo]               = useState('outro')
  const [descontoPercentual, setDescontoPercentual] = useState('0')
  const [descontoMaximoCents,setDescontoMaximoCents]= useState(0)
  const [ativo,              setAtivo]              = useState(true)
  const [aceitaDesconto,     setAceitaDesconto]     = useState(true)
  const [editandoPadrao,     setEditandoPadrao]     = useState(false)
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
    setNome(''); setTipo('outro'); setDescontoPercentual('0'); setDescontoMaximoCents(0)
    setAtivo(true); setAceitaDesconto(true); setEditandoId(null); setEditandoPadrao(false); setFormOpen(true)
  }

  function abrirEdicao(f: FormaPagamento) {
    setNome(f.nome); setTipo(f.tipo)
    setDescontoPercentual(String(Number(f.desconto_percentual)))
    setDescontoMaximoCents(Math.round(Number(f.desconto_maximo) * 100))
    setAtivo(f.ativo)
    setAceitaDesconto(f.aceita_desconto !== false)
    setEditandoId(f.id); setEditandoPadrao(!!f.padrao_sistema); setFormOpen(true)
  }

  async function handleSalvar() {
    if (!editandoPadrao && !nome) return
    setSalvando(true)
    try {
      const data = {
        nome,
        tipo,
        desconto_percentual: parseFloat(descontoPercentual),
        desconto_maximo: descontoMaximoCents / 100,
        ativo,
        aceita_desconto: aceitaDesconto,
      }
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

            {editandoPadrao ? (
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
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tipo</label>
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
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Desconto %</label>
                <input
                  type="number" min="0" max="100" value={descontoPercentual}
                  onChange={e => setDescontoPercentual(e.target.value)}
                  onFocus={focusIn} onBlur={focusOut}
                  className="min-h-[48px] px-4 outline-none w-full"
                  style={INPUT_STYLE}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Desc. máx. R$</label>
                <CurrencyInput
                  value={descontoMaximoCents}
                  onChange={setDescontoMaximoCents}
                  onFocus={focusIn as any}
                  onBlur={focusOut as any}
                  className="min-h-[48px] px-4 outline-none w-full"
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            {/* Ativo toggle */}
            <div className="flex items-center justify-between">
              <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</label>
              <button
                onClick={() => setAtivo(v => !v)}
                style={{
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: ativo ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid rgba(255,255,255,0.15)',
                  background: ativo ? 'rgba(0,239,255,0.12)' : 'rgba(255,255,255,0.05)',
                  color: ativo ? '#0ef' : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {ativo ? 'Ativo' : 'Inativo'}
              </button>
            </div>

            {/* Aceita desconto toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Aceita desconto</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                  Porção desta forma elegível para o desconto global do caixa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAceitaDesconto(v => !v)}
                className="relative transition-colors shrink-0 mt-1"
                style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: aceitaDesconto ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
              >
                <span
                  className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                  style={{ left: aceitaDesconto ? '21px' : '3px' }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              {editandoId && !editandoPadrao ? (
                <button
                  onClick={() => handleRemover(editandoId)}
                  className="min-h-[40px] px-2 transition-colors"
                  style={{ fontSize: '12px', color: 'rgba(248,113,113,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.85)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.5)')}
                >
                  Remover
                </button>
              ) : <span />}
              <div className="flex gap-3">
                <button
                  onClick={() => setFormOpen(false)}
                  className="min-h-[40px] px-5 rounded-lg text-sm transition-colors"
                  style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', borderRadius: '8px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando || (!editandoPadrao && !nome)}
                  className="min-h-[40px] px-5 text-sm font-semibold rounded-lg disabled:opacity-40"
                  style={{ background: 'rgba(0,239,255,0.2)', border: '0.5px solid rgba(0,239,255,0.4)', color: '#0ef', borderRadius: '8px' }}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Card grid ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>

            {formas.map(f => (
              <button
                key={f.id}
                onClick={() => abrirEdicao(f)}
                className="p-4 flex flex-col items-center gap-3 text-center active:scale-[0.97] transition-all"
                style={{ ...CARD, opacity: f.ativo ? 1 : 0.45 }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              >
                {/* Active/inactive dot toggle — top-right corner */}
                <button
                  onClick={e => { e.stopPropagation(); toggleAtivo(f) }}
                  title={f.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `1.5px solid ${f.ativo ? '#0ef' : 'rgba(255,255,255,0.2)'}`,
                    background: f.ativo ? 'rgba(0,239,255,0.12)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: f.ativo ? '#0ef' : 'rgba(255,255,255,0.15)',
                    display: 'block',
                    transition: 'all 0.15s',
                  }} />
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
                  <p style={{
                    fontSize: '11px',
                    color: Number(f.desconto_percentual) > 0 ? 'rgba(100,220,160,0.8)' : 'rgba(255,255,255,0.25)',
                  }}>
                    {descLine(f)}
                  </p>
                </div>
              </button>
            ))}

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
          }}
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
