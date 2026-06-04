'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'
import { useAuthStore } from '@/store/auth.store'

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function ColaboradoresPage() {
  const usuarioLogado = useAuthStore(s => s.usuario)
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

  function horarioLabel(c: Colaborador) {
    if (!c.dias_semana && !c.hora_inicio) return null
    const dias = c.dias_semana?.map(d => DIAS_ABREV[d]).join(', ') ?? ''
    const hora = c.hora_inicio && c.hora_fim ? ` · ${c.hora_inicio}–${c.hora_fim}` : ''
    return dias + hora
  }

  return (
    <>
      <TopBar title="Colaboradores" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-6">
        <div className="max-w-lg flex flex-col gap-2">

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            colaboradores.map(c => {
              const isMe   = c.id === usuarioLogado?.id
              const isDono = c.nivel === 'dono_loja'
              const horario = horarioLabel(c)

              return (
                <div key={c.id} className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                    <span className="text-sea-foam font-semibold text-sm">{c.nome.charAt(0).toUpperCase()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sea-foam font-medium text-sm">{c.nome}</p>
                      {isDono && (
                        <span className="bg-electric-cyan/20 text-electric-cyan text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">Dono</span>
                      )}
                      {isMe && (
                        <span className="bg-ocean-depth text-steel text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Você</span>
                      )}
                      {!c.ativo && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Bloqueado</span>
                      )}
                    </div>
                    <p className="text-steel text-xs">{c.email}</p>
                    {!isDono && <p className="text-steel text-xs mt-0.5">{c.permissoes.length} menu(s)</p>}
                    {horario && <p className="text-teal-current text-xs mt-0.5">🕐 {horario}</p>}
                    {c.ultimo_acesso && (
                      <p className="text-steel text-xs">
                        Último acesso: {new Date(c.ultimo_acesso).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Link href={`/painel/colaboradores/${c.id}`}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan rounded-lg hover:bg-ocean-depth flex items-center justify-center text-sm transition-colors">
                      ✏️
                    </Link>
                    {!isDono && !isMe && (
                      <button onClick={() => handleDesativar(c.id)}
                        className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth flex items-center justify-center text-sm transition-colors">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <Link href="/painel/colaboradores/novo"
          className="fixed bottom-6 right-6 w-14 h-14 bg-electric-cyan text-midnight rounded-full text-2xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          +
        </Link>
      </main>
    </>
  )
}
