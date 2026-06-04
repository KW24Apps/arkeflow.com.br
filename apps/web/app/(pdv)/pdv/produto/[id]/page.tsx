'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { produtosApi, type Produto } from '@/lib/api/produtos'
import { usePDVStore } from '@/store/pdv.store'

export default function PDVProdutoVariacoes() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const addItem = usePDVStore(s => s.addItem)
  const [produto, setProduto] = useState<Produto | null>(null)

  useEffect(() => { produtosApi.get(id).then(setProduto) }, [id])

  if (!produto) return (
    <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
  )

  const ATRIBS_VAR = ['Tamanho', 'Cor']

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-deep-ocean border-b border-ocean-depth flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sea-foam text-xl px-1">←</button>
        <h2 className="text-sea-foam font-semibold text-sm truncate">{produto.nome}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        <p className="text-steel text-xs mb-1">Selecione a variação:</p>
        {produto.versoes?.map(v => {
          const label = Object.entries(v.atributos_json)
            .filter(([k]) => ATRIBS_VAR.includes(k))
            .map(([, val]) => val).join(' / ') || 'Versão única'
          const preco = v.preco_especifico
            ? parseFloat(String(v.preco_especifico))
            : parseFloat(String(produto.preco_base))
          const semEstoque = produto.controle_estoque && v.estoque_atual <= 0

          return (
            <button key={v.id}
              disabled={semEstoque}
              onClick={() => {
                addItem({ versao_id: v.id, produto_id: produto.id, nome: produto.nome, atributos: v.atributos_json, preco_unitario: preco, codigo_barras: v.codigo_barras })
                router.back()
              }}
              className={`flex items-center justify-between bg-deep-ocean border rounded-2xl p-4 transition-colors text-left ${
                semEstoque ? 'border-ocean-depth opacity-40' : 'border-ocean-depth active:bg-ocean-depth'
              }`}>
              <div>
                <p className="text-sea-foam font-medium text-sm">{label}</p>
                {semEstoque && <p className="text-red-400 text-xs">Sem estoque</p>}
              </div>
              <p className="text-electric-cyan font-semibold text-sm">R$ {preco.toFixed(2)}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
