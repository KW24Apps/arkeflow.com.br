'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { vendasApi } from '@/lib/api/vendas'

export default function VendaConcluidaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [venda, setVenda] = useState<any>(null)

  useEffect(() => {
    vendasApi.get(id).then(setVenda)
  }, [id])

  if (!venda) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-mint-green/20 flex items-center justify-center">
        <span className="text-4xl">✓</span>
      </div>
      <div>
        <h2 className="text-sea-foam font-bold text-2xl">Venda concluída!</h2>
        <p className="text-mint-green text-lg font-semibold mt-1">R$ {Number(venda.total).toFixed(2)}</p>
        {venda.cliente_nome && <p className="text-steel text-sm mt-1">Cliente: {venda.cliente_nome}</p>}
        {(venda.pagamentos ?? []).filter((p: any) => p.tipo === 'dinheiro' && Number(p.troco) > 0).map((p: any, i: number) => (
          <p key={i} className="text-mint-green text-sm mt-1">
            Troco: R$ {Number(p.troco).toFixed(2)}
          </p>
        ))}
        {Number(venda.cashback_gerado) > 0 && (
          <p className="text-mint-green text-sm mt-1">
            +R$ {Number(venda.cashback_gerado).toFixed(2)} de cashback gerado
          </p>
        )}
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button onClick={() => router.push('/pdv')}
          className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-bold">
          Nova Venda
        </button>
        <button onClick={() => router.push('/pdv/historico')}
          className="min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm">
          Ver Histórico
        </button>
      </div>
    </div>
  )
}
