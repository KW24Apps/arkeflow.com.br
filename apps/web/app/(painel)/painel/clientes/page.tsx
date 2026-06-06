'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { clientesApi, type Cliente } from '@/lib/api/clientes'

const ROW = {
  background: 'rgba(8,18,30,0.35)',
  border: '0.5px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
}

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
      <TopBar />
      <main className="flex-1 p-4 md:p-5 overflow-y-auto pb-20">

        {/* Search */}
        <div className="mb-4">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(q)}
            placeholder="Buscar por nome, telefone ou CPF..."
            className="w-full outline-none"
            style={{
              background: 'rgba(8,18,30,0.5)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
        </div>

        {(() => {
          const lower = q.toLowerCase()
          const filtered = q ? clientes.filter(c =>
            [c.nome, c.telefone, c.cpf].some(f => f?.toLowerCase().includes(lower))
          ) : clientes
          return loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span style={{ fontSize: '36px', opacity: 0.3 }}>{q ? '🔍' : '👤'}</span>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{q ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado'}</p>
            {!q && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Toque no + para adicionar</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(c => (
              <Link
                key={c.id}
                href={`/painel/clientes/${c.id}`}
                className="flex items-center gap-3 transition-all active:scale-[0.995]"
                style={{ ...ROW, padding: '10px 12px' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                <div className="flex items-center justify-center shrink-0"
                  style={{ width: '36px', height: '36px', background: 'rgba(0,239,255,0.1)', borderRadius: '8px' }}>
                  <span style={{ color: 'rgba(0,239,255,0.7)', fontWeight: 600, fontSize: '14px' }}>
                    {c.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.82)' }}>
                    {c.nome}
                  </p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {c.telefone || c.cpf || c.email || 'Sem contato'}
                  </p>
                </div>
                {Number(c.saldo_cashback) > 0 && (
                  <div className="text-right shrink-0">
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>Cashback</p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(100,220,160,0.85)', marginTop: '1px' }}>
                      R$ {Number(c.saldo_cashback).toFixed(2)}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )
        })()}

        <Link href="/painel/clientes/novo"
          className="fixed bottom-6 right-6 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{
            width: '48px', height: '48px',
            background: 'rgba(0,239,255,0.9)',
            borderRadius: '50%',
            color: '#0a1e2a',
            fontSize: '24px', fontWeight: 700,
          }}
        >
          +
        </Link>
      </main>
    </>
  )
}
