import { Sidebar } from '@/components/layout/Sidebar'

const nav = [
  { label: 'Dashboard',  href: '/admin/dashboard' },
  { label: 'Lojas',      href: '/admin/lojas' },
  { label: 'Planos',     href: '/admin/planos' },
  { label: 'Usuários',   href: '/admin/usuarios' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-midnight">
      <Sidebar items={nav} subtitle="Plataforma" />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
