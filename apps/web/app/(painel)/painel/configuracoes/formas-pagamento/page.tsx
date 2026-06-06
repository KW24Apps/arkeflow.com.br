'use client'

import { useEffect, useState } from 'react'
import { Banknote, QrCode, CreditCard, Receipt, Wallet, Plus } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'

const TIPOS = ['dinheiro', 'pix', 'debito', 'credito', 'crediario', 'outro']

function TipoIcon({ tipo, size = 22 }: { tipo: string; size?: number }) {
  const cls = 'text-sea-foam/50'
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

        <p className="text-steel text-sm">
          As formas padrão do sistema não podem ser removidas. Você pode ajustar os descontos.
        </p>

        {/* ── Edit panel — always above the grid ─────────────────────────── */}
        {formOpen && (
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sea-foam font-semibold text-sm">
              {editandoId ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
            </p>

            {editandoPadrao ? (
              <div className="bg-midnight border border-ocean-depth rounded-xl px-4 py-3">
                <p className="text-sea-foam text-sm font-medium">{nome}</p>
                <p className="text-steel text-xs capitalize mt-0.5">{tipo}</p>
              </div>
            ) : (
              <>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome *"
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none">
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Desconto %</label>
                <input type="number" min="0" max="100" value={descontoPercentual}
                  onChange={e => setDescontoPercentual(e.target.value)}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Desc. máx. R$</label>
                <input type="number" min="0" value={descontoMaximo}
                  onChange={e => setDescontoMaximo(e.target.value)}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {editandoId && !editandoPadrao ? (
                <button onClick={() => handleRemover(editandoId)}
                  className="text-xs text-red-400/60 hover:text-red-400 transition-colors min-h-[44px] px-1">
                  Remover
                </button>
              ) : <span />}
              <div className="flex gap-3">
                <button onClick={() => setFormOpen(false)}
                  className="min-h-[44px] px-6 border border-ocean-depth text-steel rounded-xl text-sm hover:text-sea-foam transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSalvar} disabled={salvando || (!editandoPadrao && !nome)}
                  className="min-h-[44px] px-6 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
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
                className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex flex-col items-center gap-3 text-center hover:border-electric-cyan/40 hover:bg-ocean-depth/40 active:scale-[0.97] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-midnight flex items-center justify-center shrink-0">
                  <TipoIcon tipo={f.tipo} />
                </div>
                <div className="flex flex-col items-center gap-1 w-full min-w-0">
                  <p className="text-sea-foam font-medium text-sm truncate w-full">{f.nome}</p>
                  {f.padrao_sistema && (
                    <span className="bg-ocean-depth text-steel text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Sistema
                    </span>
                  )}
                  <p className={`text-xs ${Number(f.desconto_percentual) > 0 ? 'text-mint-green' : 'text-steel/50'}`}>
                    {Number(f.desconto_percentual) > 0
                      ? `${Number(f.desconto_percentual).toFixed(1)}% desc.`
                      : 'Sem desconto'}
                  </p>
                </div>
              </button>
            ))}

            {/* + Nova forma */}
            {!formOpen && (
              <button
                onClick={abrirNova}
                className="border-2 border-dashed border-ocean-depth rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-steel hover:border-electric-cyan/50 hover:text-electric-cyan transition-colors min-h-[140px]"
              >
                <Plus size={24} strokeWidth={1.5} />
                <span className="text-sm font-medium">Nova forma</span>
              </button>
            )}

          </div>
        )}
      </main>
    </>
  )
}
