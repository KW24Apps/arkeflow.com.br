'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { clientesApi, type Cliente, type VendaHistorico } from '@/lib/api/clientes'

export default function ClienteDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [cliente,   setCliente]   = useState<Cliente | null>(null)
  const [historico, setHistorico] = useState<VendaHistorico[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editando,  setEditando]  = useState(false)
  const [salvando,  setSalvando]  = useState(false)

  const [nome,     setNome]     = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf,      setCpf]      = useState('')
  const [email,    setEmail]    = useState('')

  useEffect(() => {
    Promise.all([clientesApi.get(id), clientesApi.historico(id)])
      .then(([c, h]) => {
        setCliente(c); setHistorico(h)
        setNome(c.nome); setTelefone(c.telefone ?? '')
        setCpf(c.cpf ?? ''); setEmail(c.email ?? '')
      }).finally(() => setLoading(false))
  }, [id])

  async function handleSalvar() {
    setSalvando(true)
    try {
      const c = await clientesApi.update(id, { nome, telefone: telefone || undefined, cpf: cpf || undefined, email: email || undefined })
      setCliente(c); setEditando(false)
    } finally { setSalvando(false) }
  }

  async function handleDelete() {
    if (!confirm('Remover este cliente?')) return
    await clientesApi.remove(id)
    router.push('/painel/clientes')
  }

  if (loading) return (
    <>
      <TopBar title="Cliente" />
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  )
  if (!cliente) return <><TopBar title="Cliente" /><p className="text-center text-steel py-16">Não encontrado.</p></>

  const totalGasto = historico.reduce((s, v) => s + Number(v.total), 0)

  return (
    <>
      <TopBar title={cliente.nome} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          {/* Perfil */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-ocean-depth flex items-center justify-center">
                  <span className="text-sea-foam font-bold text-lg">{cliente.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sea-foam font-semibold">{cliente.nome}</p>
                  <p className="text-steel text-xs">
                    Cliente desde {new Date(cliente.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditando(v => !v)}
                className="text-xs text-electric-cyan/70 hover:text-electric-cyan">
                {editando ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {editando ? (
              <div className="flex flex-col gap-3">
                <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
                <Input label="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <button onClick={handleSalvar} disabled={salvando}
                  className="min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {cliente.telefone && <p className="text-steel text-sm">📞 {cliente.telefone}</p>}
                {cliente.cpf      && <p className="text-steel text-sm">🪪 {cliente.cpf}</p>}
                {cliente.email    && <p className="text-steel text-sm">✉️ {cliente.email}</p>}
              </div>
            )}
          </section>

          {/* Resumo */}
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

          {/* Regra de cashback */}
          {cliente.regra_cashback_nome && (
            <div className="bg-deep-ocean border border-ocean-depth rounded-2xl px-5 py-3 flex items-center justify-between">
              <span className="text-steel text-sm">Regra de cashback</span>
              <span className="text-sea-foam text-sm font-medium">
                {cliente.regra_cashback_nome} · {cliente.regra_cashback_percentual}%
              </span>
            </div>
          )}

          {/* Histórico */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider mb-3">
              Histórico de compras
            </h3>
            {historico.length === 0 ? (
              <p className="text-steel text-sm text-center py-4">Nenhuma compra ainda</p>
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

          <button onClick={handleDelete}
            className="min-h-[48px] border border-red-500/30 text-red-400 rounded-2xl text-sm">
            Remover cliente
          </button>

        </div>
      </main>
    </>
  )
}
