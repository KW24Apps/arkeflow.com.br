import { TopBar } from '@/components/layout/TopBar'
import { CatalogoCRUD } from '@/components/painel/CatalogoCRUD'

export default function CoresPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <p className="text-steel text-sm mb-4">Gerencie as cores disponíveis na sua loja.</p>
        <div className="max-w-lg">
          <CatalogoCRUD tipo="cores" titulo="Cor" comCor />
        </div>
      </main>
    </>
  )
}
