import { TopBar } from '@/components/layout/TopBar'
import { CatalogoCRUD } from '@/components/painel/CatalogoCRUD'

export default function TamanhosPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <p className="text-steel text-sm mb-4">Gerencie os tamanhos disponíveis na sua loja.</p>
        <CatalogoCRUD tipo="tamanhos" titulo="Tamanho" />
      </main>
    </>
  )
}
