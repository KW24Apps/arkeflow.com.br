'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { cashbackApi, type RegraCashback } from '@/lib/api/cashback'

export default function CashbackRegrasPage() {
  const [regras,   setRegras]   = useState<RegraCashback[]>([])
  const [loading,  setLoading]  = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [nome,           setNome]           = useState('')
  const [percentual,     setPercentual]      = useState('')
  const [validadeMeses,  setValidadeMeses]   = useState('')
  const [padrao,         setPadrao]          = useState(false)
  const [editandoId,     setEditandoId]      = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setRegras(await cashbackApi.list()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function abrirNova() {
    setNome(''); setPercentual(''); setValidadeMeses(''); setPadrao(false)
    setEditandoId(null); setFormOpen(true)
  }

  function abrirEdicao(r: RegraCashback) {
    setNome(r.nome); setPercentual(String(Number(r.percentual)))
    setValidadeMeses(r.validade_meses ? String(r.validade_meses) : '')
    setPadrao(r.padrao); setEditandoId(r.id); setFormOpen(true)
  }

  async function handleSalvar() {
    if (!nome || !percentual) return
    setSaving(true)
    try {
      const data = {
        nome, percentual: parseFloat(percentual),
        validade_meses: validadeMeses ? parseInt(validadeMeses) : null,
        padrao,
      }
      if (editandoId) await cashbackApi.update(editandoId, data)
      else await cashbackApi.create(data)
      await load(); setFormOpen(false)
    } finally { setSaving(false) }
  }

  async function handleRemover(id: string) {
    if (!confirm('Remover esta regra?')) return
    await cashbackApi.remove(id); setRegras(r => r.filter(x => x.id !== id))
  }

  return (
    <>
      <TopBar title="Regras de Cashback" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          <p className="text-steel text-sm">
            Defina as regras de cashback. A regra padrão é aplicada automaticamente a todos os novos clientes.
          </p>

          {/* Formulário */}
          {formOpen && (
            <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
              <p className="text-sea-foam font-semibold text-sm">{editandoId ? 'Editar regra' : 'Nova regra'}</p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Nome</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: VIP, Padrão, Premium"
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">% Cashback</label>
                  <input type="number" min="0" max="100" value={percentual} onChange={e => setPercentual(e.target.value)}
                    placeholder="Ex: 5"
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Validade (meses)</label>
                  <input type="number" min="1" value={validadeMeses} onChange={e => setValidadeMeses(e.target.value)}
                    placeholder="Vazio = ilimitado"
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sea-foam text-sm font-medium">Regra padrão</p>
                  <p className="text-steel text-xs">Aplicada automaticamente a novos clientes</p>
                </div>
                <button type="button" onClick={() => setPadrao(v => !v)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${padrao ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${padrao ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setFormOpen(false)}
                  className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">
                  Cancelar
                </button>
                <button onClick={handleSalvar} disabled={saving || !nome || !percentual}
                  className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {regras.map(r => (
                <div key={r.id} className="bg-deep-ocean border border-ocean-depth rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sea-foam font-medium text-sm">{r.nome}</p>
                      {r.padrao && (
                        <span className="bg-electric-cyan/20 text-electric-cyan text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-steel text-xs mt-0.5">
                      {Number(r.percentual).toFixed(1)}% cashback
                      {r.validade_meses ? ` · vence em ${r.validade_meses} meses` : ' · sem vencimento'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrirEdicao(r)}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center">✏️</button>
                    <button onClick={() => handleRemover(r.id)}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center">🗑️</button>
                  </div>
                </div>
              ))}
              {regras.length === 0 && (
                <p className="text-center text-steel text-sm py-8">Nenhuma regra cadastrada</p>
              )}
            </div>
          )}

          {!formOpen && (
            <button onClick={abrirNova}
              className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold">
              + Nova Regra de Cashback
            </button>
          )}
        </div>
      </main>
    </>
  )
}
