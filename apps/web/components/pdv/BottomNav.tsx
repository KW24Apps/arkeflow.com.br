'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api/client'

const tabs = [
  { label: 'Sacola',    href: '/pdv',           icon: '🛒' },
  { label: 'Clientes',  href: '/pdv/cliente',   icon: '👥' },
  { label: 'Histórico', href: '/pdv/historico', icon: '📋' },
]

export function BottomNav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const clearAuth = useAuthStore(s => s.clearAuth)

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    document.cookie = 'arkeflow_token=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-deep-ocean border-t border-ocean-depth safe-area-pb">
      <div className="flex">
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-colors ${
                active ? 'text-electric-cyan' : 'text-steel'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">{tab.label}</span>
            </Link>
          )
        })}

        {/* Sair */}
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[64px] text-steel"
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-medium uppercase tracking-wide">Sair</span>
        </button>
      </div>
    </nav>
  )
}
