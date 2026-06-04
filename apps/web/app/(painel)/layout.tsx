import { Sidebar } from '@/components/layout/Sidebar'
import { PainelSecondaryNav } from '@/components/layout/PainelNav'
import { SECTIONS } from '@/components/layout/painel-nav-data'

// Sidebar recebe apenas os itens — dividers passam como está, links passam com href
const sidebarItems = SECTIONS.map(s =>
  'type' in s ? { type: s.type, label: s.label } : { label: s.label, href: s.href }
)

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-midnight">
      <Sidebar items={sidebarItems as any} subtitle="Gestão" />
      <div className="flex-1 flex flex-col min-w-0">
        <PainelSecondaryNav />
        {children}
      </div>
    </div>
  )
}
