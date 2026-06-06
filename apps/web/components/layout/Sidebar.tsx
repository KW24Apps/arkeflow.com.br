'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useLojaStore } from '@/store/loja.store'
import { api } from '@/lib/api/client'
import * as LucideIcons from 'lucide-react'

// Href-based icon map — covers all known painel nav sections
const HREF_ICONS: Record<string, string> = {
  '/painel/dashboard':                      'LayoutDashboard',
  '/painel/caixa':                          'ShoppingCart',
  '/painel/promocoes':                      'Tag',
  '/painel/estoque':                        'Package',
  '/painel/financeiro':                     'Wallet',
  '/painel/relatorios':                     'BarChart2',
  '/painel/produtos':                       'Box',
  '/painel/clientes':                       'Users',
  '/painel/colaboradores':                  'UserCog',
  '/painel/fornecedores':                   'Truck',
  '/painel/configuracoes/formas-pagamento': 'CreditCard',
  '/painel/configuracoes/dados':            'Settings',
  '/painel/prova-em-casa':                 'Home',
  '/painel/suporte':                        'LifeBuoy',
  '/painel/tutoriais':                      'GraduationCap',
  '/painel/novidades':                      'Bell',
}

function NavIcon({ name, size = 15 }: { name?: string; size?: number }) {
  if (!name) return null
  const Icon = (LucideIcons as any)[name]
  if (!Icon) return null
  return <Icon size={size} strokeWidth={1.5} />
}

export interface NavItem {
  label: string
  href?: string
  type?: 'divider'
}

interface SidebarProps {
  items: NavItem[]
  subtitle?: string
}

export function Sidebar({ items }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const [open, setOpen] = useState(false)
  const logoUrl = useLojaStore(s => s.logo_url)

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    document.cookie = 'arkeflow_token=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-midnight/60 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center"
        aria-label="Menu"
      >
        <span className="flex flex-col gap-1.5">
          <span className="w-4 h-px bg-white/50 rounded" />
          <span className="w-4 h-px bg-white/50 rounded" />
          <span className="w-2.5 h-px bg-white/50 rounded" />
        </span>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-midnight/80 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-44 h-screen
          bg-midnight/60 backdrop-blur-sm
          flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ borderRight: '0.5px solid rgba(255,255,255,0.07)' }}
      >

        {/* Client logo slot */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div
            className="flex items-center justify-center rounded-lg overflow-hidden"
            style={{
              height: '56px',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px dashed rgba(255,255,255,0.15)',
              borderRadius: '8px',
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl + '?t=' + Math.floor(Date.now() / 60000)}
                alt="Logo"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain', objectPosition: 'center',
                  mixBlendMode: 'screen', padding: '4px',
                }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                logo do cliente
              </span>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return (
                <div key={`div-${i}`} className="pt-4 pb-1.5 px-1 flex items-center gap-2">
                  <span
                    className="uppercase tracking-widest font-semibold shrink-0"
                    style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}
                  >
                    {item.label}
                  </span>
                  <div
                    className="flex-1"
                    style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)' }}
                  />
                </div>
              )
            }

            const active = !!(item.href && (pathname === item.href || pathname.startsWith(item.href + '/')))
            const iconName = (item as any).icon ?? (item.href ? HREF_ICONS[item.href] : undefined)

            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={() => setOpen(false)}
                className={`
                  min-h-[40px] px-3 flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all
                  ${active
                    ? 'bg-cyan-500/10 text-electric-cyan'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }
                `}
              >
                <span className={`shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`}>
                  <NavIcon name={iconName} />
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-4 pb-4 pt-3 shrink-0 flex flex-col items-center gap-0.5"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
        >
          <span style={{ fontSize: '12px' }} className="font-black tracking-tight leading-none">
            <span className="text-sea-foam font-bold">ARKE</span>
            <span className="text-electric-cyan font-light">flow</span>
          </span>
          <span
            className="uppercase tracking-widest mt-0.5"
            style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}
          >
            Gestão
          </span>
        </div>

      </aside>
    </>
  )
}
