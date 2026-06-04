'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { estoqueApi, type ItemEstoque } from '@/lib/api/estoque'

export default function EstoqueAlertasPage() {
  const [items,   setItems]   = useState<ItemEstoque[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    estoqueApi.list(true).then(setItems).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <TopBar title="Alertas de Estoque" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">✅</span>
            <p className="text-sea-foam font-medium">Tudo em ordem</p>
            <p className="text-steel text-sm">Nenhum produto abaixo do estoque mínimo</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map(item => {
              const label = Object.entries(item.atributos_json).map(([, v]) => v).join(' / ') || 'Versão única'
              return (
                <div key={item.versao_id} className="bg-deep-ocean border border-yellow-500/40 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sea-foam text-sm font-medium">{item.produto_nome}</p>
                    <p className="text-steel text-xs">{label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold text-lg">{item.estoque_atual}</p>
                    <p className="text-steel text-xs">mín: {item.estoque_minimo}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
