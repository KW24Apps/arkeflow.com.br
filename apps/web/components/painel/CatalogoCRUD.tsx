'use client'

import { useEffect, useState } from 'react'
import { catalogosApi, type ItemCatalogo, type TipoCatalogo } from '@/lib/api/catalogos'

interface Props {
  tipo: TipoCatalogo
  titulo: string
  comCor?: boolean   // apenas para Cores — exibe seletor hex
}

export function CatalogoCRUD({ tipo, titulo, comCor }: Props) {
  const [items,    setItems]    = useState<ItemCatalogo[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [novoHex,  setNovoHex]  = useState('#000000')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    try { setItems(await catalogosApi.list(tipo)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tipo])

  async function handleAdd() {
    if (!novoNome.trim()) return
    setSaving(true)
    try {
      await catalogosApi.create(tipo, { nome: novoNome.trim(), hex_cor: comCor ? novoHex : undefined })
      setNovoNome('')
      await load()
    } finally { setSaving(false) }
  }

  async function handleRemove(id: string) {
    await catalogosApi.remove(tipo, id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Adicionar novo */}
      <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex gap-3 items-center">
        {comCor && (
          <input
            type="color"
            value={novoHex}
            onChange={e => setNovoHex(e.target.value)}
            className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
          />
        )}
        <input
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Novo ${titulo.toLowerCase()}...`}
          className="flex-1 min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !novoNome.trim()}
          className="min-h-[44px] px-5 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-deep-ocean border border-ocean-depth rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {comCor && item.hex_cor && (
                  <span
                    className="w-6 h-6 rounded-full border border-ocean-depth shrink-0"
                    style={{ background: item.hex_cor }}
                  />
                )}
                <span className="text-sea-foam text-sm">{item.nome}</span>
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                className="text-steel hover:text-red-400 text-lg px-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-steel text-sm py-6">Nenhum item cadastrado</p>
          )}
        </div>
      )}
    </div>
  )
}
