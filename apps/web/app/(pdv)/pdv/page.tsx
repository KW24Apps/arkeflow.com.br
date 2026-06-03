export default function PDVHome() {
  return (
    <div className="p-4">

      {/* Área da sacola — futuramente lista os itens */}
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="text-6xl">🛒</span>
        <p className="text-sea-foam font-semibold text-lg">Sacola vazia</p>
        <p className="text-steel text-sm text-center">
          Use a busca para adicionar produtos
        </p>
      </div>

      {/* Botão de fechar venda — desativado enquanto sacola vazia */}
      <div className="fixed bottom-20 left-4 right-4">
        <button
          disabled
          className="w-full min-h-[56px] bg-electric-cyan/20 text-electric-cyan/40 rounded-2xl font-semibold text-base cursor-not-allowed"
        >
          Fechar Venda
        </button>
      </div>

    </div>
  )
}
