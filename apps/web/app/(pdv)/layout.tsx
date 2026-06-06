import { BottomNav } from '@/components/pdv/BottomNav'

export default function PDVLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Header fixo */}
      <header className="h-14 bg-deep-ocean border-b border-ocean-depth px-4 flex items-center justify-between shrink-0 safe-area-top">
        <span className="text-lg font-black tracking-tight">
          <span className="text-sea-foam">ARKE</span>
          <span className="text-electric-cyan font-normal">flow</span>
        </span>
      </header>

      {/* Conteúdo — espaço para o header e a barra inferior */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
