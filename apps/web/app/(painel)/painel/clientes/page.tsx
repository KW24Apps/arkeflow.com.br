'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { clientesApi, type Cliente } from '@/lib/api/clientes'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [q,        setQ]        = useState('')
  const [loading,  setLoading]  = useState(true)

  async function load(busca?: string) {
    setLoading(true)
    try { setClientes(await clientesApi.list(busca || undefined)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <>
      <TopBar title="Clientes" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-6">

        <div className="flex gap-3 mb-5">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(q)}
            placeholder="Buscar por nome, telefone ou CPF..."
            className="flex-1 min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
          />
          <button onClick={() => load(q)}
            className="min-h-[48px] px-5 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold">
            Buscar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">👤</span>
            <p className="text-sea-foam font-medium">Nenhum cliente cadastrado</p>
            <p className="text-steel text-sm">Toque no + para adicionar</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clientes.map(c => (
              <Link key={c.id} href={`/painel/clientes/${c.id}`}
                className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center gap-4 active:bg-ocean-depth transition-colors">
                <div className="w-10 h-10 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                  <span className="text-sea-foam font-semibold text-sm">
                    {c.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sea-foam font-medium text-sm truncate">{c.nome}</p>
                  <p className="text-steel text-xs mt-0.5">
                    {c.telefone || c.cpf || c.email || 'Sem contato'}
                  </p>
                </div>
                {Number(c.saldo_cashback) > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-steel">Cashback</p>
                    <p className="text-mint-green text-sm font-semibold">
                      R$ {Number(c.saldo_cashback).toFixed(2)}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        <Link href="/painel/clientes/novo"
          className="fixed bottom-6 right-6 w-14 h-14 bg-electric-cyan text-midnight rounded-full text-2xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          +
        </Link>
      </main>
    </>
  )
}
