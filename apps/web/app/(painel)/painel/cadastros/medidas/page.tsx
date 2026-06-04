import { TopBar } from '@/components/layout/TopBar'
import { CatalogoCRUD } from '@/components/painel/CatalogoCRUD'

export default function MedidasPage() {
  return (
    <>
      <TopBar title="Medidas" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <p className="text-steel text-sm mb-4">
          Tipos de medida disponíveis para adicionar às variações dos produtos.
        </p>
        <div className="max-w-lg">
          <CatalogoCRUD tipo="medidas" titulo="Medida" />
        </div>
      </main>
    </>
  )
}
