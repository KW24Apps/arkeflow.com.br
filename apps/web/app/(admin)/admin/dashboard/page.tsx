import { TopBar } from '@/components/layout/TopBar'
import { KPICard } from '@/components/layout/KPICard'

export default function AdminDashboard() {
  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-6 overflow-y-auto">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Lojas ativas"    value="—"  accent="cyan" />
          <KPICard label="Receita mensal"  value="—"  accent="green" />
          <KPICard label="Novos clientes"  value="—"  accent="yellow" />
          <KPICard label="Inadimplentes"   value="—"  accent="red" />
        </div>

        <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-6">
          <p className="text-steel text-sm">
            Módulos em construção — volte em breve.
          </p>
        </div>

      </main>
    </>
  )
}
