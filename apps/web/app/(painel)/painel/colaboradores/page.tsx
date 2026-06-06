'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'
import { useAuthStore } from '@/store/auth.store'

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
}

function lastAccessLabel(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 2)   return 'agora'
  if (diff < 60)  return `há ${diff}min`
  const h = Math.floor(diff / 60)
  if (h  < 24)  return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d  < 7)   return `há ${d}d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function ColaboradoresPage() {
  const router         = useRouter()
  const usuarioLogado  = useAuthStore(s => s.usuario)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    colaboradoresApi.list().then(setColaboradores).finally(() => setLoading(false))
  }, [])

  async function handleToggleAtivo(c: Colaborador) {
    const novoStatus = !c.ativo
    await colaboradoresApi.updateAcesso(c.id, { ativo: novoStatus })
    setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, ativo: novoStatus } : x))
  }

  function horarioLabel(c: Colaborador) {
    if (!c.dias_semana && !c.hora_inicio) return null
    const dias = c.dias_semana?.map(d => DIAS_ABREV[d]).join(', ') ?? ''
    const hora = c.hora_inicio && c.hora_fim ? ` · ${c.hora_inicio}–${c.hora_fim}` : ''
    return dias + hora
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 p-4 md:p-5 overflow-y-auto pb-20">

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {colaboradores.map(c => {
              const isMe    = c.id === usuarioLogado?.id
              const isDono  = c.nivel === 'dono_loja'
              const horario = horarioLabel(c)

              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/painel/colaboradores/${c.id}`)}
                  className="p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all"
                  style={{ ...CARD, opacity: c.ativo ? 1 : 0.5 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
                >
                  {/* Top row: avatar + info */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(0,239,255,0.15)' }}
                    >
                      <span style={{ color: '#0ef', fontWeight: 600, fontSize: '15px' }}>
                        {c.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Name + badges + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, fontSize: '14px' }}>
                          {c.nome}
                        </p>
                        {isDono && (
                          <span style={{
                            background: 'rgba(0,239,255,0.15)', color: '#0ef',
                            fontSize: '9px', padding: '2px 7px', borderRadius: '9999px',
                            textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
                          }}>
                            Dono
                          </span>
                        )}
                        {isMe && (
                          <span style={{
                            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)',
                            fontSize: '9px', padding: '2px 7px', borderRadius: '9999px',
                            textTransform: 'uppercase',
                          }}>
                            Você
                          </span>
                        )}
                      </div>

                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '3px' }}>
                        {c.email}
                      </p>

                      {c.ultimo_acesso && (
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '2px' }}>
                          {lastAccessLabel(c.ultimo_acesso)}
                        </p>
                      )}

                      {horario && (
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '2px' }}>
                          {horario}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Toggle pill — only for non-dono, non-self */}
                  {!isDono && !isMe && (
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleAtivo(c) }}
                      className="self-start font-medium uppercase tracking-wide transition-opacity"
                      style={c.ativo ? {
                        background: 'rgba(100,220,160,0.15)', color: 'rgba(100,220,160,0.8)',
                        fontSize: '10px', padding: '3px 10px', borderRadius: '9999px', border: 'none',
                      } : {
                        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)',
                        fontSize: '10px', padding: '3px 10px', borderRadius: '9999px', border: 'none',
                      }}
                    >
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* FAB — new collaborator */}
        <Link
          href="/painel/colaboradores/novo"
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
