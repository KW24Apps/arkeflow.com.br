import { TopBar } from '@/components/layout/TopBar'

export default function VendasRealizadasPage() {
  return (
    <>
      <TopBar title="Vendas Realizadas" />
      <main className="flex-1 p-4 md:p-6">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <span className="text-5xl">📋</span>
          <p className="text-sea-foam font-semibold text-lg">Histórico de Vendas</p>
          <p className="text-steel text-sm text-center max-w-xs">
            Em construção. Aqui você verá todas as vendas realizadas com filtros por data, cliente e vendedor.
          </p>
        </div>
      </main>
    </>
  )
}
