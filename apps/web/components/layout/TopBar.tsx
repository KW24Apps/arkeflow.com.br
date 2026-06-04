'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const usuario = useAuthStore(s => s.usuario)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
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

  const nomeExibido = usuario?.email?.split('@')[0] ?? 'Usuário'

  return (
    <header className="h-14 bg-deep-ocean border-b border-ocean-depth px-4 md:px-6 pl-20 lg:pl-6 flex items-center justify-between shrink-0">
      <h2 className="text-sea-foam font-semibold text-base truncate">{title}</h2>

      {/* Menu do usuário */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 min-h-[40px] px-3 rounded-xl hover:bg-ocean-depth transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
            <span className="text-sea-foam text-xs font-semibold uppercase">{nomeExibido.charAt(0)}</span>
          </div>
          <span className="text-sea-foam text-sm hidden sm:block">{nomeExibido}</span>
          <span className="text-steel text-xs">▾</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-deep-ocean border border-ocean-depth rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-ocean-depth">
              <p className="text-sea-foam text-sm font-medium">{usuario?.email}</p>
              <p className="text-steel text-xs capitalize">{usuario?.nivel?.replace('_', ' ')}</p>
            </div>

            <a href="/painel/configuracoes/geral"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 min-h-[44px] px-4 text-sm text-steel hover:text-sea-foam hover:bg-ocean-depth transition-colors">
              <span>⚙️</span> Configurações
            </a>

            {/* Downloads do app */}
            <div className="px-4 py-2 border-b border-ocean-depth">
              <p className="text-steel text-[10px] uppercase tracking-wider mb-2">Baixar aplicativo</p>
              <div className="flex flex-col gap-1">
                <button disabled className="flex items-center gap-2 min-h-[36px] text-sm text-steel/50 cursor-not-allowed">
                  <span>🪟</span> Windows (em breve)
                </button>
                <button disabled className="flex items-center gap-2 min-h-[36px] text-sm text-steel/50 cursor-not-allowed">
                  <span>🍎</span> macOS / iOS (em breve)
                </button>
                <button disabled className="flex items-center gap-2 min-h-[36px] text-sm text-steel/50 cursor-not-allowed">
                  <span>🤖</span> Android (em breve)
                </button>
              </div>
            </div>

            <button
              onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-2 min-h-[44px] px-4 text-sm text-red-400 hover:bg-ocean-depth transition-colors"
            >
              <span>🚪</span> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
