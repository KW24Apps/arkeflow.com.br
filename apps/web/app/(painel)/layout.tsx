import { PainelSidebar } from '@/components/layout/PainelSidebar'
import { Heartbeat }     from '@/components/layout/Heartbeat'
import { LojaLoader }    from '@/components/layout/LojaLoader'

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Heartbeat />
      <LojaLoader />
      <PainelSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {children}
      </div>
    </div>
  )
}
