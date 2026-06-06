import { TopBar } from '@/components/layout/TopBar'
import { CatalogoCRUD } from '@/components/painel/CatalogoCRUD'

export default function ComposicoesPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <p className="text-steel text-sm mb-4">Materiais e composições de tecido usados nos produtos.</p>
        <div className="max-w-lg">
          <CatalogoCRUD tipo="composicoes" titulo="Composição" />
        </div>
      </main>
    </>
  )
}
