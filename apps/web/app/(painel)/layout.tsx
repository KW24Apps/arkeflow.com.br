import { Sidebar } from '@/components/layout/Sidebar'
import { PainelSecondaryNav, SECTIONS } from '@/components/layout/PainelNav'

// Sidebar usa apenas as seções principais
const sidebarItems = SECTIONS.map(s => ({ label: s.label, href: s.href }))

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-midnight">
      <Sidebar items={sidebarItems} subtitle="Gestão" />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra de sub-navegação horizontal — muda conforme a seção ativa */}
        <PainelSecondaryNav />

        {children}
      </div>
    </div>
  )
}
