'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { clientesApi, type Cliente, type VendaHistorico } from '@/lib/api/clientes'
import { cashbackApi, type RegraCashback } from '@/lib/api/cashback'

type Aba = 'dados' | 'compras'

export default function ClienteDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const [aba, setAba] = useState<Aba>('dados')

  const [cliente,   setCliente]   = useState<Cliente | null>(null)
  const [historico, setHistorico] = useState<VendaHistorico[]>([])
  const [regras,    setRegras]    = useState<RegraCashback[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editando,  setEditando]  = useState(false)
  const [salvando,  setSalvando]  = useState(false)

  const [nome,            setNome]            = useState('')
  const [telefone,        setTelefone]        = useState('')
  const [cpf,             setCpf]             = useState('')
  const [email,           setEmail]           = useState('')
  const [regraCashbackId, setRegraCashbackId] = useState('')

  useEffect(() => {
    Promise.all([clientesApi.get(id), clientesApi.historico(id), cashbackApi.list()])
      .then(([c, h, rs]) => {
        setCliente(c); setHistorico(h); setRegras(rs)
        setNome(c.nome); setTelefone(c.telefone ?? '')
        setCpf(c.cpf ?? ''); setEmail(c.email ?? '')
        setRegraCashbackId(c.regra_cashback_id ?? '')
      }).finally(() => setLoading(false))
  }, [id])

  async function handleSalvar() {
    setSalvando(true)
    try {
      const c = await clientesApi.update(id, {
        nome, telefone: telefone || undefined, cpf: cpf || undefined,
        email: email || undefined, regra_cashback_id: regraCashbackId || null,
      } as any)
      setCliente(c); setEditando(false)
    } finally { setSalvando(false) }
  }

  async function handleDelete() {
    if (!confirm('Remover este cliente?')) return
    await clientesApi.remove(id)
    router.push('/painel/clientes')
  }

  if (loading) return (
    <><TopBar title="Cliente" />
      <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
    </>
  )
  if (!cliente) return <><TopBar title="Cliente" /><p className="text-center text-steel py-16">Não encontrado.</p></>

  const totalGasto = historico.reduce((s, v) => s + Number(v.total), 0)

  return (
    <>
      <TopBar title={cliente.nome} />
      <main className="flex-1 overflow-y-auto pb-10">

        {/* Abas */}
        <div className="bg-deep-ocean border-b border-ocean-depth flex px-4">
          {(['dados', 'compras'] as Aba[]).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`min-h-[44px] px-6 text-sm font-medium border-b-2 capitalize transition-colors ${
                aba === a ? 'text-electric-cyan border-electric-cyan' : 'text-steel border-transparent hover:text-sea-foam'
              }`}>
              {a === 'dados' ? 'Dados' : `Compras (${historico.length})`}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          <div className="max-w-lg flex flex-col gap-4">

            {/* ── Aba Dados ── */}
            {aba === 'dados' && (
              <>
                {/* Resumo cashback */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 text-center">
                    <p className="text-steel text-xs mb-1">Compras</p>
                    <p className="text-sea-foam font-bold text-xl">{historico.length}</p>
                  </div>
                  <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 text-center">
                    <p className="text-steel text-xs mb-1">Total gasto</p>
                    <p className="text-sea-foam font-bold text-sm">R$ {totalGasto.toFixed(2)}</p>
                  </div>
                  <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 text-center">
                    <p className="text-steel text-xs mb-1">Cashback</p>
                    <p className="text-mint-green font-bold text-sm">R$ {Number(cliente.saldo_cashback).toFixed(2)}</p>
                  </div>
                </div>

                {/* Dados editáveis */}
                <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sea-foam font-semibold text-sm">Informações</p>
                    <button onClick={() => setEditando(v => !v)}
                      className="text-xs text-electric-cyan/70 hover:text-electric-cyan">
                      {editando ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>

                  {editando ? (
                    <div className="flex flex-col gap-3">
                      <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
                      <Input label="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
                      <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} />
                      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                      {regras.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-steel uppercase tracking-wider">Regra de Cashback</label>
                          <select value={regraCashbackId} onChange={e => setRegraCashbackId(e.target.value)}
                            className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none">
                            <option value="">Sem cashback</option>
                            {regras.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.nome} — {Number(r.percentual).toFixed(1)}%
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button onClick={handleSalvar} disabled={salvando}
                        className="min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                        {salvando ? 'Salvando...' : 'Salvar alterações'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-sea-foam font-medium">{cliente.nome}</p>
                      {cliente.telefone && <p className="text-steel text-sm">📞 {cliente.telefone}</p>}
                      {cliente.cpf      && <p className="text-steel text-sm">🪪 {cliente.cpf}</p>}
                      {cliente.email    && <p className="text-steel text-sm">✉️ {cliente.email}</p>}
                      {(cliente as any).regra_cashback_nome && (
                        <p className="text-steel text-sm">
                          💳 {(cliente as any).regra_cashback_nome} — {Number((cliente as any).regra_cashback_percentual).toFixed(1)}% cashback
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <button onClick={handleDelete}
                  className="min-h-[48px] border border-red-500/30 text-red-400 rounded-2xl text-sm">
                  Remover cliente
                </button>
              </>
            )}

            {/* ── Aba Compras ── */}
            {aba === 'compras' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                {historico.length === 0 ? (
                  <p className="text-steel text-sm text-center py-8">Nenhuma compra registrada</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {historico.map(v => (
                      <div key={v.id} className="flex items-center justify-between bg-midnight rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sea-foam text-sm font-medium">R$ {Number(v.total).toFixed(2)}</p>
                          <p className="text-steel text-xs">
                            {new Date(v.criado_em).toLocaleDateString('pt-BR')} · {v.total_itens} item(ns)
                          </p>
                        </div>
                        {Number(v.cashback_gerado) > 0 && (
                          <p className="text-mint-green text-xs">+R$ {Number(v.cashback_gerado).toFixed(2)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </main>
    </>
  )
}
