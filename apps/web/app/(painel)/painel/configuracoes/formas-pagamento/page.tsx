'use client'

import { useEffect, useState } from 'react'
import { Banknote, QrCode, CreditCard, Receipt, Wallet } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'

const TIPOS = ['dinheiro', 'pix', 'debito', 'credito', 'crediario', 'outro']

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
}

const INPUT_STYLE = {
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

export default function FormasPagamentoPage() {
  const [formas,    setFormas]    = useState<FormaPagamento[]>([])
  const [loading,   setLoading]   = useState(true)
  const [formOpen,  setFormOpen]  = useState(false)
  const [editandoId,setEditandoId]= useState<string | null>(null)
  const [salvando,  setSalvando]  = useState(false)

  const [nome,               setNome]               = useState('')
  const [tipo,               setTipo]               = useState('outro')
  const [descontoPercentual, setDescontoPercentual] = useState('0')
  const [descontoMaximo,     setDescontoMaximo]     = useState('0')
  const [editandoPadrao,     setEditandoPadrao]     = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await financeiroApi.formasPagamento()
      setFormas([...data].sort((a, b) => {
        const ia = TIPOS.indexOf(a.tipo)
        const ib = TIPOS.indexOf(b.tipo)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      }))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function abrirNova() {
    setNome(''); setTipo('outro'); setDescontoPercentual('0'); setDescontoMaximo('0')
    setEditandoId(null); setEditandoPadrao(false); setFormOpen(true)
  }

  function abrirEdicao(f: FormaPagamento) {
    setNome(f.nome); setTipo(f.tipo)
    setDescontoPercentual(String(Number(f.desconto_percentual)))
    setDescontoMaximo(String(Number(f.desconto_maximo)))
    setEditandoId(f.id); setEditandoPadrao(!!f.padrao_sistema); setFormOpen(true)
  }

  async function handleSalvar() {
    if (!editandoPadrao && !nome) return
    setSalvando(true)
    try {
      const data = { nome, tipo, desconto_percentual: parseFloat(descontoPercentual), desconto_maximo: parseFloat(descontoMaximo) }
      if (editandoId) await financeiroApi.atualizarFormaPagamento(editandoId, data as any)
      else await financeiroApi.criarFormaPagamento(data as any)
      await load(); setFormOpen(false)
    } finally { setSalvando(false) }
  }

  async function handleRemover(id: string) {
    if (!confirm('Remover esta forma de pagamento?')) return
    try {
      await financeiroApi.removerFormaPagamento(id)
      setFormas(f => f.filter(x => x.id !== id))
      setFormOpen(false)
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao remover.')
    }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10 flex flex-col gap-6">

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          As formas padrão do sistema não podem ser removidas. Você pode ajustar os descontos.
        </p>

        {/* ── Edit panel ───��──────────────────────────────────────────────── */}
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
                <input
                  type="number" min="0" value={descontoMaximo}
                  onChange={e => setDescontoMaximo(e.target.value)}
                  onFocus={focusIn} onBlur={focusOut}
                  className="min-h-[48px] px-4 outline-none w-full"
                  style={INPUT_STYLE}
                />
              </div>
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
                style={CARD}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              >
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
                  {f.padrao_sistema && (
                    <span
                      className="px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
                    >
                      Sistema
                    </span>
                  )}
                  <p style={{
                    fontSize: '11px',
                    color: Number(f.desconto_percentual) > 0 ? 'rgba(100,220,160,0.8)' : 'rgba(255,255,255,0.25)',
                  }}>
                    {Number(f.desconto_percentual) > 0
                      ? `${Number(f.desconto_percentual).toFixed(1)}% desc.`
                      : 'Sem desconto'}
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
    </>
  )
}
