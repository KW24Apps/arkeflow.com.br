'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clientesApi, type Cliente } from '@/lib/api/clientes'
import { usePDVStore } from '@/store/pdv.store'

export default function PDVClientePage() {
  const router = useRouter()
  const setCliente = usePDVStore(s => s.setCliente)
  const [q, setQ] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)

  async function buscar(busca: string) {
    if (!busca.trim()) { setClientes([]); return }
    setLoading(true)
    try { setClientes(await clientesApi.list(busca)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(() => buscar(q), 300)
    return () => clearTimeout(t)
  }, [q])

  function selecionar(c: Cliente) {
    setCliente(c.id, c.nome)
    router.back()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-deep-ocean border-b border-ocean-depth flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sea-foam text-xl px-1">←</button>
        <h2 className="text-sea-foam font-semibold text-sm">Vincular cliente</h2>
      </div>

      <div className="p-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nome, telefone ou CPF..."
          autoFocus
          className="w-full min-h-[52px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
        ) : clientes.length === 0 && q ? (
          <div className="text-center py-8">
            <p className="text-steel text-sm mb-3">Nenhum cliente encontrado</p>
            <button onClick={() => router.push('/pdv/novo-cliente')}
              className="min-h-[48px] px-6 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold">
              + Cadastrar novo cliente
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clientes.map(c => (
              <button key={c.id} onClick={() => selecionar(c)}
                className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center gap-3 text-left active:bg-ocean-depth">
                <div className="w-10 h-10 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                  <span className="text-sea-foam font-semibold">{c.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sea-foam font-medium text-sm">{c.nome}</p>
                  <p className="text-steel text-xs">{c.telefone || c.cpf || ''}</p>
                </div>
                {Number(c.saldo_cashback) > 0 && (
                  <p className="text-mint-green text-xs shrink-0">R$ {Number(c.saldo_cashback).toFixed(2)} CB</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
