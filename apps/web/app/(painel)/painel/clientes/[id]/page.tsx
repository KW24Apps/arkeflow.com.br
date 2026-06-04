'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { clientesApi, type Cliente, type VendaHistorico } from '@/lib/api/clientes'
import { cashbackApi, type RegraCashback } from '@/lib/api/cashback'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'
import { ContatosForm, type Contato } from '@/components/painel/ContatosForm'
import { api } from '@/lib/api/client'

type Aba = 'dados' | 'contatos' | 'medidas' | 'compras'

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

  // Contatos do cliente
  const [contatos, setContatos] = useState<Contato[]>([])

  // Medidas corporais
  const [medidasDisponiveis, setMedidasDisponiveis] = useState<ItemCatalogo[]>([])
  const [medidasCliente, setMedidasCliente] = useState<Record<string,string>>({})
  const [addingMedida,   setAddingMedida]   = useState(false)
  const [novaMedNome,    setNovaMedNome]    = useState('')
  const [novaMedValor,   setNovaMedValor]   = useState('')
  const [salvandoMed,    setSalvandoMed]    = useState(false)

  useEffect(() => {
    Promise.all([clientesApi.get(id), clientesApi.historico(id), cashbackApi.list(), catalogosApi.list('medidas'), api.get<Contato[]>(`/clientes/${id}/contatos`).then(r => r.data)])
      .then(([c, h, rs, meds, cts]) => {
        setCliente(c); setHistorico(h); setRegras(rs)
        setMedidasDisponiveis(meds); setContatos(cts)
        setMedidasCliente((c as any).medidas_json ?? {})
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

  async function handleSalvarMedida() {
    if (!novaMedNome || !novaMedValor) return
    setSalvandoMed(true)
    try {
      const novas = { ...medidasCliente, [novaMedNome]: novaMedValor }
      await clientesApi.update(id, { medidas_json: novas } as any)
      setMedidasCliente(novas)
      setAddingMedida(false); setNovaMedNome(''); setNovaMedValor('')
    } finally { setSalvandoMed(false) }
  }

  async function handleRemoverMedida(chave: string) {
    const novas = { ...medidasCliente }
    delete novas[chave]
    await clientesApi.update(id, { medidas_json: novas } as any)
    setMedidasCliente(novas)
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
          {([
            { key: 'dados',    label: 'Dados' },
            { key: 'contatos', label: `Contatos (${contatos.length})` },
            { key: 'medidas',  label: `Medidas (${Object.keys(medidasCliente).length})` },
            { key: 'compras',  label: `Compras (${historico.length})` },
          ] as { key: Aba; label: string }[]).map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`min-h-[44px] px-5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                aba === a.key ? 'text-electric-cyan border-electric-cyan' : 'text-steel border-transparent hover:text-sea-foam'
              }`}>
              {a.label}
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

            {/* ── Aba Contatos ── */}
            {aba === 'contatos' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                <h3 className="text-sea-foam font-semibold text-sm mb-1">Contatos</h3>
                <p className="text-steel text-xs mb-4">Comercial, financeiro e sócio/representante para comunicações direcionadas.</p>
                <ContatosForm
                  contatos={contatos}
                  onAdd={async (c) => {
                    const { data } = await api.post<Contato>(`/clientes/${id}/contatos`, c)
                    setContatos(prev => [...prev, data])
                  }}
                  onRemove={async (cid) => {
                    await api.delete(`/clientes/${id}/contatos/${cid}`)
                    setContatos(prev => prev.filter(x => x.id !== cid))
                  }}
                />
              </section>
            )}

            {/* ── Aba Medidas ── */}
            {aba === 'medidas' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sea-foam font-semibold text-sm">Medidas Corporais</h3>
                    <p className="text-steel text-xs mt-0.5">Usado para filtrar produtos que se encaixam no cliente</p>
                  </div>
                </div>

                {/* Medidas existentes */}
                {Object.entries(medidasCliente).map(([chave, valor]) => (
                  <div key={chave} className="flex items-center justify-between bg-midnight rounded-xl px-4 py-3">
                    <div>
                      <p className="text-steel text-xs">{chave}</p>
                      <p className="text-sea-foam font-semibold">{valor}</p>
                    </div>
                    <button onClick={() => handleRemoverMedida(chave)}
                      className="text-steel hover:text-red-400 text-xl min-h-[40px] min-w-[40px] flex items-center justify-center">×</button>
                  </div>
                ))}

                {/* Adicionar medida */}
                {addingMedida ? (
                  <div className="flex flex-col gap-3 bg-midnight rounded-xl p-3">
                    <select value={novaMedNome} onChange={e => setNovaMedNome(e.target.value)}
                      className="min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none">
                      <option value="">Selecione a medida...</option>
                      {medidasDisponiveis.filter(m => !(m.nome in medidasCliente)).map(m => (
                        <option key={m.id} value={m.nome}>{m.nome}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input value={novaMedValor} onChange={e => setNovaMedValor(e.target.value)}
                        placeholder="Ex: 96cm"
                        className="flex-1 min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                      <button onClick={handleSalvarMedida} disabled={salvandoMed || !novaMedNome || !novaMedValor}
                        className="min-h-[48px] px-4 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                        {salvandoMed ? '...' : 'OK'}
                      </button>
                      <button onClick={() => { setAddingMedida(false); setNovaMedNome(''); setNovaMedValor('') }}
                        className="min-h-[48px] px-3 text-steel rounded-xl">×</button>
                    </div>
                  </div>
                ) : (
                  medidasDisponiveis.some(m => !(m.nome in medidasCliente)) && (
                    <button onClick={() => setAddingMedida(true)}
                      className="text-xs text-electric-cyan/70 hover:text-electric-cyan self-start min-h-[36px]">
                      + Adicionar medida
                    </button>
                  )
                )}

                {Object.keys(medidasCliente).length === 0 && !addingMedida && (
                  <p className="text-steel text-sm text-center py-4">Nenhuma medida cadastrada</p>
                )}
              </section>
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
