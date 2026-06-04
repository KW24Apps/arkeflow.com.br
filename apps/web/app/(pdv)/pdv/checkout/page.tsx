'use client'

import { useRouter } from 'next/navigation'
import { usePDVStore } from '@/store/pdv.store'

export default function PDVCheckout() {
  const router = useRouter()
  const { itens, cliente_nome, limpar } = usePDVStore()
  const total = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sea-foam text-xl">←</button>
        <h2 className="text-sea-foam font-semibold">Fechar Venda</h2>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
          <p className="text-steel text-xs uppercase tracking-wider mb-3">Resumo</p>
          {itens.map(i => (
            <div key={i.versao_id} className="flex justify-between py-1">
              <p className="text-sea-foam text-sm">{i.nome} × {i.quantidade}</p>
              <p className="text-sea-foam text-sm">R$ {(i.preco_unitario * i.quantidade).toFixed(2)}</p>
            </div>
          ))}
          <div className="border-t border-ocean-depth mt-3 pt-3 flex justify-between">
            <p className="text-sea-foam font-bold">Total</p>
            <p className="text-electric-cyan font-bold text-lg">R$ {total.toFixed(2)}</p>
          </div>
          {cliente_nome && <p className="text-steel text-xs mt-2">Cliente: {cliente_nome}</p>}
        </div>

        <div className="bg-deep-ocean border border-yellow-500/30 rounded-2xl p-5 text-center">
          <span className="text-3xl">🚧</span>
          <p className="text-sea-foam font-semibold mt-2">Em construção</p>
          <p className="text-steel text-sm mt-1">O fechamento com formas de pagamento, crediário e emissão de nota será implementado em breve.</p>
        </div>
      </div>

      <button onClick={() => { limpar(); router.push('/pdv') }}
        className="mt-4 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm">
        ← Voltar para sacola
      </button>
    </div>
  )
}
