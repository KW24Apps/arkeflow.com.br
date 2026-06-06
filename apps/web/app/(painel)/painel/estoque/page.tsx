'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { estoqueApi, type ItemEstoque } from '@/lib/api/estoque'

export default function EstoquePage() {
  const [items,    setItems]    = useState<ItemEstoque[]>([])
  const [loading,  setLoading]  = useState(true)
  const [q,        setQ]        = useState('')

  useEffect(() => {
    estoqueApi.list().then(setItems).finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(i =>
    !q || i.produto_nome.toLowerCase().includes(q.toLowerCase())
  )

  const alertas = items.filter(i => i.alerta).length

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">

        {alertas > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <p className="text-yellow-400 text-sm font-medium">
              {alertas} variação(ões) abaixo do estoque mínimo
            </p>
          </div>
        )}

        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por produto..."
          className="w-full min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan mb-4" />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(item => {
              return (
                <div key={item.versao_id}
                  className={`bg-deep-ocean border rounded-2xl p-4 flex items-center justify-between ${
                    item.alerta ? 'border-yellow-500/40' : 'border-ocean-depth'
                  }`}>
                  <div className="min-w-0">
                    <p className="text-sea-foam text-sm font-medium truncate">{item.produto_nome}</p>
                    <p className="text-steel text-xs">
                      {Object.keys(item.atributos_json).length === 0 ? 'Versão única' : Object.entries(item.atributos_json).map(([key, val]) => (
                        <span key={key} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 7px', color: 'rgba(255,255,255,0.45)', marginRight: '4px', display: 'inline-block' }}>
                          {key}: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{val}</span>
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`font-bold text-lg ${item.alerta ? 'text-yellow-400' : 'text-sea-foam'}`}>
                      {item.estoque_atual}
                    </p>
                    <p className="text-steel text-xs">mín: {item.estoque_minimo}</p>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-center text-steel text-sm py-8">Nenhum produto com controle de estoque</p>
            )}
          </div>
        )}
      </main>
    </>
  )
}
