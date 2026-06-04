import { TopBar } from '@/components/layout/TopBar'

export default function CaixaPage() {
  return (
    <>
      <TopBar title="Caixa" />
      <main className="flex-1 p-4 md:p-6">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <span className="text-5xl">🛒</span>
          <p className="text-sea-foam font-semibold text-lg">Caixa</p>
          <p className="text-steel text-sm text-center max-w-xs">
            Módulo em construção. Em breve você poderá registrar vendas, receber pagamentos e emitir notas fiscais aqui.
          </p>
        </div>
      </main>
    </>
  )
}
