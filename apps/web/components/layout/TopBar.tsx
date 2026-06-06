'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Monitor, Smartphone, Tablet, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import { PainelSecondaryNav } from './PainelNav'

export function TopBar() {
  const usuario = useAuthStore(s => s.usuario)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    document.cookie = 'arkeflow_token=; path=/; max-age=0'
    router.push('/login')
  }

  const nomeExibido = (usuario as any)?.nome
    || (usuario as any)?.username
    || usuario?.email?.split('@')[0]
    || 'Usuário'

  return (
    <header
      className="h-12 bg-midnight/50 backdrop-blur-sm flex items-center shrink-0 relative"
      style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', zIndex: 100 }}
    >
      {/* Sub-navigation tabs */}
      <div className="flex-1 overflow-x-auto scrollbar-none min-w-0">
        <PainelSecondaryNav inline />
      </div>

      {/* User menu */}
      <div className="relative shrink-0 pr-3 md:pr-4" ref={menuRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 min-h-[36px] px-2.5 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border"
            style={{ background: 'rgba(0,212,212,0.15)', borderColor: 'rgba(0,212,212,0.3)' }}
          >
            <span className="text-electric-cyan text-xs font-semibold uppercase">
              {nomeExibido.charAt(0)}
            </span>
          </div>
          <span className="text-white/60 text-sm hidden sm:block">{nomeExibido}</span>
          <span className="text-white/30 text-xs">▾</span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-50"
            style={{ background: 'rgb(8,18,30)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: '220px', overflow: 'hidden' }}
          >
            {/* User info */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, margin: 0 }}>{usuario?.email}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', textTransform: 'capitalize' }}>{usuario?.nivel?.replace('_', ' ')}</p>
            </div>

            {/* Meus Dados */}
            <a
              href="/painel/perfil"
              onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transition: 'background 0.12s, color 0.12s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
            >
              <User size={15} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              Meus Dados
            </a>

            {/* Baixar Aplicativo */}
            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '10px 16px 4px', margin: 0 }}>Baixar Aplicativo</p>
              {([
                { icon: <Monitor  size={15} />, label: 'Windows (em breve)' },
                { icon: <Tablet   size={15} />, label: 'macOS / iOS (em breve)' },
                { icon: <Smartphone size={15} />, label: 'Android (em breve)' },
              ] as const).map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', opacity: 0.4, cursor: 'not-allowed' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{icon}</span>
                  {label}
                </div>
              ))}
            </div>

            {/* Sair */}
            <button
              onClick={() => { setOpen(false); logout() }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '13px', color: 'rgba(240,100,100,0.8)', background: 'none', border: 'none', cursor: 'pointer', borderTop: '0.5px solid rgba(255,255,255,0.07)', transition: 'background 0.12s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(240,100,100,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <LogOut size={15} style={{ color: 'rgba(240,100,100,0.6)', flexShrink: 0 }} />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
