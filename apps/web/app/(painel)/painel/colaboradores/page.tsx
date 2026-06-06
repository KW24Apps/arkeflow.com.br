'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'
import { useAuthStore } from '@/store/auth.store'

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const ROW = {
  background: 'rgba(8,18,30,0.35)',
  border: '0.5px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
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
          <div className="flex flex-col gap-1.5">
            {colaboradores.map(c => {
              const isMe   = c.id === usuarioLogado?.id
              const isDono = c.nivel === 'dono_loja'

              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/painel/colaboradores/${c.id}`)}
                  className="flex items-center gap-3 cursor-pointer transition-all active:scale-[0.995]"
                  style={{ ...ROW, padding: '10px 12px', opacity: c.ativo ? 1 : 0.45 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                >
                  {/* Avatar */}
                  <div className="flex items-center justify-center shrink-0"
                    style={{ width: '36px', height: '36px', background: 'rgba(0,239,255,0.15)', borderRadius: '8px' }}>
                    <span style={{ color: '#0ef', fontWeight: 600, fontSize: '14px' }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name + badges + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.82)' }}>
                        {c.nome}
                      </p>
                      {isDono && (
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(0,239,255,0.12)', color: '#0ef', borderRadius: '9999px', padding: '1px 7px', fontWeight: 600, flexShrink: 0 }}>
                          Dono
                        </span>
                      )}
                      {isMe && (
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', borderRadius: '9999px', padding: '1px 7px', flexShrink: 0 }}>
                          Você
                        </span>
                      )}
                      {!isDono && (
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', borderRadius: '9999px', padding: '1px 7px', flexShrink: 0 }}>
                          Vendedor
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{c.email}</p>
                  </div>

                  {/* Last access */}
                  {c.ultimo_acesso && (
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                      {lastAccessLabel(c.ultimo_acesso)}
                    </p>
                  )}

                  {/* Active toggle — only for non-dono, non-self */}
                  {!isDono && !isMe && (
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleAtivo(c) }}
                      className="shrink-0 relative transition-colors"
                      style={{ width: '36px', height: '20px', borderRadius: '9999px', border: 'none', background: c.ativo ? 'rgba(0,212,212,0.6)' : 'rgba(255,255,255,0.1)' }}
                    >
                      <span className="absolute top-[3px] w-[14px] h-[14px] bg-white rounded-full transition-all"
                        style={{ left: c.ativo ? '19px' : '3px' }} />
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
