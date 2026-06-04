import { PainelSidebar }      from '@/components/layout/PainelSidebar'
import { PainelSecondaryNav } from '@/components/layout/PainelNav'

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-midnight">
      <PainelSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PainelSecondaryNav />
        {children}
      </div>
    </div>
  )
}
