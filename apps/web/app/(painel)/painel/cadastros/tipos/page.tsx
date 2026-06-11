import { TopBar } from '@/components/layout/TopBar'
import { CatalogoCRUD } from '@/components/painel/CatalogoCRUD'

export default function TiposPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <p className="text-steel text-sm mb-4">Categorize seus produtos por tipo (Camiseta, Calça, etc.).</p>
        <CatalogoCRUD tipo="tipos_produto" titulo="Tipo" />
      </main>
    </>
  )
}
