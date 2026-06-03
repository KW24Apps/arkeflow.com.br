import { TopBar } from '@/components/layout/TopBar'
import { KPICard } from '@/components/layout/KPICard'

export default function PainelDashboard() {
  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <KPICard label="Vendas hoje"     value="—"  accent="cyan" />
          <KPICard label="Faturamento"     value="—"  accent="green" />
          <KPICard label="Estoque baixo"   value="—"  accent="yellow" />
          <KPICard label="Parcelas venc."  value="—"  accent="red" />
        </div>

        <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-6">
          <p className="text-steel text-sm">Módulos em construção.</p>
        </div>

      </main>
    </>
  )
}
