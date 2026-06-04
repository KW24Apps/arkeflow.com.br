'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    colaboradoresApi.list().then(setColaboradores).finally(() => setLoading(false))
  }, [])

  async function handleDesativar(id: string) {
    if (!confirm('Desativar este colaborador?')) return
    await colaboradoresApi.remove(id)
    setColaboradores(prev => prev.filter(c => c.id !== id))
  }

  return (
    <>
      <TopBar title="Colaboradores" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-6">

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">👥</span>
            <p className="text-sea-foam font-medium">Nenhum colaborador cadastrado</p>
            <p className="text-steel text-sm">Toque no + para adicionar</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-lg">
            {colaboradores.map(c => (
              <div key={c.id} className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                  <span className="text-sea-foam font-semibold text-sm">{c.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sea-foam font-medium text-sm">{c.nome}</p>
                  <p className="text-steel text-xs">{c.email}</p>
                  <p className="text-steel text-xs mt-0.5">
                    {c.permissoes.length} menu(s) liberado(s)
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`/painel/colaboradores/${c.id}`}
                    className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan rounded-lg hover:bg-ocean-depth flex items-center justify-center text-sm transition-colors">
                    ✏️
                  </Link>
                  <button onClick={() => handleDesativar(c.id)}
                    className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth flex items-center justify-center text-sm transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/painel/colaboradores/novo"
          className="fixed bottom-6 right-6 w-14 h-14 bg-electric-cyan text-midnight rounded-full text-2xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          +
        </Link>
      </main>
    </>
  )
}
