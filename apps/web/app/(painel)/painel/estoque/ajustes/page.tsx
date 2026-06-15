'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { estoqueApi, type ItemEstoque } from '@/lib/api/estoque'
import { fornecedoresApi, type Fornecedor } from '@/lib/api/fornecedores'

export default function EstoqueAjustesPage() {
  const [items,         setItems]         = useState<ItemEstoque[]>([])
  const [loading,       setLoading]       = useState(true)
  const [q,             setQ]             = useState('')
  const [selecionado,   setSelecionado]   = useState<ItemEstoque | null>(null)
  const [tipo,          setTipo]          = useState<'entrada' | 'saida' | 'ajuste'>('entrada')
  const [quantidade,    setQuantidade]    = useState('')
  const [motivo,        setMotivo]        = useState('')
  const [custoUnit,     setCustoUnit]     = useState('')
  const [fornecedorId,  setFornecedorId]  = useState('')
  const [fornecedores,  setFornecedores]  = useState<Fornecedor[]>([])
  const [salvando,      setSalvando]      = useState(false)
  const [msg,           setMsg]           = useState('')

  useEffect(() => {
    estoqueApi.list().then(setItems).finally(() => setLoading(false))
    fornecedoresApi.list().then(setFornecedores).catch(() => {})
  }, [])

  const filtered = items.filter(i => !q || i.produto_nome.toLowerCase().includes(q.toLowerCase()))

  function resetForm() {
    setQuantidade(''); setMotivo(''); setCustoUnit(''); setFornecedorId('')
  }

  async function handleAjustar() {
    if (!selecionado || !quantidade) return
    setSalvando(true); setMsg('')
    try {
      const res = await estoqueApi.ajustar({
        versao_id:      selecionado.versao_id,
        tipo,
        quantidade:     parseInt(quantidade),
        motivo:         motivo || undefined,
        custo_unitario: (tipo === 'entrada' && custoUnit) ? parseFloat(custoUnit) : undefined,
        fornecedor_id:  (tipo === 'entrada' && fornecedorId) ? fornecedorId : undefined,
      })
      setItems(prev => prev.map(i =>
        i.versao_id === selecionado.versao_id
          ? { ...i, estoque_atual: res.estoque_atual, alerta: res.estoque_atual <= i.estoque_minimo }
          : i
      ))
      setSelecionado(s => s ? { ...s, estoque_atual: res.estoque_atual } : null)
      setMsg(`✓ Estoque atualizado: ${res.estoque_atual} un.`)
      resetForm()
    } catch (err: any) {
      setMsg(`Erro: ${err?.response?.data?.error ?? 'Falha ao ajustar'}`)
    } finally { setSalvando(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">
        <div className="max-w-lg flex flex-col gap-4">

          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar produto..."
            className="min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan" />

          {/* Formulário de ajuste */}
          {selecionado && (
            <div className="bg-deep-ocean border border-electric-cyan/30 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sea-foam font-semibold">{selecionado.produto_nome}</p>
                  <p className="text-steel text-xs">
                    {Object.keys(selecionado.atributos_json).length === 0 ? 'Versão única' : Object.entries(selecionado.atributos_json).map(([key, val]) => (
                      <span key={key} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 7px', color: 'rgba(255,255,255,0.45)', marginRight: '4px', display: 'inline-block' }}>
                        {key}: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{val}</span>
                      </span>
                    ))}{' '}· Atual: <span className="text-sea-foam">{selecionado.estoque_atual} un.</span>
                  </p>
                </div>
                <button onClick={() => { setSelecionado(null); setMsg(''); resetForm() }} className="text-steel hover:text-red-400">×</button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['entrada', 'saida', 'ajuste'] as const).map(t => (
                  <button key={t} onClick={() => { setTipo(t); resetForm() }}
                    className={`min-h-[44px] rounded-xl text-sm font-medium capitalize border transition-colors ${
                      tipo === t ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel hover:text-sea-foam'
                    }`}>
                    {t === 'entrada' ? '+ Entrada' : t === 'saida' ? '- Saída' : '⟳ Ajuste'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Quantidade</label>
                  <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                    placeholder="0"
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Motivo</label>
                  <input value={motivo} onChange={e => setMotivo(e.target.value)}
                    placeholder="Opcional"
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
              </div>

              {/* Campos extras — apenas em entradas */}
              {tipo === 'entrada' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-steel uppercase tracking-wider">Custo unitário</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={custoUnit}
                      onChange={e => setCustoUnit(e.target.value)}
                      placeholder="R$ 0,00"
                      className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-steel uppercase tracking-wider">Fornecedor</label>
                    <select
                      value={fornecedorId}
                      onChange={e => setFornecedorId(e.target.value)}
                      className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan"
                      style={{ background: 'rgba(8,10,20,1)', border: '0.5px solid rgba(255,255,255,0.09)' }}
                    >
                      <option value="">Opcional</option>
                      {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>{f.razao_social}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {msg && <p className={`text-xs text-center ${msg.startsWith('✓') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}

              <button onClick={handleAjustar} disabled={salvando || !quantidade}
                className="min-h-[52px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                {salvando ? 'Salvando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          )}

          {/* Lista de produtos */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(item => {
                const sel = selecionado?.versao_id === item.versao_id
                return (
                  <button key={item.versao_id} onClick={() => { setSelecionado(item); setMsg(''); resetForm() }}
                    className={`text-left bg-deep-ocean border rounded-2xl p-4 flex items-center justify-between transition-colors ${
                      sel ? 'border-electric-cyan' : 'border-ocean-depth hover:border-teal-current'
                    }`}>
                    <div>
                      <p className="text-sea-foam text-sm font-medium">{item.produto_nome}</p>
                      <p className="text-steel text-xs">
                        {Object.keys(item.atributos_json).length === 0 ? 'Versão única' : Object.entries(item.atributos_json).map(([key, val]) => (
                          <span key={key} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 7px', color: 'rgba(255,255,255,0.45)', marginRight: '4px', display: 'inline-block' }}>
                            {key}: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{val}</span>
                          </span>
                        ))}
                      </p>
                    </div>
                    <p className={`font-bold text-lg ${item.alerta ? 'text-yellow-400' : 'text-sea-foam'}`}>
                      {item.estoque_atual}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
