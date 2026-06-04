'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'

const TIPOS = ['dinheiro', 'pix', 'debito', 'credito', 'crediario', 'outro']

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

  async function load() {
    setLoading(true)
    try { setFormas(await financeiroApi.formasPagamento()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function abrirNova() {
    setNome(''); setTipo('outro'); setDescontoPercentual('0'); setDescontoMaximo('0')
    setEditandoId(null); setFormOpen(true)
  }

  function abrirEdicao(f: FormaPagamento) {
    setNome(f.nome); setTipo(f.tipo)
    setDescontoPercentual(String(Number(f.desconto_percentual)))
    setDescontoMaximo(String(Number(f.desconto_maximo)))
    setEditandoId(f.id); setFormOpen(true)
  }

  async function handleSalvar() {
    if (!nome) return
    setSalvando(true)
    try {
      const data = {
        nome, tipo,
        desconto_percentual: parseFloat(descontoPercentual),
        desconto_maximo: parseFloat(descontoMaximo),
      }
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
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao remover.')
    }
  }

  return (
    <>
      <TopBar title="Formas de Pagamento" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          <p className="text-steel text-sm">
            As formas padrão do sistema não podem ser removidas. Você pode ajustar os descontos.
          </p>

          {/* Formulário */}
          {formOpen && (
            <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
              <p className="text-sea-foam font-semibold text-sm">{editandoId ? 'Editar' : 'Nova forma de pagamento'}</p>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome *"
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none">
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Desconto %</label>
                  <input type="number" min="0" max="100" value={descontoPercentual} onChange={e => setDescontoPercentual(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Desc. máx. R$</label>
                  <input type="number" min="0" value={descontoMaximo} onChange={e => setDescontoMaximo(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setFormOpen(false)} className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">Cancelar</button>
                <button onClick={handleSalvar} disabled={salvando || !nome}
                  className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="flex flex-col gap-2">
              {formas.map(f => (
                <div key={f.id} className="bg-deep-ocean border border-ocean-depth rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sea-foam font-medium text-sm">{f.nome}</p>
                      {f.padrao_sistema && (
                        <span className="bg-ocean-depth text-steel text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Sistema</span>
                      )}
                    </div>
                    <p className="text-steel text-xs mt-0.5">
                      {f.tipo}
                      {Number(f.desconto_percentual) > 0 ? ` · ${Number(f.desconto_percentual).toFixed(1)}% desc.` : ''}
                      {Number(f.desconto_maximo) > 0 ? ` (máx. R$ ${Number(f.desconto_maximo).toFixed(2)})` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEdicao(f)}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center">✏️</button>
                    {!f.padrao_sistema && (
                      <button onClick={() => handleRemover(f.id)}
                        className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center">🗑️</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!formOpen && (
            <button onClick={abrirNova}
              className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold">
              + Nova Forma de Pagamento
            </button>
          )}
        </div>
      </main>
    </>
  )
}
