'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'

export interface NavItem {
  label: string
  href?: string
  type?: 'divider'
}

interface SidebarProps {
  items: NavItem[]
  subtitle?: string
}

export function Sidebar({ items, subtitle }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const [open, setOpen] = useState(false)

  function logout() {
    clearAuth()
    document.cookie = 'arkeflow_token=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <>
      {/* Botão hamburguer — visível apenas em telas menores */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-deep-ocean border border-ocean-depth rounded-xl flex items-center justify-center"
        aria-label="Menu"
      >
        <span className="flex flex-col gap-1.5">
          <span className="w-5 h-0.5 bg-sea-foam rounded" />
          <span className="w-5 h-0.5 bg-sea-foam rounded" />
          <span className="w-3 h-0.5 bg-sea-foam rounded" />
        </span>
      </button>

      {/* Overlay ao abrir no mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-midnight/80 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 min-h-screen bg-deep-ocean border-r border-ocean-depth
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        <div className="px-6 py-5 border-b border-ocean-depth">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-sea-foam">ARKE</span>
            <span className="text-electric-cyan font-normal">flow</span>
          </span>
          {subtitle && (
            <p className="text-steel text-[10px] uppercase tracking-[0.2em] mt-1">{subtitle}</p>
          )}
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return (
                <div key={`div-${i}`} className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-steel/60">{item.label}</p>
                </div>
              )
            }
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setOpen(false)}
                className={`
                  min-h-[48px] px-4 flex items-center rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-electric-cyan text-midnight'
                    : 'text-steel hover:text-sea-foam hover:bg-ocean-depth active:bg-ocean-depth'
                  }
                `}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-ocean-depth flex flex-col gap-1">
          <Link
            href="/painel/configuracoes/geral"
            onClick={() => setOpen(false)}
            className="w-full min-h-[44px] px-4 flex items-center gap-3 rounded-xl text-sm font-medium text-steel hover:text-sea-foam hover:bg-ocean-depth transition-all"
          >
            <span className="text-base">⚙️</span>
            Configurações
          </Link>
          <button
            onClick={logout}
            className="w-full min-h-[44px] px-4 flex items-center gap-3 rounded-xl text-sm font-medium text-steel hover:text-red-400 hover:bg-ocean-depth transition-all"
          >
            <span className="text-base">🚪</span>
            Sair
          </button>
        </div>

      </aside>
    </>
  )
}
