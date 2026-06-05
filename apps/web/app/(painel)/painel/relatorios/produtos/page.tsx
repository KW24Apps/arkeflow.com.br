import { TopBar } from '@/components/layout/TopBar'

export default function RelatoriosProdutosPage() {
  return (
    <>
      <TopBar title="Relatórios — Produtos" />
      <main className="flex-1 p-4 md:p-6">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <span className="text-5xl opacity-30">📦</span>
          <p className="text-sea-foam font-semibold">Relatórios de Produtos</p>
          <p className="text-steel text-sm text-center max-w-xs">Em construção.</p>
        </div>
      </main>
    </>
  )
}
